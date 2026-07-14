import sys
import asyncio

# Fix for Playwright/Subprocess NotImplementedError on Windows
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi_sso.sso.google import GoogleSSO
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import RedirectResponse
import httpx
import math
import os
import json
from dotenv import load_dotenv
from logger import logger

# Load env variables
load_dotenv()

# Import sub-routers
from scraper import router as scraper_router, scrape_tndce_colleges, scrape_tndce_scholarships, scrape_govtschemes
from ai_aligner import router as aligner_router, align_with_ai, generate_fallback_alignment
from document_scanner import router as scanner_router, clear_scan_cache
from database import init_db, load_scraped_schemes, save_scraped_schemes
from chat import router as chat_router
from auto_apply import router as auto_apply_router

app = FastAPI(title="WelfareIntel API")

# Add Session Middleware for OAuth
app.add_middleware(SessionMiddleware, secret_key="super-secret-key")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https://.*|http://localhost:.*",  # Dynamically allows all Vercel/Railway HTTPS origins and localhost
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include sub-routers
app.include_router(scraper_router)
app.include_router(aligner_router)
app.include_router(scanner_router)
app.include_router(chat_router)
app.include_router(auto_apply_router)

# ---------------------------------------------------------------------------
# OAuth — Google SSO
# ---------------------------------------------------------------------------

# Initialize Google SSO (Provide real credentials in production via env vars)
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "YOUR_GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "YOUR_GOOGLE_CLIENT_SECRET")
def get_google_redirect_uri(request: Request) -> str:
    env_uri = os.getenv("GOOGLE_REDIRECT_URI")
    if env_uri:
        return env_uri
    host = request.headers.get("host", "localhost:8000")
    scheme = "https" if request.headers.get("x-forwarded-proto") == "https" else "http"
    return f"{scheme}://{host}/auth/google/callback"

google_sso = GoogleSSO(
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    allow_insecure_http=True # For local development
)

@app.get("/auth/google/login")
async def google_login(request: Request):
    redirect_uri = get_google_redirect_uri(request)
    async with google_sso:
        return await google_sso.get_login_redirect(redirect_uri=redirect_uri)

@app.get("/auth/google/callback")
async def google_callback(request: Request):
    redirect_uri = get_google_redirect_uri(request)
    async with google_sso:
        user = await google_sso.verify_and_process(request, redirect_uri=redirect_uri)
    logger.info(f"[oauth] Google user info: email={user.email}, name={user.display_name}, picture={user.picture}")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:8081")
    import urllib.parse
    email = urllib.parse.quote(user.email or "", safe="")
    name = urllib.parse.quote(user.display_name or "", safe="")
    picture = urllib.parse.quote(user.picture or "", safe="")
    redirect_url = f"{frontend_url}/auth?email={email}&name={name}&picture={picture}"
    return RedirectResponse(url=redirect_url, status_code=302)


# ---------------------------------------------------------------------------
# Mock Data (Migrated from frontend)
# ---------------------------------------------------------------------------

CATEGORIES = [
  { "id": "SC", "en": "SC", "ta": "ஆதி திராவிடர்", "icon": "🛡️" },
  { "id": "ST", "en": "ST", "ta": "பழங்குடி", "icon": "🏔️" },
  { "id": "BC", "en": "BC", "ta": "பிற்படுத்தப்பட்டோர்", "icon": "🌿" },
  { "id": "MBC", "en": "MBC", "ta": "மிகவும் பிற்படுத்தப்பட்டோர்", "icon": "🌾" },
  { "id": "General", "en": "General", "ta": "பொது", "icon": "✨" },
  { "id": "Women", "en": "Women", "ta": "பெண்கள்", "icon": "👩" },
  { "id": "Students", "en": "Students", "ta": "மாணவர்கள்", "icon": "🎓" },
  { "id": "Persons with Disabilities", "en": "Persons with Disabilities", "ta": "மாற்றுத் திறனாளிகள்", "icon": "♿" },
]

