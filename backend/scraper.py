"""
Web scraper for Tamil Nadu government welfare websites.
Scrapes data from:
  1. tndce.tn.gov.in/Colleges
  2. tndce.tn.gov.in/Home/scholarship
  3. govtschemes.in/allschemes/Tamil Nadu
Each parser has a hardcoded fallback for offline/unreachable scenarios.
"""

import re
import requests
from bs4 import BeautifulSoup
from fastapi import APIRouter
from typing import Optional
from logger import logger

router = APIRouter()

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
}
TIMEOUT = 15

# ---------------------------------------------------------------------------
# Fallback data (used when scraping fails)
# ---------------------------------------------------------------------------

FALLBACK_COLLEGES = [
    {"name": "Government Arts Colleges", "category": "Government", "source": "tndce", "source_url": "https://tndce.tn.gov.in/Colleges"},
    {"name": "Government Arts & Science Colleges", "category": "Government", "source": "tndce", "source_url": "https://tndce.tn.gov.in/Colleges"},
    {"name": "Aided Arts & Science Colleges", "category": "Aided", "source": "tndce", "source_url": "https://tndce.tn.gov.in/Colleges"},
    {"name": "Self-Financing Arts & Science Colleges", "category": "Self Financing", "source": "tndce", "source_url": "https://tndce.tn.gov.in/Colleges"},
]

FALLBACK_SCHOLARSHIPS = [
    {"name": "R.I.M.C. Dehradun Scholarship, Tamil Nadu", "url": "https://tndce.tn.gov.in/Home/scholarship", "pdf_url": None, "source": "tndce"},
    {"name": "EVR Nagammai Scholarship, Tamil Nadu", "url": "https://tndce.tn.gov.in/Home/scholarship", "pdf_url": None, "source": "tndce"},
    {"name": "Central Sector Scheme of Scholarship (CSSS)", "url": "https://tndce.tn.gov.in/Home/scholarship", "pdf_url": None, "source": "tndce"},
    {"name": "Scholarship for Son/Daughter of Differently Abled Persons, Tamil Nadu", "url": "https://tndce.tn.gov.in/Home/scholarship", "pdf_url": None, "source": "tndce"},
    {"name": "Scholarship for Differently Abled Students from Class 9th Onwards, Tamil Nadu", "url": "https://tndce.tn.gov.in/Home/scholarship", "pdf_url": None, "source": "tndce"},
    {"name": "Scholarship for Differently Abled Students towards Purchase of Books and Note Books, Tamil Nadu", "url": "https://tndce.tn.gov.in/Home/scholarship", "pdf_url": None, "source": "tndce"},
    {"name": "Free Education Schemes for BC, MBC & DNC students, Tamil Nadu", "url": "https://tndce.tn.gov.in/Home/scholarship", "pdf_url": None, "source": "tndce"},
    {"name": "Incentive Scheme for Rural MBC/DNC Girl Students, Tamil Nadu", "url": "https://tndce.tn.gov.in/Home/scholarship", "pdf_url": None, "source": "tndce"},
    {"name": "Thanthai Periyar Memorial Award, Tamil Nadu", "url": "https://tndce.tn.gov.in/Home/scholarship", "pdf_url": None, "source": "tndce"},
    {"name": "Perarignar Anna Memorial Award, Tamil Nadu", "url": "https://tndce.tn.gov.in/Home/scholarship", "pdf_url": None, "source": "tndce"},
    {"name": "Vidyadhan Scholarship Program", "url": "https://tndce.tn.gov.in/Home/scholarship", "pdf_url": None, "source": "tndce"},
    {"name": "National Talent Search Exam (NTSE)", "url": "https://tndce.tn.gov.in/Home/scholarship", "pdf_url": None, "source": "tndce"},
    {"name": "Free Education Schemes for SC/ST students, Tamil Nadu", "url": "https://tndce.tn.gov.in/Home/scholarship", "pdf_url": None, "source": "tndce"},
    {"name": "Post Matric Scholarship for BC/MBC/DNC", "url": "https://tndce.tn.gov.in/Home/scholarship", "pdf_url": "https://tndce.tn.gov.in/assets/uploads/scholarship/17486073903971handbook-bcmbc.pdf", "source": "tndce"},
    {"name": "Post Matric Scholarship for SC/ST", "url": "https://tndce.tn.gov.in/Home/scholarship", "pdf_url": "https://tndce.tn.gov.in/assets/uploads/scholarship/17488515324131ADW_GO_92.pdf", "source": "tndce"},
    {"name": "Chief Minister Research Fellowship", "url": "https://tndce.tn.gov.in/Home/scholarship", "pdf_url": "https://tndce.tn.gov.in/assets/uploads/scholarship/17486062314793G_o_53_and_175_amandment.pdf", "source": "tndce"},
]

