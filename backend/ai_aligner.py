"""
AI Aligner — uses the locally running LM Studio Llama-3.2-11B-Vision-Instruct
model to align scraped raw data into structured, bilingual (English/Tamil)
scheme records.  Falls back to rule-based alignment when LM Studio is unavailable.
"""

import httpx
import json
import re
import hashlib
from typing import Any
from fastapi import APIRouter
from pydantic import BaseModel
from logger import logger

router = APIRouter()

from local_llm import chat_completion

# ---------------------------------------------------------------------------
# Category keywords for rule-based fallback classification
# ---------------------------------------------------------------------------
CATEGORY_KEYWORDS = {
    "SC": ["sc", "scheduled caste", "adi dravidar", "adi-dravidar"],
    "ST": ["st", "scheduled tribe", "tribal"],
    "BC": ["bc", "backward class", "backward classes"],
    "MBC": ["mbc", "most backward", "dnc", "denotified"],
    "Women": ["women", "girl", "female", "ammaiyar", "magalir", "widow", "maternity", "penn"],
    "Students": ["student", "education", "scholarship", "exam", "college", "school", "matric",
                  "fellowship", "laptop", "ntse", "books", "diploma", "graduate"],
    "Persons with Disabilities": ["disabled", "differently abled", "disability", "handicapped"],
    "General": [],
}

TYPE_KEYWORDS = {
    "scholarship": ["scholarship", "fellowship", "award", "ntse", "exam", "vidyadhan"],
    "education": ["education", "school", "college", "laptop", "books", "study"],
    "financial_assistance": ["financial", "assistance", "incentive", "benefit", "subsidy", "fund"],
    "marriage": ["marriage", "remarriage", "wedding"],
    "health": ["health", "insurance", "maternity", "baby care", "medical"],
    "transport": ["bus", "travel", "transport", "payanam", "ticket"],
    "food": ["breakfast", "food", "meal", "nutrition"],
    "housing": ["housing", "illam", "home", "house"],
    "sports": ["sports", "kit", "athlete"],
    "scheme": [],
}


def _classify_categories(name: str) -> list[str]:
    """Classify a scheme name into categories based on keywords."""
    name_lower = name.lower()
    cats = []
    for cat, keywords in CATEGORY_KEYWORDS.items():
        if cat == "General":
            continue
        if any(kw in name_lower for kw in keywords):
            cats.append(cat)
    if not cats:
        cats = ["General"]
    return cats


def _classify_type(name: str, raw_type: str = "") -> str:
    """Classify a scheme into a type based on keywords."""
    combined = f"{name} {raw_type}".lower()
    for stype, keywords in TYPE_KEYWORDS.items():
        if stype == "scheme":
            continue
        if any(kw in combined for kw in keywords):
            return stype
    return "scheme"


def _generate_id(name: str) -> str:
    """Generate a URL-friendly ID from a scheme name."""
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    # Add short hash to ensure uniqueness
    short_hash = hashlib.md5(name.encode()).hexdigest()[:6]
    return f"{slug[:60]}-{short_hash}"


def _generate_tamil(name: str) -> str:
    """Generate a basic Tamil transliteration/description placeholder."""
    # Simple mapping for common words; the AI model provides better translations
    tamil_map = {
        "Scholarship": "உதவித்தொகை",
        "Education": "கல்வி",
        "Free": "இலவச",
        "Marriage": "திருமண",
        "Assistance": "உதவி",
        "Scheme": "திட்டம்",
        "Fellowship": "ஆய்வு உதவித்தொகை",
        "Insurance": "காப்பீடு",
        "Health": "சுகாதாரம்",
        "Women": "பெண்கள்",
        "Students": "மாணவர்கள்",
        "Tamil Nadu": "தமிழ்நாடு",
        "Chief Minister": "முதலமைச்சர்",
        "Award": "விருது",
    }
    tamil_parts = []
    for eng, tam in tamil_map.items():
        if eng.lower() in name.lower():
            tamil_parts.append(tam)
    return " ".join(tamil_parts) if tamil_parts else f"{name} திட்டம்"


# ---------------------------------------------------------------------------
# Fallback alignment (no AI needed)
# ---------------------------------------------------------------------------