SCHEMES = [
  {
    "id": "tn-post-matric-sc-st",
    "type": "scholarship",
    "name": { "en": "Tamil Nadu Post-Matric Scholarship for SC/ST/SCC", "ta": "தமிழ்நாடு மெட்ரிக்குப் பிந்தைய உதவித்தொகை (SC/ST/SCC)" },
    "shortDescription": { "en": "Financial support for SC/ST/SCC students pursuing post-matric studies.", "ta": "மெட்ரிக்குப் பிந்தைய படிப்புகளுக்கான நிதி உதவி." },
    "description": { "en": "A scholarship program that covers tuition, maintenance and exam fees for eligible SC/ST/SCC students continuing their education beyond Class 10.", "ta": "10ம் வகுப்புக்கு பிறகான SC/ST/SCC மாணவர்களுக்கு கல்விக்கட்டணம், பராமரிப்பு கட்டணம் மற்றும் தேர்வு கட்டணம் வழங்கும் திட்டம்." },
    "categories": ["SC", "ST", "Students"],
    "benefits": [
      { "en": "Full tuition fee reimbursement", "ta": "முழு கல்விக்கட்டண திரும்ப செலுத்துதல்" },
      { "en": "Monthly maintenance allowance", "ta": "மாதாந்திர பராமரிப்பு கொடுப்பனவு" },
      { "en": "Exam fee waiver", "ta": "தேர்வு கட்டண விலக்கு" },
    ],
    "eligibility": [
      { "en": "Belongs to SC/ST/SCC community in Tamil Nadu", "ta": "தமிழ்நாட்டில் SC/ST/SCC பிரிவைச் சேர்ந்தவர்" },
      { "en": "Family income below ₹2.5 lakh per annum", "ta": "ஆண்டு குடும்ப வருமானம் ₹2.5 லட்சத்திற்கு குறைவாக" },
      { "en": "Studying in a recognised institution post Class 10", "ta": "10ம் வகுப்புக்கு பின் அங்கீகரிக்கப்பட்ட நிறுவனத்தில் படிக்கிறவர்" },
    ],
    "requiredDocuments": ["aadhaar", "community", "income", "marksheet10", "bonafide", "bankPassbook"],
    "process": [
      { "en": "Register on the TN ePASS portal", "ta": "TN ePASS தளத்தில் பதிவு செய்யவும்" },
      { "en": "Upload required documents", "ta": "தேவையான ஆவணங்களை பதிவேற்றவும்" },
      { "en": "Submit application via institution", "ta": "நிறுவனம் வழியாக விண்ணப்பத்தை சமர்ப்பிக்கவும்" },
      { "en": "Track approval status online", "ta": "ஒப்புதல் நிலையை ஆன்லைனில் கண்காணிக்கவும்" },
    ],
    "deadline": "2026-09-30",
    "officialUrl": "https://www.tnepass.tn.gov.in/",
    "faqs": [
      { "q": { "en": "When does the application open?", "ta": "விண்ணப்பம் எப்போது திறக்கப்படும்?" }, "a": { "en": "Typically July every year.", "ta": "பொதுவாக ஒவ்வொரு ஆண்டும் ஜூலை மாதம்." } },
    ],
  },
  {
    "id": "pudhumai-penn",
    "type": "scheme",
    "name": { "en": "Pudhumai Penn Scheme", "ta": "புதுமைப் பெண் திட்டம்" },
    "shortDescription": { "en": "₹1,000/month for girl students pursuing higher education after Class 12 in government schools.", "ta": "அரசுப் பள்ளியில் 12ம் வகுப்பு படித்த பெண்களுக்கு உயர் கல்விக்கு மாதம் ₹1,000." },
    "description": { "en": "Moovalur Ramamirtham Ammaiyar Higher Education Assurance Scheme — provides ₹1,000 monthly to girl students who completed Class 6 through 12 in government schools and now pursue higher education.", "ta": "மூவலூர் ராமாமிர்தம் அம்மையார் உயர் கல்வி உறுதி திட்டம் — அரசுப் பள்ளியில் 6 முதல் 12ம் வகுப்பு படித்த பெண் மாணவிகளுக்கு உயர் கல்விக்கு மாதம் ₹1,000." },
    "categories": ["Women", "Students"],
    "benefits": [
      { "en": "₹1,000 per month till graduation", "ta": "பட்டப்படிப்பு முடியும் வரை மாதம் ₹1,000" },
      { "en": "Direct transfer to student's bank account", "ta": "மாணவியின் வங்கி கணக்கிற்கு நேரடி மாற்றம்" },
    ],
    "eligibility": [
      { "en": "Female student", "ta": "பெண் மாணவி" },
      { "en": "Studied Class 6 to 12 in TN Government School", "ta": "தமிழ்நாடு அரசு பள்ளியில் 6 முதல் 12ம் வகுப்பு படித்தவர்" },
      { "en": "Pursuing higher education (UG/Diploma/ITI)", "ta": "உயர் கல்வி படிக்கிறவர் (UG/Diploma/ITI)" },
    ],
    "requiredDocuments": ["aadhaar", "marksheet12", "tc", "bonafide", "emis", "bankPassbook"],
    "process": [
      { "en": "Apply via your college / institution", "ta": "உங்கள் கல்லூரி/நிறுவனம் வழியாக விண்ணப்பிக்கவும்" },
      { "en": "EMIS verification of school history", "ta": "EMIS மூலம் பள்ளி வரலாறு சரிபார்ப்பு" },
      { "en": "Bank account validation", "ta": "வங்கி கணக்கு சரிபார்ப்பு" },
      { "en": "Monthly disbursal begins", "ta": "மாதாந்திர வழங்கல் தொடங்கும்" },
    ],
    "deadline": "2026-08-31",
    "officialUrl": "https://penkalvi.tn.gov.in/",
    "faqs": [
      { "q": { "en": "Can private school students apply?", "ta": "தனியார் பள்ளி மாணவிகள் விண்ணப்பிக்கலாமா?" }, "a": { "en": "No. Only girls who studied Classes 6–12 in TN Government schools are eligible.", "ta": "இல்லை. தமிழ்நாடு அரசுப் பள்ளியில் 6–12 படித்தவர்கள் மட்டுமே." } },
    ],
  }
]


