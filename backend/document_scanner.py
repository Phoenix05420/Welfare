"""
Document Scanner — WelfareIntel
Accepts an uploaded document image (or PDF), sends it to the local Ollama
vision model for OCR / field extraction, optionally detects a face photo
using OpenCV, and returns structured JSON.
"""

import base64
import io
import json
import re

import cv2
import httpx
import numpy as np
from fastapi import APIRouter, File, UploadFile
from PIL import Image

from logger import logger

router = APIRouter()

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

OLLAMA_BASE = "http://localhost:11434"
OLLAMA_MODEL = "hf.co/empero-ai/Qwable-9B-Claude-Fable-5-GGUF:Q4_K_M"

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | {"pdf"}

DOCUMENT_TYPE_LABELS = {
    "aadhaar": "Aadhaar Card",
    "pan": "PAN Card",
    "community_certificate": "Community Certificate",
    "income_certificate": "Income Certificate",
    "driving_license": "Driving License",
    "voter_id": "Voter ID Card",
    "marksheet": "Marksheet / Grade Card",
    "bank_passbook": "Bank Passbook",
    "other": "Document",
}

SCAN_PROMPT = """You are a document scanner AI. Analyze this document image carefully.

1. First, identify the document type. Common Indian documents:
   - aadhaar (Aadhaar Card - has 12-digit number, UIDAI logo)
   - pan (PAN Card - has 10-character alphanumeric PAN)
   - community_certificate (Community/Caste Certificate)
   - income_certificate (Income Certificate)
   - driving_license (Driving License)
   - voter_id (Voter ID / EPIC card)
   - marksheet (Marksheet / Grade Card)
   - bank_passbook (Bank Passbook front page)
   - other (any other document)

2. Extract ALL visible text fields as key-value pairs.
   For Aadhaar specifically: name, father_name, dob (date of birth), gender, address, aadhaar_number
   For PAN: name, father_name, dob, pan_number
   For other documents: extract whatever fields you can identify.

3. Return ONLY a valid JSON object (no markdown, no explanation):
{
  "document_type": "aadhaar",
  "fields": [
    {"key": "name", "label": "Full Name", "value": "extracted value"},
    {"key": "father_name", "label": "Father's Name", "value": "extracted value"}
  ]
}"""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _file_extension(filename: str) -> str:
    """Return lower-cased file extension without the dot."""
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def _image_to_base64(img: Image.Image, fmt: str = "JPEG") -> str:
    """Convert a PIL Image to a raw base64 string (no data-url prefix)."""
    buf = io.BytesIO()
    if img.mode == "RGBA":
        img = img.convert("RGB")
    img.save(buf, format=fmt)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def _pdf_first_page_to_image(pdf_bytes: bytes) -> Image.Image:
    """Convert the first page of a PDF to a PIL Image using PyMuPDF (fitz)."""
    try:
        import fitz  # PyMuPDF

        # Open the PDF from bytes
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if not doc:
            raise ValueError("Empty or invalid PDF document")

        # Get the first page
        page = doc[0]
        
        # Render the page to a pixmap (image)
        # Using a zoom factor for better resolution (matrix scales by 2x)
        matrix = fitz.Matrix(2, 2)
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        
        # Convert pixmap to PIL Image
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        return img
    except ImportError:
        logger.error("[scanner] PyMuPDF (fitz) not installed. Please install PyMuPDF.")
        raise ValueError("Could not convert PDF. Ensure PyMuPDF is installed.")
    except Exception as exc:
        logger.error(f"[scanner] PDF conversion failed: {exc}")
        raise ValueError(f"Could not convert PDF to image: {exc}")


def _detect_face(image_bytes: bytes) -> str | None:
    """Use OpenCV Haar cascade to detect a face, crop it, and return a
    base64 data-URL string.  Returns ``None`` when no face is found."""
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return None

        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        face_cascade = cv2.CascadeClassifier(cascade_path)

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

        if len(faces) == 0:
            return None

        # Pick the largest detected face
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        face_crop = img[y : y + h, x : x + w]

        _, buf = cv2.imencode(".jpg", face_crop)
        face_b64 = base64.b64encode(buf.tobytes()).decode("utf-8")
        return f"data:image/jpeg;base64,{face_b64}"
    except Exception as exc:
        logger.error(f"[scanner] Face detection failed: {exc}")
        return None


def _validate_fields(document_type: str, fields: list[dict]) -> list[dict]:
    """Run basic format validations on extracted fields and set confidence."""
    validated: list[dict] = []
    for field in fields:
        f = {**field}
        # Default confidence
        f.setdefault("confidence", "high")

        if document_type == "aadhaar" and f.get("key") == "aadhaar_number":
            digits = re.sub(r"\s", "", str(f.get("value", "")))
            if not (digits.isdigit() and len(digits) == 12):
                f["confidence"] = "low"

        if document_type == "pan" and f.get("key") == "pan_number":
            pan = str(f.get("value", "")).strip().upper()
            if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]$", pan):
                f["confidence"] = "low"

        validated.append(f)
    return validated


