"""
WelfareIntel Automated API Self-Test
Tests the live /api/scan-document endpoint against X:\bharath aadhar.pdf and X:\Sara aadhar.pdf.
Prints the model routed and all 6 extracted core fields.
"""

import os
import sys
import json
import httpx
import asyncio

API_URL = "http://127.0.0.1:8000/api/scan-document"
PDF_PATHS = [r"X:\bharath aadhar.pdf", r"X:\Sara aadhar.pdf"]

async def run_self_test():
    print("==================================================================")
    print("       WELFAREINTEL AUTOMATED API & OCR SELF-TEST                 ")
    print("==================================================================")

    # Find first existing PDF
    test_pdf = None
    for path in PDF_PATHS:
        if os.path.exists(path):
            test_pdf = path
            break

    if not test_pdf:
        print("[ERROR] Neither X:\\bharath aadhar.pdf nor X:\\Sara aadhar.pdf found on disk.")
        return

    print(f"[TEST] Using document file: {test_pdf} ({os.path.getsize(test_pdf)} bytes)")
    print(f"[TEST] Sending POST request to: {API_URL} ...")
    print("[TEST] (Please wait ~15-30 seconds while the vision model reads the card)")

    try:
        async with httpx.AsyncClient(timeout=900.0) as client:
            with open(test_pdf, "rb") as f:
                files = {"file": (os.path.basename(test_pdf), f, "application/pdf")}
                resp = await client.post(API_URL, files=files)

        if resp.status_code != 200:
            print(f"\n[FAIL] API returned HTTP {resp.status_code}: {resp.text}")
            return

        data = resp.json()
        print("\n==================================================================")
        print("                        TEST RESULTS                              ")
        print("==================================================================")
        print(f"Status           : {'SUCCESS' if data.get('success') else 'FAILED'}")
        print(f"Model Routed To  : {data.get('model', 'Unknown / Cached')}")
        print(f"Document Type    : {data.get('document_type_label', data.get('document_type'))}")
        print(f"Photo Detected   : {'YES (Cropped & Encoded)' if data.get('photo') else 'NO'}")
        print("------------------------------------------------------------------")
        print("Extracted Core Fields:")
        fields = data.get("fields", [])
        if not fields:
            print("  (No fields returned by API)")
        for f in fields:
            key = f.get("key", "")
            label = f.get("label", key)
            val = f.get("value", "")
            conf = f.get("confidence", "N/A")
            print(f"  * {label:<28}: '{val}' [{conf.upper()}]")
        print("==================================================================")

    except httpx.ConnectError:
        print("\n[FAIL] Cannot connect to FastAPI server at http://127.0.0.1:8000.")
        print("Please make sure your backend is running (`uvicorn main:app --port 8000`).")
    except Exception as exc:
        print(f"\n[FAIL] Exception during self-test: {exc}")

if __name__ == "__main__":
    asyncio.run(run_self_test())