# ---------------------------------------------------------------------------
# Analytics endpoints
# ---------------------------------------------------------------------------

@app.get("/api/analytics/categories")
async def get_category_analytics():
    """Get count of schemes by category."""
    all_schemes = await _get_scraped_and_aligned()

    category_counts = {}
    for scheme in all_schemes:
        for category in scheme.get("categories", []):
            category_counts[category] = category_counts.get(category, 0) + 1

    # Convert to list of objects for easier consumption
    result = [{"category": cat, "count": count} for cat, count in category_counts.items()]
    # Sort by count descending
    result.sort(key=lambda x: x["count"], reverse=True)

    return result

@app.get("/api/analytics/types")
async def get_type_analytics():
    """Get count of schemes by type."""
    all_schemes = await _get_scraped_and_aligned()

    type_counts = {}
    for scheme in all_schemes:
        scheme_type = scheme.get("type", "unknown")
        type_counts[scheme_type] = type_counts.get(scheme_type, 0) + 1

    # Convert to list of objects for easier consumption
    result = [{"type": type_, "count": count} for type_, count in type_counts.items()]
    # Sort by count descending
    result.sort(key=lambda x: x["count"], reverse=True)

    return result


# ---------------------------------------------------------------------------
# Existing endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def read_root():
    return {"message": "Welcome to WelfareIntel API"}

@app.get("/api/categories")
def get_categories():
    return CATEGORIES

@app.get("/api/schemes")
def get_schemes(category: Optional[str] = None):
    if category:
        filtered_schemes = [s for s in SCHEMES if category in s.get("categories", [])]
        return filtered_schemes
    return SCHEMES