def generate_fallback_alignment(raw_items: list[dict]) -> list[dict]:
    """Produce structured scheme data without an AI model using rule-based logic."""
    aligned = []
    for item in raw_items:
        name = item.get("name", "Unknown Scheme")
        raw_type = item.get("scheme_type", item.get("category", ""))
        source = item.get("source", "govtschemes")

        scheme_type = _classify_type(name, raw_type)
        categories = _classify_categories(name)
        tamil_name = _generate_tamil(name)

        source_url = (
            item.get("detail_url")
            or item.get("url")
            or item.get("source_url", "")
        )

        aligned.append({
            "id": _generate_id(name),
            "name": {"en": name, "ta": tamil_name},
            "shortDescription": {
                "en": f"{name} — a {scheme_type.replace('_', ' ')} program by the Government of Tamil Nadu.",
                "ta": f"{tamil_name} — தமிழ்நாடு அரசின் {scheme_type.replace('_', ' ')} திட்டம்.",
            },
            "type": scheme_type,
            "categories": categories,
            "source": _map_source(source, item),
            "sourceUrl": source_url,
            "pdfUrl": item.get("pdf_url"),
            "benefits": item.get("benefits", []),
            "eligibility": item.get("eligibility", []),
            "requiredDocuments": item.get("requiredDocuments", []),
            "process": item.get("process", [])
        })
    return aligned


def _map_source(source: str, item: dict) -> str:
    """Map raw source to ScrapedSchemeSource enum."""
    if source == "tndce":
        # Distinguish colleges from scholarships
        if item.get("category") in ("Government", "Aided", "Self Financing", "Guidelines"):
            return "tndce_colleges"
        return "tndce_scholarships"
    return "govtschemes"


# ---------------------------------------------------------------------------
# AI alignment via Ollama
# ---------------------------------------------------------------------------

async def align_with_ai(raw_items: list[dict]) -> list[dict]:
    """Send raw scraped data to Ministral-14B for structured alignment."""
    import asyncio
    BATCH_SIZE = 6
    batches = [raw_items[i:i + BATCH_SIZE] for i in range(0, len(raw_items), BATCH_SIZE)]

    async def _align_batch(batch: list[dict]) -> list[dict]:
        batch_names = [item.get("name", "") for item in batch]
        prompt = f"""You are a Tamil Nadu government scheme data processor. Given these scheme/scholarship names, produce structured JSON for each.

INPUT SCHEMES:
{json.dumps(batch_names, indent=2)}

For EACH scheme, return a JSON object with:
- "name_en": cleaned English name
- "name_ta": Tamil name (use Tamil script)
- "description_en": one-sentence English description
- "description_ta": one-sentence Tamil description
- "type": one of [scholarship, scheme, financial_assistance, education, marriage, health, transport, food, housing, sports]
- "categories": array from [SC, ST, BC, MBC, General, Women, Students, Persons with Disabilities]

Return ONLY a valid JSON array. No markdown, no explanation."""

        try:
            messages = [{"role": "user", "content": prompt}]
            response_text, _ = await chat_completion(messages, temperature=0.3, max_tokens=600)

            # Parse JSON from response
            parsed = _extract_json_array(response_text)
            if parsed and len(parsed) == len(batch):
                aligned_batch = []
                for j, item in enumerate(batch):
                    ai_data = parsed[j]
                    source = item.get("source", "govtschemes")
                    source_url = item.get("detail_url") or item.get("url") or item.get("source_url", "")

                    aligned_batch.append({
                        "id": _generate_id(ai_data.get("name_en", item.get("name", ""))),
                        "name": {
                            "en": ai_data.get("name_en", item.get("name", "")),
                            "ta": ai_data.get("name_ta", _generate_tamil(item.get("name", ""))),
                        },
                        "shortDescription": {
                            "en": ai_data.get("description_en", f"{item.get('name', '')} program."),
                            "ta": ai_data.get("description_ta", f"{_generate_tamil(item.get('name', ''))} திட்டம்."),
                        },
                        "type": ai_data.get("type", _classify_type(item.get("name", ""))),
                        "categories": ai_data.get("categories", _classify_categories(item.get("name", ""))),
                        "source": _map_source(source, item),
                        "sourceUrl": source_url,
                        "pdfUrl": item.get("pdf_url"),
                        "benefits": item.get("benefits", []),
                        "eligibility": item.get("eligibility", []),
                        "requiredDocuments": item.get("requiredDocuments", []),
                        "process": item.get("process", [])
                    })
                return aligned_batch
        except Exception as e:
            logger.error(f"[ai_aligner] LM Studio batch failed: {e}")

        # Fallback for this batch
        return generate_fallback_alignment(batch)

    # Run all batches concurrently
    results = await asyncio.gather(*[_align_batch(b) for b in batches])

    # Flatten the results
    all_aligned = []
    for r in results:
        all_aligned.extend(r)

    return all_aligned