FALLBACK_GOVTSCHEMES = [
    {"name": "Amma Two Wheeler Scheme for Working Women", "scheme_type": "Financial Assistance", "detail_url": "https://www.govtschemes.in/amma-two-wheeler-scheme-working-women", "source": "govtschemes"},
    {"name": "Moovalur Ramamirtham Ammaiyar Education Assurance Scheme", "scheme_type": "Education", "detail_url": "https://www.govtschemes.in/moovalur-ramamirtham-ammaiyar-education-assurance-scheme", "source": "govtschemes"},
    {"name": "Tamil Nadu Unemployment Assistance Scheme", "scheme_type": "Financial Assistance", "detail_url": "https://www.govtschemes.in/tamil-nadu-unemployment-assistance-scheme", "source": "govtschemes"},
    {"name": "Tamil Nadu Marriage Assistance Scheme", "scheme_type": "Marriage", "detail_url": "https://www.govtschemes.in/tamil-nadu-marriage-assistance-scheme", "source": "govtschemes"},
    {"name": "Chief Minister Comprehensive Health Insurance Scheme", "scheme_type": "Health", "detail_url": "https://www.govtschemes.in/chief-minister-comprehensive-health-insurance-scheme", "source": "govtschemes"},
    {"name": "Tamil Nadu Chief Minister's Solar Rooftop Capital Incentive Scheme", "scheme_type": "Financial Assistance", "detail_url": "https://www.govtschemes.in/tamil-nadu-chief-ministers-solar-rooftop-capital-incentive-scheme", "source": "govtschemes"},
    {"name": "Tamil Nadu Magalir Urimai Thogai Scheme", "scheme_type": "Financial Assistance", "detail_url": "https://www.govtschemes.in/tamil-nadu-magalir-urimai-thogai-scheme", "source": "govtschemes"},
    {"name": "Tamil Nadu Chief Minister Breakfast Scheme", "scheme_type": "Food", "detail_url": "https://www.govtschemes.in/tamil-nadu-chief-minister-breakfast-scheme", "source": "govtschemes"},
    {"name": "Tamil Nadu Zero Ticket Bus Travel Scheme for Women", "scheme_type": "Transport", "detail_url": "https://www.govtschemes.in/tamil-nadu-zero-ticket-bus-travel-scheme-women", "source": "govtschemes"},
    {"name": "Tamil Nadu Pudhumai Penn Scheme", "scheme_type": "Education", "detail_url": "https://www.govtschemes.in/tamil-nadu-pudhumai-penn-scheme", "source": "govtschemes"},
    {"name": "Tamil Nadu Unemployed Youth Employment Generation Programme", "scheme_type": "Fund Support", "detail_url": "https://www.govtschemes.in/tamil-nadu-unemployed-youth-employment-generation-programme", "source": "govtschemes"},
    {"name": "Tamil Nadu New Entrepreneur cum Enterprise Development Scheme", "scheme_type": "Business", "detail_url": "https://www.govtschemes.in/tamil-nadu-new-entrepreneur-cum-enterprise-development-scheme", "source": "govtschemes"},
    {"name": "Tamil Nadu Kalaignar Magalir Urimai Thittam Scheme", "scheme_type": "Financial Assistance", "detail_url": "https://www.govtschemes.in/tamil-nadu-kalaignar-magalir-urimai-thittam-scheme", "source": "govtschemes"},
    {"name": "Tamil Nadu Chief Minister Fellowship Programme", "scheme_type": "Education", "detail_url": "https://www.govtschemes.in/tamil-nadu-chief-minister-fellowship-programme", "source": "govtschemes"},
    {"name": "Tamil Nadu Makkaludan Mudhalvar Scheme", "scheme_type": "Governance", "detail_url": "https://www.govtschemes.in/tamil-nadu-makkaludan-mudhalvar-scheme", "source": "govtschemes"},
    {"name": "Tamil Nadu Pongal Gift Scheme", "scheme_type": "Financial Assistance", "detail_url": "https://www.govtschemes.in/tamil-nadu-pongal-gift-scheme", "source": "govtschemes"},
    {"name": "Tamil Nadu Kalaignar Sports Kit Scheme", "scheme_type": "Sports", "detail_url": "https://www.govtschemes.in/tamil-nadu-kalaignar-sports-kit-scheme", "source": "govtschemes"},
    {"name": "Dr. Muthulakshmi Reddy Ninaivu Inter Caste Marriage Assistance Scheme", "scheme_type": "Marriage", "detail_url": "https://www.govtschemes.in/dr-muthulakshmi-reddy-ninaivu-inter-caste-marriage-assistance-scheme", "source": "govtschemes"},
    {"name": "E.V.R Maniammaiyar Ninaivu Marriage Assistance Scheme For Daughters Of Poor Widows", "scheme_type": "Marriage", "detail_url": "https://www.govtschemes.in/evr-maniammaiyar-ninaivu-marriage-assistance-scheme-daughters-poor-widows", "source": "govtschemes"},
    {"name": "Dr. Dharmambal Ammaiyar Ninaivu Widow Remarriage Assistance Scheme", "scheme_type": "Marriage", "detail_url": "https://www.govtschemes.in/dr-dharmambal-ammaiyar-ninaivu-widow-remarriage-assistance-scheme", "source": "govtschemes"},
    {"name": "Annai Therasa Ninaivu Marriage Assistance Scheme for Orphan Girls", "scheme_type": "Marriage", "detail_url": "https://www.govtschemes.in/annai-therasa-ninaivu-marriage-assistance-scheme-orphan-girls", "source": "govtschemes"},
    {"name": "Moovalur Ramamirtham Ammaiyar Ninaivu Marriage Assistance Scheme", "scheme_type": "Marriage", "detail_url": "https://www.govtschemes.in/moovalur-ramamirtham-ammaiyar-ninaivu-marriage-assistance-scheme", "source": "govtschemes"},
    {"name": "Tamil Nadu Tamizh Pudhalvan Scheme", "scheme_type": "Scholarship", "detail_url": "https://www.govtschemes.in/tamil-nadu-tamizh-pudhalvan-scheme", "source": "govtschemes"},
    {"name": "Tamil Nadu Naan Mudhalvan UPSC Mains Scholarship Programme", "scheme_type": "Fund Support", "detail_url": "https://www.govtschemes.in/tamil-nadu-naan-mudhalvan-upsc-mains-scholarship-programme", "source": "govtschemes"},
    {"name": "Tamil Nadu Kalaignarin Kanavu Illam Scheme", "scheme_type": "Housing", "detail_url": "https://www.govtschemes.in/tamil-nadu-kalaignarin-kanavu-illam-scheme", "source": "govtschemes"},
    {"name": "Tamil Nadu Vidiyal Payanam Thittam", "scheme_type": "Transport", "detail_url": "https://www.govtschemes.in/tamil-nadu-vidiyal-payanam-thittam", "source": "govtschemes"},
    {"name": "Tamil Nadu Dr Muthulakshmi Reddy Maternity Benefit Scheme", "scheme_type": "Health", "detail_url": "https://www.govtschemes.in/tamil-nadu-dr-muthulakshmi-reddy-maternity-benefit-scheme", "source": "govtschemes"},
    {"name": "Tamil Nadu Amma Baby Care Kit Scheme", "scheme_type": "Health", "detail_url": "https://www.govtschemes.in/tamil-nadu-amma-baby-care-kit-scheme", "source": "govtschemes"},
    {"name": "Tamil Nadu Chief Minister Thayumanavar Scheme", "scheme_type": "Financial Assistance", "detail_url": "https://www.govtschemes.in/tamil-nadu-chief-minister-thayumanavar-scheme", "source": "govtschemes"},
    {"name": "Tamil Nadu Mudhalvarin Kakkum Karangal Scheme", "scheme_type": "Subsidy", "detail_url": "https://www.govtschemes.in/tamil-nadu-mudhalvarin-kakkum-karangal-scheme", "source": "govtschemes"},
    {"name": "Tamil Nadu Free Laptop Scheme", "scheme_type": "Education", "detail_url": "https://www.govtschemes.in/tamil-nadu-free-laptop-scheme", "source": "govtschemes"},
]