@app.get("/api/schemes/{scheme_id}")
async def get_scheme(scheme_id: str):
    # 1. Search in local static schemes
    for scheme in SCHEMES:
        if scheme["id"] == scheme_id:
            return scheme

    # 2. Search in scraped schemes
    all_scraped = await _get_scraped_and_aligned()
    for item in all_scraped:
        if item["id"] == scheme_id:
            en_desc = item["shortDescription"]["en"]
            ta_desc = item["shortDescription"]["ta"]
            
            # Map type and source label
            source_info = item.get("source", "govtschemes")
            source_lbl = "DCE Colleges" if source_info == "tndce_colleges" else "DCE Scholarships" if source_info == "tndce_scholarships" else "Govt Schemes"
            
            # Default fallback description
            full_desc_en = f"{en_desc} This is a live scraped welfare program from the official portal ({source_lbl})."
            full_desc_ta = f"{ta_desc} இது அதிகாரப்பூர்வ போர்டலில் ({source_lbl}) இருந்து நேரலையாக பெறப்பட்ட திட்டமாகும்."

            # If the item already has pre-crawled details in cache/DB, return them directly!
            if item.get("benefits") and len(item["benefits"]) > 1:
                return {
                    "id": item["id"],
                    "type": item["type"],
                    "name": item["name"],
                    "shortDescription": item["shortDescription"],
                    "description": {"en": full_desc_en, "ta": full_desc_ta},
                    "categories": item["categories"],
                    "benefits": item["benefits"],
                    "eligibility": item["eligibility"],
                    "requiredDocuments": item["requiredDocuments"],
                    "process": item["process"],
                    "officialUrl": item["sourceUrl"],
                    "pdfUrl": item.get("pdfUrl") or item.get("pdf_url"),
                    "is_scraped": True,
                    "source": source_info
                }

            # Fetch rich details dynamically from detail URL if available
            benefits = [{"en": "Official program assistance and benefits.", "ta": "அதிகாரப்பூர்வ திட்ட உதவி மற்றும் நன்மைகள்."}]
            eligibility = [{"en": "Belongs to target categories and eligible groups.", "ta": "இலக்கு பிரிவுகள் மற்றும் தகுதியான குழுக்களைச் சேர்ந்தவர்."}]
            
            # Initial list of required documents
            required_docs = ["aadhaar", "community", "income"] if item["type"] in ("scholarship", "financial_assistance") else ["aadhaar"]
            from ai_aligner import _generate_tamil
            required_docs_formatted = [{"en": doc.capitalize(), "ta": _generate_tamil(doc) or doc.capitalize()} for doc in required_docs]
            
            process = [{"en": f"Visit the official website: {item['sourceUrl']}", "ta": f"அதிகாரப்பூர்வ இணையதளத்தைப் பார்வையிடவும்: {item['sourceUrl']}"}]

            source_url = item.get("sourceUrl")
            if source_url and "govtschemes.in" in source_url:
                try:
                    from scraper import parse_rich_details
                    from ai_aligner import translate_details_with_ai
                    
                    raw_details = parse_rich_details(source_url)
                    if raw_details and any(raw_details.values()):
                        translated = await translate_details_with_ai(raw_details)
                        if translated.get("benefits"):
                            benefits = translated["benefits"]
                        if translated.get("eligibility"):
                            eligibility = translated["eligibility"]
                        if translated.get("requiredDocuments"):
                            required_docs_formatted = translated["requiredDocuments"]
                        if translated.get("process"):
                            process = translated["process"]
                except Exception as detail_err:
                    logger.error(f"[get_scheme] Failed to fetch rich details: {detail_err}")

            return {
                "id": item["id"],
                "type": item["type"],
                "name": item["name"],
                "shortDescription": item["shortDescription"],
                "description": {"en": full_desc_en, "ta": full_desc_ta},
                "categories": item["categories"],
                "benefits": benefits,
                "eligibility": eligibility,
                "requiredDocuments": required_docs_formatted,
                "process": process,
                "officialUrl": item["sourceUrl"],
                "pdfUrl": item.get("pdfUrl") or item.get("pdf_url"),
                "is_scraped": True,
                "source": source_info
            }
            
    raise HTTPException(status_code=404, detail="Scheme not found")

class ApplyRequest(BaseModel):
    user_id: str
    scheme_id: str

@app.post("/api/apply")
def apply_scheme(request: ApplyRequest):
    # This would normally save to a database
    return {"status": "success", "message": f"Successfully applied for scheme {request.scheme_id}"}


# ---------------------------------------------------------------------------
# Scraped schemes — paginated endpoint with persistent caching & background tasks
# ---------------------------------------------------------------------------

CACHE_FILE = "scraped_cache.json"
_scraped_cache: list[dict] | None = None
_scrape_in_progress = False