def _repair_json(text: str) -> str:
    """Repair common syntax glitches produced by smaller local models (trailing commas, missing commas between objects)."""
    text = re.sub(r'```(?:json)?', '', text).strip()
    # Remove trailing commas right before ] or }
    text = re.sub(r',\s*([\]}])', r'\1', text)
    # Add missing commas between adjacent json objects } { -> }, {
    text = re.sub(r'\}\s*\{', '}, {', text)
    return text


def _extract_json_array(text: str) -> list[dict] | None:
    """Extract a JSON array from potentially messy AI output."""
    text = _repair_json(text)
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return parsed
    except json.JSONDecodeError:
        pass

    # Try to find JSON array within text
    match = re.search(r'\[.*\]', text, re.DOTALL)
    if match:
        raw_str = _repair_json(match.group())
        try:
            return json.loads(raw_str)
        except json.JSONDecodeError:
            pass

    return None


async def translate_details_with_ai(details: dict) -> dict:
    """Translate scraped detail lists (benefits, eligibility, docs, process) to Tamil using Ollama."""
    # Construct a compact prompt for translation, capping items so prompt stays small
    trimmed_details = {}
    for k, v in details.items():
        if isinstance(v, list):
            trimmed_details[k] = [str(x)[:200] for x in v[:4]]
        else:
            trimmed_details[k] = str(v)[:200]

    prompt = f"""You are a translator. Translate the following lists of Tamil Nadu government scheme details into Tamil (using Tamil script).
Keep the translations accurate and professional.

INPUT:
{json.dumps(trimmed_details, indent=2)}

For each string in each list, provide the Tamil translation. Return the exact same JSON structure, but where each item is an object: {{"en": "English text", "ta": "Tamil translation"}}.
Example format:
{{
  "benefits": [
    {{"en": "Benefit 1", "ta": "நன்மை 1"}}
  ],
  ...
}}

Return ONLY valid JSON. No explanations, no markdown."""

    try:
        messages = [{"role": "user", "content": prompt}]
        response_text, _ = await chat_completion(messages, temperature=0.2, max_tokens=512)
        response_text = _repair_json(response_text)
            
        # Extract JSON object cleanly with syntax repair
        match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if match:
            raw_str = _repair_json(match.group())
            try:
                translated = json.loads(raw_str)
                if isinstance(translated, dict) and any(translated.values()):
                    return translated
            except json.JSONDecodeError as jde:
                logger.debug(f"[ai_aligner] Details JSON decode syntax issue ({jde}), using rule-based fallback.")
    except Exception as e:
        logger.debug(f"[ai_aligner] Details translation fallback triggered: {e}")
        
    # Rule-based fallback if Ollama/LM Studio output has syntax errors or network issues
    fallback = {}
    for key, items in details.items():
        fallback[key] = []
        if isinstance(items, list):
            for item in items:
                fallback[key].append({
                    "en": str(item),
                    "ta": _generate_tamil(str(item)) or f"{item} (மொழிபெயர்ப்பு இல்லை)"
                })
        else:
            fallback[key] = [{"en": str(items), "ta": _generate_tamil(str(items)) or f"{items} (மொழிபெயர்ப்பு இல்லை)"}]
    return fallback


# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------

class AlignRequest(BaseModel):
    items: list[dict]
    use_ai: bool = True


@router.post("/api/align")
async def api_align(request: AlignRequest):
    """Align raw scraped items using AI or fallback."""
    if request.use_ai:
        try:
            aligned = await align_with_ai(request.items)
            return {"status": "success", "method": "ai", "items": aligned}
        except Exception as e:
            logger.error(f"[api/align] AI alignment failed, using fallback: {e}")

    aligned = generate_fallback_alignment(request.items)
    return {"status": "success", "method": "fallback", "items": aligned}