# ---------------------------------------------------------------------------
# Live scrapers
# ---------------------------------------------------------------------------

def scrape_tndce_colleges(url: str = "https://tndce.tn.gov.in/Colleges") -> list[dict]:
    """Scrape college categories and guideline documents from DCE portal."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        results = []

        # Extract college category tabs
        for tab_text in ["Government Colleges", "Aided Colleges", "Self Financing Colleges"]:
            category = tab_text.replace(" Colleges", "")
            results.append({
                "name": tab_text,
                "category": category,
                "source": "tndce",
                "source_url": url,
            })

        # Extract guideline documents (PDFs)
        for link in soup.find_all("a", href=True):
            href = link["href"]
            text = link.get_text(strip=True)
            if "guidelines" in href and href.endswith(".pdf"):
                full_url = href if href.startswith("http") else f"https://tndce.tn.gov.in{href}"
                results.append({
                    "name": text or "DCE Guideline Document",
                    "category": "Guidelines",
                    "source": "tndce",
                    "source_url": url,
                    "pdf_url": full_url,
                })

        return results if results else FALLBACK_COLLEGES
    except Exception as e:
        logger.error(f"[scraper] tndce_colleges failed: {e}, using fallback")
        return FALLBACK_COLLEGES


def scrape_tndce_scholarships(url: str = "https://tndce.tn.gov.in/Home/scholarship") -> list[dict]:
    """Scrape scholarship listings from DCE scholarship page."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        results = []
        seen_names = set()

        # Find scholarship links — they are anchor tags whose text contains scholarship names
        # On this page, scholarship links are in a list after the breadcrumb
        for link in soup.find_all("a", href=True):
            text = link.get_text(strip=True)
            href = link["href"]

            # Skip navigation/footer links
            if not text or len(text) < 10:
                continue
            if text in seen_names:
                continue
            # Match scholarship-like entries
            scholarship_keywords = [
                "scholarship", "Scholarship", "SCHOLARSHIP",
                "Award", "award", "Fellowship", "fellowship",
                "Free Education", "free education",
                "Incentive", "NTSE", "Vidyadhan",
                "Post metric", "Post Matric",
                "R. I. M. C", "RIMC", "EVR Nagammai",
                "Central Sector", "CSSS",
            ]
            if any(kw in text for kw in scholarship_keywords):
                pdf_url = None
                if href.endswith(".pdf"):
                    pdf_url = href if href.startswith("http") else f"https://tndce.tn.gov.in{href}"

                link_url = href if href.startswith("http") else f"https://tndce.tn.gov.in{href}"

                results.append({
                    "name": text,
                    "url": link_url,
                    "pdf_url": pdf_url,
                    "source": "tndce",
                })
                seen_names.add(text)

        return results if len(results) >= 5 else FALLBACK_SCHOLARSHIPS
    except Exception as e:
        logger.error(f"[scraper] tndce_scholarships failed: {e}, using fallback")
        return FALLBACK_SCHOLARSHIPS