async def crawl_and_populate_rich_details(raw_items: list[dict]) -> list[dict]:
    """Concurrently crawl detail pages for all govtschemes items and parse their details."""
    import asyncio
    from scraper import parse_rich_details
    from ai_aligner import translate_details_with_ai, _generate_tamil
    
    logger.info(f"[crawler] Crawling detail pages for {len(raw_items)} items...")
    sem = asyncio.Semaphore(4)
    
    async def _crawl_item(item: dict) -> dict:
        async with sem:
            source_url = item.get("detail_url") or item.get("url") or item.get("source_url")
            # Only crawl govtschemes detail pages
            if source_url and "govtschemes.in" in source_url:
                try:
                    # Scrape raw details in a separate thread
                    raw_details = await asyncio.to_thread(parse_rich_details, source_url)
                    if raw_details and any(raw_details.values()):
                        # Translate details using AI
                        translated = await translate_details_with_ai(raw_details)
                        item["benefits"] = translated.get("benefits", [])
                        item["eligibility"] = translated.get("eligibility", [])
                        item["requiredDocuments"] = translated.get("requiredDocuments", [])
                        item["process"] = translated.get("process", [])
                        return item
                except Exception as e:
                    logger.error(f"[crawler] Failed to crawl details for {item.get('name')}: {e}")
                    
            # Default fallback details if not scraped or not govtschemes
            is_scholarship = item.get("scheme_type", "").lower() == "scholarship" or "scholarship" in item.get("name", "").lower()
            req_docs = ["aadhaar", "community", "income"] if is_scholarship else ["aadhaar"]
            req_docs_formatted = [{"en": doc.capitalize(), "ta": _generate_tamil(doc) or doc.capitalize()} for doc in req_docs]
            
            item["benefits"] = item.get("benefits") or [{"en": "Official program assistance and benefits.", "ta": "அதிகாரப்பூர்வ திட்ட உதவி மற்றும் நன்மைகள்."}]
            item["eligibility"] = item.get("eligibility") or [{"en": "Belongs to target categories and eligible groups.", "ta": "இலக்கு பிரிவுகள் மற்றும் தகுதியான குழுக்களைச் சேர்ந்தவர்."}]
            item["requiredDocuments"] = item.get("requiredDocuments") or req_docs_formatted
            item["process"] = item.get("process") or [{"en": f"Visit the official website: {source_url}", "ta": f"அதிகாரப்பூர்வ இணையதளத்தைப் பார்வையிடவும்: {source_url}"}]
            return item

    # Run crawl concurrently with bounded semaphore for all items
    crawled_items = await asyncio.gather(*[_crawl_item(item) for item in raw_items])
    return crawled_items


async def _perform_background_scrape_and_align():
    """Concurrently scrape all 3 websites and align with Ollama in the background."""
    global _scraped_cache, _scrape_in_progress
    if _scrape_in_progress:
        return
    _scrape_in_progress = True
    try:
        logger.info("[background-scrape] Starting live scrape and AI alignment...")
        # Run synchronous BeautifulSoup scrapers in parallel threads
        colleges_task = asyncio.to_thread(scrape_tndce_colleges)
        scholarships_task = asyncio.to_thread(scrape_tndce_scholarships)
        schemes_task = asyncio.to_thread(scrape_govtschemes)

        colleges, scholarships, schemes = await asyncio.gather(
            colleges_task, scholarships_task, schemes_task
        )

        raw_items = []
        raw_items.extend(colleges)
        raw_items.extend(scholarships)
        raw_items.extend(schemes)

        # Crawl all detail pages concurrently
        raw_items_with_details = await crawl_and_populate_rich_details(raw_items)

        # Align raw data using optimized AI parallel batches
        logger.info(f"[background-scrape] Scraped {len(raw_items_with_details)} items. Aligning using AI...")
        aligned = await align_with_ai(raw_items_with_details)
        _scraped_cache = aligned

        # Save to Neon database
        logger.info("[background-scrape] Saving aligned items to Neon database...")
        db_saved = save_scraped_schemes(aligned)
        
        # Save to persistent local cache file as fallback
        try:
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(aligned, f, ensure_ascii=False, indent=2)
            logger.info(f"[background-scrape] Saved {len(aligned)} aligned items to local file cache {CACHE_FILE}")
        except Exception as file_err:
            logger.error(f"[background-scrape] Failed to write local cache file: {file_err}")

    except Exception as e:
        logger.error(f"[background-scrape] Scrape and align failed: {e}")
    finally:
        _scrape_in_progress = False


