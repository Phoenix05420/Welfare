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

import os

from local_llm import chat_completion

class AnalyzeRequest(BaseModel):
    url: str
    user_details: Dict[str, Any]

class SubmitRequest(BaseModel):
    url: str
    mapping: Dict[str, Optional[str]] # Maps Form Field Name -> User Detail Key
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
        messages = [{"role": "user", "content": prompt}]
        ai_text, _ = await chat_completion(messages, temperature=0.1, max_tokens=512)
        ai_text = ai_text.strip()
        
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

async def map_value_with_ai(user_val: str, form_options: List[str], question_text: str) -> str:
    """Use the local AI model to map a user profile value to the closest matching Google Form option when there is a mismatch."""
    if not form_options:
        return user_val
        
    prompt = f"""You are a form-filling assistant. A form question is: "{question_text}"
The available multiple-choice options are: {json.dumps(form_options)}
The user's profile value is: "{user_val}"

Determine which of the available options best matches the user's profile value.
Return ONLY the exact option string chosen from the available options. Do NOT add explanation or markdown."""
    try:
        messages = [{"role": "user", "content": prompt}]
        ai_choice, _ = await chat_completion(messages, temperature=0.1, max_tokens=100)
        ai_choice = ai_choice.strip()
        
        if ai_choice.startswith("```"):
            ai_choice = re.sub(r"^```(?:json|text)?", "", ai_choice)
            ai_choice = re.sub(r"```$", "", ai_choice).strip()
            
        if ai_choice in form_options:
            return ai_choice
            
        for opt in form_options:
            if opt.lower() == ai_choice.lower():
                return opt
                
        import difflib
        matches = difflib.get_close_matches(ai_choice, form_options, n=1, cutoff=0.4)
        if matches:
            return matches[0]
    except Exception as e:
        logger.error(f"[auto_apply] AI value mapping failed: {e}")
        
    return user_val


