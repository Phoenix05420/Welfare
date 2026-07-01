from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import httpx
import json
import re
from bs4 import BeautifulSoup
from logger import logger
from playwright.async_api import async_playwright
from playwright.sync_api import sync_playwright

router = APIRouter()

OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "ministral14b"

class AnalyzeRequest(BaseModel):
    url: str
    user_details: Dict[str, Any]

class SubmitRequest(BaseModel):
    url: str
    mapping: Dict[str, str] # Maps Form Field Name -> User Detail Key
    user_details: Dict[str, Any]
    form_fields: List[Dict[str, Any]] # Raw form fields extracted

def extract_form_schema(url: str) -> List[Dict[str, Any]]:
    import requests
    try:
        r = requests.get(url, timeout=10)
        soup = BeautifulSoup(r.text, "html.parser")
        script_text = ""
        for script in soup.find_all("script"):
            if "FB_PUBLIC_LOAD_DATA_" in script.text:
                script_text = script.text
                break

        if not script_text:
            raise ValueError("Could not find form schema (FB_PUBLIC_LOAD_DATA_)")

        match = re.search(r"var FB_PUBLIC_LOAD_DATA_ = (\[.*?\]);", script_text, re.DOTALL)
        if not match:
            raise ValueError("Could not parse form schema")

        data = json.loads(match.group(1))
        raw_fields = data[1][1]
        
        extracted = []
        for field in raw_fields:
            field_name = field[1]
            field_type = field[3] # 0: short text, 1: paragraph, 2: multiple choice (radio), 3: dropdown, 4: checkboxes, 9: date
            options = []
            entry_id = None
            if len(field) > 4 and field[4]:
                entry_id = field[4][0][0]
                if len(field[4][0]) > 1 and field[4][0][1]:
                    # Extract options for radio/dropdown
                    options = [opt[0] for opt in field[4][0][1]]
            
            extracted.append({
                "name": field_name,
                "type": field_type,
                "entry_id": f"entry.{entry_id}" if entry_id else None,
                "options": options
            })
        return extracted
    except Exception as e:
        logger.error(f"[auto_apply] Form extraction error: {e}")
        raise ValueError(f"Failed to extract form schema: {e}")