def _parse_ai_response(raw_text: str) -> dict:
    """Best-effort parse of JSON from the AI response text."""
    # Strip markdown code fences if present
    text = raw_text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text, count=1)
        text = re.sub(r"```\s*$", "", text, count=1)
        text = text.strip()

    # Try to find the first JSON object
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        return json.loads(match.group())

    return json.loads(text)


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


@router.post("/api/scan-document")
async def scan_document(file: UploadFile = File(...)):
    """Accept an image or PDF upload, run Ollama vision OCR, detect face,
    and return structured document data."""
    try:
        # --- 1. Validate extension -------------------------------------------
        ext = _file_extension(file.filename or "")
        if ext not in ALLOWED_EXTENSIONS:
            return {
                "success": False,
                "error": f"Unsupported file type '.{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            }

        file_bytes = await file.read()
        if not file_bytes:
            return {"success": False, "error": "Uploaded file is empty."}

        logger.info(f"[scanner] Received file: {file.filename} ({len(file_bytes)} bytes)")

        # --- 2. Convert to PIL Image -----------------------------------------
        if ext == "pdf":
            pil_image = _pdf_first_page_to_image(file_bytes)
            # Re-encode to JPEG bytes for face detection
            buf = io.BytesIO()
            pil_image.save(buf, format="JPEG")
            image_bytes_for_cv = buf.getvalue()
        else:
            pil_image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
            image_bytes_for_cv = file_bytes

        # --- 3. Base64 for Ollama (no data-url prefix) -----------------------
        image_b64 = _image_to_base64(pil_image)

        # --- 4. Face detection -----------------------------------------------
        face_data_url = _detect_face(image_bytes_for_cv)

        # --- 5. Call Ollama vision API ----------------------------------------
        payload = {
            "model": OLLAMA_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": SCAN_PROMPT,
                    "images": [image_b64],
                }
            ],
            "stream": False,
            "options": {"temperature": 0.1, "num_predict": 4096},
        }

        async with httpx.AsyncClient(timeout=900.0) as client:
            logger.info(f"[scanner] Sending image to Ollama ({OLLAMA_MODEL})…")
            resp = await client.post(f"{OLLAMA_BASE}/api/chat", json=payload)
            resp.raise_for_status()
            ollama_json = resp.json()

        # Extract the assistant message content
        ai_text = (
            ollama_json.get("message", {}).get("content", "")
            or ollama_json.get("response", "")
        )
        logger.info(f"[scanner] Ollama raw response length: {len(ai_text)} chars")

        # --- 6. Parse AI response ---------------------------------------------
        try:
            parsed = _parse_ai_response(ai_text)
        except (json.JSONDecodeError, Exception) as parse_err:
            logger.error(f"[scanner] Failed to parse AI JSON: {parse_err}\nRaw: {ai_text[:500]}")
            return {
                "success": False,
                "error": "AI returned invalid JSON. Please try again with a clearer image.",
            }

        document_type = parsed.get("document_type", "other")
        fields = parsed.get("fields", [])

        # --- 7. Validate fields -----------------------------------------------
        fields = _validate_fields(document_type, fields)

        document_type_label = DOCUMENT_TYPE_LABELS.get(document_type, DOCUMENT_TYPE_LABELS["other"])

        logger.info(
            f"[scanner] Detected: {document_type_label} with {len(fields)} fields, "
            f"face={'yes' if face_data_url else 'no'}"
        )

        return {
            "success": True,
            "document_type": document_type,
            "document_type_label": document_type_label,
            "fields": fields,
            "photo": face_data_url,
            "preview_url": None,
        }

    except httpx.HTTPStatusError as http_err:
        logger.error(f"[scanner] Ollama HTTP error: {http_err}")
        return {"success": False, "error": f"Ollama API error: {http_err.response.status_code}"}
    except httpx.ConnectError:
        logger.error("[scanner] Cannot connect to Ollama at " + OLLAMA_BASE)
        return {"success": False, "error": "Cannot connect to Ollama. Is it running on localhost:11434?"}
    except httpx.TimeoutException:
        logger.error("[scanner] Ollama request timed out")
        return {"success": False, "error": "Ollama request timed out. The vision model may be loading — try again."}
    except Exception as exc:
        logger.error(f"[scanner] Unexpected error: {exc}", exc_info=True)
        return {"success": False, "error": str(exc)}