def scrape_govtschemes(url: str = "https://www.govtschemes.in/allschemes/Tamil%20Nadu") -> list[dict]:
    """Scrape Tamil Nadu government schemes from govtschemes.in."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        results = []
        # The schemes are in a <table class="table table-striped">
        table = soup.find("table", class_="table")
        if table:
            rows = table.find_all("tr")
            for row in rows[1:]:  # skip header
                cells = row.find_all("td")
                if len(cells) >= 3:
                    # Cell 1: scheme name (with link)
                    name_cell = cells[1]
                    link = name_cell.find("a")
                    name = link.get_text(strip=True) if link else name_cell.get_text(strip=True)
                    detail_url = ""
                    if link and link.get("href"):
                        href = link["href"]
                        detail_url = href if href.startswith("http") else f"https://www.govtschemes.in{href}"

                    # Cell 2: scheme type
                    type_cell = cells[2]
                    # Type may be in nested div with field--name-name
                    type_div = type_cell.find("div", class_="field--name-name")
                    scheme_type = type_div.get_text(strip=True) if type_div else type_cell.get_text(strip=True)
                    if not scheme_type:
                        scheme_type = "General"

                    if name:
                        results.append({
                            "name": name,
                            "scheme_type": scheme_type,
                            "detail_url": detail_url,
                            "source": "govtschemes",
                        })

        return results if len(results) >= 5 else FALLBACK_GOVTSCHEMES
    except Exception as e:
        logger.error(f"[scraper] govtschemes failed: {e}, using fallback")
        return FALLBACK_GOVTSCHEMES


# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------

@router.get("/api/scrape-colleges")
async def api_scrape_colleges():
    """Scrape and return college data from tndce.tn.gov.in."""
    return {"source": "tndce_colleges", "items": scrape_tndce_colleges()}


@router.get("/api/scrape-scholarships")
async def api_scrape_scholarships():
    """Scrape and return scholarship data from tndce.tn.gov.in."""
    return {"source": "tndce_scholarships", "items": scrape_tndce_scholarships()}


@router.get("/api/scrape-govtschemes")
async def api_scrape_govtschemes():
    """Scrape and return government scheme data from govtschemes.in."""
    return {"source": "govtschemes", "items": scrape_govtschemes()}


@router.get("/api/scrape-all")
async def api_scrape_all():
    """Scrape all 3 sources and return combined results."""
    colleges = []
    scholarships = []
    schemes = []

    try:
        colleges = scrape_tndce_colleges()
    except Exception as e:
        colleges = FALLBACK_COLLEGES
        logger.error(f"[scrape-all] colleges error: {e}")

    try:
        scholarships = scrape_tndce_scholarships()
    except Exception as e:
        scholarships = FALLBACK_SCHOLARSHIPS
        logger.error(f"[scrape-all] scholarships error: {e}")

    try:
        schemes = scrape_govtschemes()
    except Exception as e:
        schemes = FALLBACK_GOVTSCHEMES
        logger.error(f"[scrape-all] govtschemes error: {e}")

    return {
        "status": "success",
        "colleges": {"count": len(colleges), "items": colleges},
        "scholarships": {"count": len(scholarships), "items": scholarships},
        "govtschemes": {"count": len(schemes), "items": schemes},
        "total": len(colleges) + len(scholarships) + len(schemes),
    }


def parse_rich_details(url: str) -> dict:
    """Fetch and scrape rich details from a govtschemes.in detail page."""
    try:
        if not url or "govtschemes.in" not in url:
            return {}
        
        resp = requests.get(url, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        
        body_divs = soup.find_all(class_="field--name-body")
        if not body_divs:
            return {}
            
        # Select the one with the maximum text content length to ensure we parse the article body, not the search box
        body_div = max(body_divs, key=lambda x: len(x.get_text()))
        
        details = {
            "benefits": [],
            "eligibility": [],
            "requiredDocuments": [],
            "process": []
        }
        
        # Find all headings in the body_div recursively
        headings = body_div.find_all(["h2", "h3", "h4"])
        
        for heading in headings:
            header_text = heading.get_text().lower()
            section = None
            
            if "eligibility" in header_text or "eligible" in header_text:
                section = "eligibility"
            elif "benefit" in header_text or "feature" in header_text or "highlight" in header_text or "summary" in header_text:
                section = "benefits"
            elif "document" in header_text or "required" in header_text:
                section = "requiredDocuments"
            elif "step" in header_text or "apply" in header_text or "process" in header_text or "how" in header_text:
                section = "process"
            
            if not section:
                continue
                
            # Iterate through siblings of this heading until the next heading is reached
            sibling = heading.next_sibling
            while sibling:
                # Sibling might be another heading (stop)
                if sibling.name in ("h2", "h3", "h4"):
                    break
                
                if sibling.name in ("ul", "ol"):
                    for li in sibling.find_all("li"):
                        txt = li.get_text(strip=True)
                        if txt:
                            details[section].append(txt)
                elif sibling.name == "table":
                    # Parse table rows cleanly
                    for row in sibling.find_all("tr"):
                        cells = [c.get_text(strip=True) for c in row.find_all(["td", "th"])]
                        if len(cells) == 2:
                            details[section].append(f"{cells[0]}: {cells[1]}")
                        elif len(cells) > 0:
                            details[section].append(" | ".join(cells))
                elif sibling.name == "p":
                    txt = sibling.get_text(strip=True)
                    if txt and len(txt) > 15 and "subscribe" not in txt.lower():
                        details[section].append(txt)
                elif sibling.name is None:
                    # Text node, ignore
                    pass
                else:
                    # Sibling is a wrapper element (like a div), search inside it recursively
                    lists = sibling.find_all(["ul", "ol"])
                    for lst in lists:
                        for li in lst.find_all("li"):
                            txt = li.get_text(strip=True)
                            if txt:
                                details[section].append(txt)
                    
                    tables = sibling.find_all("table")
                    for table in tables:
                        for row in table.find_all("tr"):
                            cells = [c.get_text(strip=True) for c in row.find_all(["td", "th"])]
                            if len(cells) == 2:
                                details[section].append(f"{cells[0]}: {cells[1]}")
                            elif len(cells) > 0:
                                details[section].append(" | ".join(cells))
                                
                    if not lists and not tables:
                        paragraphs = sibling.find_all("p")
                        for p in paragraphs:
                            txt = p.get_text(strip=True)
                            if txt and len(txt) > 15 and "subscribe" not in txt.lower():
                                details[section].append(txt)
                                
                sibling = sibling.next_sibling

        # Clean up duplicates and empty strings
        for key in details:
            cleaned = []
            seen = set()
            for x in details[key]:
                x_clean = x.strip()
                if x_clean and x_clean not in seen:
                    if "subscribe" in x_clean.lower():
                        continue
                    cleaned.append(x_clean)
                    seen.add(x_clean)
            details[key] = cleaned
            
        return details
    except Exception as e:
        logger.error(f"[scraper] Failed to parse rich details from {url}: {e}")
        return {}