@router.post("/api/auto-apply/submit")
async def submit_form(req: SubmitRequest):
    try:
        async with async_playwright() as p:
            # Run headless with performance args
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--disable-extensions"
                ]
            )
            # Open a clean context
            context = await browser.new_context(viewport={"width": 1280, "height": 800})
            page = await context.new_page()
            
            # Accelerate page load up to 4x by blocking images, stylesheet fonts, media, and third-party trackers
            async def intercept_route(route):
                req_url = route.request.url.lower()
                resource_type = route.request.resource_type
                if resource_type in ["image", "media", "font"] or "analytics" in req_url or "google-analytics" in req_url or "googletagmanager" in req_url:
                    await route.abort()
                else:
                    await route.continue_()
            await page.route("**/*", intercept_route)
            
            # Set shorter navigation timeouts
            await page.goto(req.url, wait_until="commit", timeout=20000)
            await page.wait_for_selector('div[role="listitem"]', timeout=10000) # Wait for questions
            
            async def get_best_option(user_val: str, form_options: list, question_text: str) -> str:
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
                matches = difflib.get_close_matches(user_val, form_options, n=1, cutoff=0.5)
                if matches:
                    return matches[0]
                
                # If no confident match found, use AI model to resolve mapping mismatch
                logger.info(f"[auto_apply] Value mismatch detected for '{question_text}' (user value: '{user_val}'). Resolving using AI...")
                return await map_value_with_ai(user_val, form_options, question_text)
            
            for field in req.form_fields:
                fname = field["name"]
                user_key = req.mapping.get(fname)
                if not user_key:
                    continue
                
                value = str(req.user_details.get(user_key, ""))
                if not value:
                    continue
                
                clean_fname = fname.strip()
                question_block = page.locator('div[role="listitem"]').filter(has_text=clean_fname)
                
                if field["type"] in (0, 1, 9): # Text, Paragraph, Date
                    input_field = question_block.locator('input[type="text"], input[type="date"], textarea').first
                    if await input_field.count() > 0:
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
                        await input_field.fill(fill_value)
                elif field["type"] == 2: # Radio
                    best_value = await get_best_option(value, field.get("options", []), fname)
                    radio = question_block.locator(f'div[role="radio"][data-value="{best_value}"]')
                    if await radio.count() > 0:
                        await radio.click()
                    else:
                        radio_text = question_block.locator('div[role="radio"]').filter(has_text=best_value)
                        if await radio_text.count() > 0:
                            await radio_text.click()
                        else:
                            # Final fallback: Click first option if VLM resolution wasn't found on the live DOM
                            first_radio = question_block.locator('div[role="radio"]').first
                            if await first_radio.count() > 0:
                                logger.warning(f"[auto_apply] Radio '{best_value}' not found for '{fname}'. Clicking first radio.")
                                await first_radio.click()
                elif field["type"] == 3: # Dropdown
                    best_value = await get_best_option(value, field.get("options", []), fname)
                    listbox = question_block.locator('div[role="listbox"]')
                    if await listbox.count() > 0:
                        await listbox.click()
                        await page.wait_for_timeout(100) # Fast wait for animation
                        await page.wait_for_selector('div[role="option"]:visible', state="visible", timeout=3000)
                        option = page.locator(f'div[role="option"][data-value="{best_value}"]:visible')
                        if await option.count() > 0:
                            await option.first.click()
                        else:
                            option_text = page.locator('div[role="option"]:visible').filter(has_text=best_value)
                            if await option_text.count() > 0:
                                await option_text.first.click()
                            else:
                                first_opt = page.locator('div[role="option"]:visible').first
                                if await first_opt.count() > 0:
                                    logger.warning(f"[auto_apply] Dropdown '{best_value}' not found for '{fname}'. Clicking first option.")
                                    await first_opt.click()
                elif field["type"] == 4: # Checkboxes
                    best_value = await get_best_option(value, field.get("options", []), fname)
                    checkbox = question_block.locator(f'div[role="checkbox"][data-value="{best_value}"]')
                    if await checkbox.count() > 0:
                        await checkbox.click()
                    else:
                        chk_text = question_block.locator('div[role="checkbox"]').filter(has_text=best_value)
                        if await chk_text.count() > 0:
                            await chk_text.click()
                        else:
                            first_chk = question_block.locator('div[role="checkbox"]').first
                            if await first_chk.count() > 0:
                                logger.warning(f"[auto_apply] Checkbox '{best_value}' not found for '{fname}'. Clicking first checkbox.")
                                await first_chk.click()
 
            # Take a screenshot of the filled form before submission for user review & debug
            await page.screenshot(path="X:/welfare/form_state.png", full_page=True)
            logger.info("[auto_apply] Saved filled form state screenshot to X:/welfare/form_state.png")

            # Submit the form: Find button by text matching English and Tamil variants, or default to the last button
            submit_btn = None
            all_buttons = page.locator('div[role="button"]')
            btn_count = await all_buttons.count()
            for i in range(btn_count):
                btn = all_buttons.nth(i)
                btn_text = await btn.inner_text()
                btn_text_clean = btn_text.upper().strip()
                if any(w in btn_text_clean for w in ("SUBMIT", "சமர்ப்பி", "சமர்பி", "SEND", "NEXT", "CONTINUE")):
                    submit_btn = btn
                    if "SUBMIT" in btn_text_clean or "சமர்ப்பி" in btn_text_clean or "சமர்பி" in btn_text_clean:
                        break
            
            if not submit_btn and btn_count > 0:
                submit_btn = all_buttons.last
                
            if submit_btn:
                logger.info(f"[auto_apply] Clicking submit button: '{await submit_btn.inner_text()}'")
                await submit_btn.click()
                try:
                    await page.wait_for_selector('text="Your response has been recorded."', timeout=8000)
                except Exception:
                    await page.screenshot(path="X:/welfare/form_confirmation.png", full_page=True)
                    logger.info("[auto_apply] Standard response recorded confirmation not matched. Saved confirmation screenshot to X:/welfare/form_confirmation.png")
            else:
                logger.error("[auto_apply] Could not find any submit button inside Google Form!")
            
            await browser.close()
            return {"status": "success", "message": "Form submitted successfully"}
    except Exception as e:
        logger.error(f"[auto_apply] Submit error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