async def _initialize_cache_and_background_scrape():
    """Run database/file checks and delayed background scraping inside a non-blocking asyncio task after server boot."""
    global _scraped_cache
    logger.info("[startup] Server booted instantly. Initializing database and cache in background...")
    
    # 1. Try initializing DB and loading schemes without blocking main thread
    try:
        await asyncio.to_thread(init_db)
        db_items = await asyncio.to_thread(load_scraped_schemes)
        if db_items:
            _scraped_cache = db_items
            logger.info(f"[startup] Warm cache: Loaded {len(_scraped_cache)} items from Neon database.")
            return
    except Exception as db_err:
        logger.warning(f"[startup] Database initialization fallback: {db_err}")

    # 2. Try loading from local file cache
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                _scraped_cache = json.load(f)
            logger.info(f"[startup] Warm cache: Loaded {len(_scraped_cache)} items from fallback file {CACHE_FILE}")
        except Exception as e:
            logger.error(f"[startup] Failed to read fallback {CACHE_FILE}: {e}")
            await asyncio.sleep(10)
            await _perform_background_scrape_and_align()
    else:
        # Trigger background task to populate cache after 10s delay
        await asyncio.sleep(10)
        await _perform_background_scrape_and_align()


@app.on_event("startup")
async def startup_event():
    """Warm the cache non-blocking on startup so Uvicorn opens socket in 0.001s."""
    asyncio.create_task(_initialize_cache_and_background_scrape())


async def _get_scraped_and_aligned() -> list[dict]:
    """Retrieve schemes instantly from cache (database with file fallbacks)."""
    global _scraped_cache
    if _scraped_cache is not None:
        return _scraped_cache

    # 1. Try database (non-blocking thread check)
    try:
        db_items = await asyncio.to_thread(load_scraped_schemes)
        if db_items:
            _scraped_cache = db_items
            return _scraped_cache
    except Exception:
        pass

    # 2. Try local file cache
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                _scraped_cache = json.load(f)
            return _scraped_cache
        except Exception:
            pass

    # Quick instant fallback if cache is currently warming or empty on first boot
    logger.info("[cache] Cache warming. Returning instant offline fallback alignment and triggering background crawl...")
    from scraper import FALLBACK_COLLEGES, FALLBACK_SCHOLARSHIPS, FALLBACK_GOVTSCHEMES
    raw_fallback = []
    raw_fallback.extend(FALLBACK_COLLEGES)
    raw_fallback.extend(FALLBACK_SCHOLARSHIPS)
    raw_fallback.extend(FALLBACK_GOVTSCHEMES)
    _scraped_cache = generate_fallback_alignment(raw_fallback)

    # Start proper AI scrapers in background if not already running
    asyncio.create_task(_perform_background_scrape_and_align())
    return _scraped_cache


@app.get("/api/scraped-schemes")
async def get_scraped_schemes(
    page: int = 1,
    per_page: int = 9,
    source: Optional[str] = None,
):
    """Return paginated, AI-aligned scraped scheme data (Instant response from cache)."""
    all_items = await _get_scraped_and_aligned()

    # Filter by source if provided
    if source:
        all_items = [item for item in all_items if item.get("source") == source]

    total = len(all_items)
    total_pages = max(1, math.ceil(total / per_page))
    page = max(1, min(page, total_pages))

    start = (page - 1) * per_page
    end = start + per_page
    items = all_items[start:end]

    return {
        "items": items,
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": total_pages,
    }


@app.post("/api/refresh-scraped")
async def refresh_scraped(background_tasks: BackgroundTasks):
    """Force re-scrape in background. Returns immediately to prevent front-end hangs."""
    global _scrape_in_progress
    if _scrape_in_progress:
        return {"status": "processing", "message": "Scrape already in progress."}
    background_tasks.add_task(_perform_background_scrape_and_align)
    return {"status": "success", "message": "Re-scrape triggered in background."}


@app.get("/api/scrape-status")
async def get_scrape_status():
    """Return whether background scraper is currently running."""
    global _scrape_in_progress, _scraped_cache
    return {
        "in_progress": _scrape_in_progress,
        "total_items": len(_scraped_cache) if _scraped_cache else 0
    }


@app.api_route("/api/clear-cache", methods=["GET", "POST"])
async def clear_all_caches():
    """Clear all in-memory and disk caches across the backend."""
    global _scraped_cache
    _scraped_cache = None
    scans_cleared = clear_scan_cache()
    if os.path.exists(CACHE_FILE):
        try:
            os.remove(CACHE_FILE)
        except Exception:
            pass
    logger.info("[cache] All memory and disk caches cleared via /api/clear-cache endpoint.")
    return {
        "status": "success",
        "message": "All backend caches (scans, schemes, and files) have been cleared successfully.",
        "scans_cleared": scans_cleared
    }