async def map_fields_with_ai(form_fields: List[Dict[str, Any]], user_keys: List[str]) -> Dict[str, str]:
    field_names = [f["name"] for f in form_fields]
    prompt = f"""You are an API that maps Google Form questions to a standard user profile schema.
Form Questions: {json.dumps(field_names)}
Available User Profile Keys: {json.dumps(user_keys)}

Map each form question to the closest matching user profile key. 
If a form question has no clear matching user profile key, map it to null.

Return ONLY a valid JSON object mapping the exact Form Question string to the User Profile Key string (or null). No explanations.
"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.1, "num_predict": 512},
                },
            )
            ai_text = resp.json().get("response", "").strip()
            
            # Extract JSON block
            if ai_text.startswith("```"):
                ai_text = re.sub(r"^```(?:json)?", "", ai_text)
                ai_text = re.sub(r"```$", "", ai_text).strip()
            
            mapping = json.loads(ai_text)
            return mapping
    except Exception as e:
        logger.error(f"[auto_apply] AI Mapping error: {e}")
        # Fallback heuristic mapping
        mapping = {}
        for fname in field_names:
            fn = fname.lower().replace(" ", "").replace("_", "")
            mapped = None
            for key in user_keys:
                k_lower = key.lower().replace(" ", "").replace("_", "")
                if k_lower in fn or fn in k_lower:
                    mapped = key
                    break
            mapping[fname] = mapped
        return mapping

@router.post("/api/auto-apply/analyze")
async def analyze_form(req: AnalyzeRequest):
    try:
        form_fields = extract_form_schema(req.url)
        # Standard user profile schema keys we expect/support
        standard_keys = [
            "fullName", "dateOfBirth", "gender", "community", "aadhaarNumber", 
            "mobileNumber", "emailAddress", "currentStandard", "schoolName", 
            "schoolType", "mediumOfInstruction", "annualIncome"
        ]
        
        mapping = await map_fields_with_ai(form_fields, standard_keys)
        
        missing_keys = []
        for form_question, mapped_key in mapping.items():
            if mapped_key:
                # Check if user details has this key and it's not empty
                if not req.user_details.get(mapped_key):
                    if mapped_key not in missing_keys:
                        missing_keys.append(mapped_key)
            else:
                # Unmapped form question, we might need to ask the user for this specifically
                # For demo purposes, we will add it to missing keys directly using the form question
                pass
        
        # Add unmapped required fields as literal string requests
        for field in form_fields:
            fname = field["name"]
            if not mapping.get(fname):
                missing_keys.append(fname)
                mapping[fname] = fname # Map it to itself so user provides it literally

        return {
            "form_fields": form_fields,
            "mapping": mapping,
            "missing_keys": missing_keys
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/auto-apply/submit")
def submit_form(req: SubmitRequest):
    try:
        with sync_playwright() as p:
            # Run headless
            browser = p.chromium.launch(headless=True)
            context = browser.new_context()
            page = context.new_page()
            
            page.goto(req.url)
            page.wait_for_selector('div[role="listitem"]') # Wait for questions
            
            def get_best_option(user_val: str, form_options: list) -> str:
                if not form_options:
                    return user_val
                if user_val in form_options:
                    return user_val
                for opt in form_options:
                    if opt.lower() == user_val.lower():
                        return opt
                for opt in form_options:
                    if user_val.lower() in opt.lower() or opt.lower() in user_val.lower():
                        return opt
                import difflib
                matches = difflib.get_close_matches(user_val, form_options, n=1, cutoff=0.3)
                if matches:
                    return matches[0]
                return user_val
            
            for field in req.form_fields:
                fname = field["name"]
                user_key = req.mapping.get(fname)
                if not user_key:
                    continue
                
                value = str(req.user_details.get(user_key, ""))
                if not value:
                    continue
                
                # Try to locate the question block
                # Google forms sometimes have trailing spaces in data but not in rendered HTML
                clean_fname = fname.strip()
                question_block = page.locator('div[role="listitem"]').filter(has_text=clean_fname)
                
                if field["type"] in (0, 1, 9): # Text, Paragraph, Date
                    input_field = question_block.locator('input[type="text"], input[type="date"], textarea').first
                    if input_field.count() > 0:
                        fill_value = value
                        if field["type"] == 9:
                            import re
                            v_clean = value.strip()
                            # Check DD/MM/YYYY or MM/DD/YYYY
                            m = re.match(r"^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$", v_clean)
                            if m:
                                fill_value = f"{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
                            else:
                                # Check YYYY-MM-DD or YYYY/MM/DD
                                m2 = re.match(r"^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$", v_clean)
                                if m2:
                                    fill_value = f"{m2.group(1)}-{int(m2.group(2)):02d}-{int(m2.group(3)):02d}"
                        input_field.fill(fill_value)
                elif field["type"] == 2: # Radio
                    best_value = get_best_option(value, field.get("options", []))
                    # Find the radio button with matching option text using data-value
                    radio = question_block.locator(f'div[role="radio"][data-value="{best_value}"]')
                    if radio.count() > 0:
                        radio.click()
                    else:
                        question_block.locator('div[role="radio"]').filter(has_text=best_value).click()
                elif field["type"] == 3: # Dropdown
                    best_value = get_best_option(value, field.get("options", []))
                    # Dropdowns in Google forms open a listbox
                    listbox = question_block.locator('div[role="listbox"]')
                    if listbox.count() > 0:
                        listbox.click()
                        page.wait_for_timeout(500) # Wait a moment for animation
                        page.wait_for_selector('div[role="option"]:visible', state="visible")
                        # The dropdown options render in an overlay, so we search the whole page
                        option = page.locator(f'div[role="option"][data-value="{best_value}"]:visible')
                        if option.count() > 0:
                            option.first.click()
                        else:
                            page.locator('div[role="option"]:visible').filter(has_text=best_value).first.click()
                elif field["type"] == 4: # Checkboxes
                    best_value = get_best_option(value, field.get("options", []))
                    checkbox = question_block.locator(f'div[role="checkbox"][data-value="{best_value}"]')
                    if checkbox.count() > 0:
                        checkbox.click()
                    else:
                        question_block.locator('div[role="checkbox"]').filter(has_text=best_value).click()

            # Submit the form
            submit_btn = page.locator('div[role="button"]').filter(has_text="Submit")
            if submit_btn.count() > 0:
                submit_btn.click()
                page.wait_for_selector('text="Your response has been recorded."')
            
            browser.close()
            return {"status": "success", "message": "Form submitted successfully"}
    except Exception as e:
        logger.error(f"[auto_apply] Submit error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
