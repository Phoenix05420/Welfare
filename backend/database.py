import os
import json
import time
from dotenv import load_dotenv
from logger import logger
from sqlalchemy import create_engine, Column, String, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Load .env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = None
SessionLocal = None
Base = declarative_base()

_last_db_check_time = 0.0
_db_cooldown_period = 60.0  # seconds
_db_init_failed = False

# ---------------------------------------------------------------------------
# Database Model
# ---------------------------------------------------------------------------
class ScrapedSchemeDb(Base):
    __tablename__ = "scraped_schemes"

    id = Column(String(100), primary_key=True, index=True)
    type = Column(String(50), nullable=False)
    name_en = Column(String(255), nullable=False)
    name_ta = Column(String(255), nullable=False)
    short_description_en = Column(Text, nullable=False)
    short_description_ta = Column(Text, nullable=False)
    categories = Column(JSON, nullable=False)
    source = Column(String(100), nullable=False)
    source_url = Column(Text, nullable=False)
    pdf_url = Column(Text, nullable=True)
    benefits = Column(JSON, nullable=True)
    eligibility = Column(JSON, nullable=True)
    required_documents = Column(JSON, nullable=True)
    process = Column(JSON, nullable=True)

# ---------------------------------------------------------------------------
# Database Helper functions
# ---------------------------------------------------------------------------

def is_db_available() -> bool:
    """Return True if connection url is configured and successfully testable."""
    global engine, SessionLocal, _last_db_check_time, _db_init_failed
    if not DATABASE_URL:
        return False
    if engine is None:
        current_time = time.time()
        # If it failed recently, do not retry until cooldown expires
        if _db_init_failed and (current_time - _last_db_check_time < _db_cooldown_period):
            return False

        _last_db_check_time = current_time
        try:
            # Neon requires SSL by default, configure SSL args if postgresql is used
            # Set a 3-second connection timeout to avoid hanging the app if the DB is unreachable
            connect_args = {"connect_timeout": 3}
            if DATABASE_URL.startswith("postgresql"):
                connect_args["sslmode"] = "require"
            
            engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            # Test connection
            with engine.connect() as conn:
                pass
            _db_init_failed = False
            return True
        except Exception as e:
            logger.error(f"[database] Failed to initialize DB engine: {e}")
            engine = None
            SessionLocal = None
            _db_init_failed = True
            return False
    return True

def init_db():
    """Create table schemas if database is configured."""
    if is_db_available():
        try:
            Base.metadata.create_all(bind=engine)
            from sqlalchemy import text
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE scraped_schemes ADD COLUMN IF NOT EXISTS benefits JSON;"))
                conn.execute(text("ALTER TABLE scraped_schemes ADD COLUMN IF NOT EXISTS eligibility JSON;"))
                conn.execute(text("ALTER TABLE scraped_schemes ADD COLUMN IF NOT EXISTS required_documents JSON;"))
                conn.execute(text("ALTER TABLE scraped_schemes ADD COLUMN IF NOT EXISTS process JSON;"))
            logger.info("[database] Database tables initialized successfully.")
        except Exception as e:
            logger.error(f"[database] Failed to create tables: {e}")

def load_scraped_schemes() -> list[dict] | None:
    """Load and format all scraped schemes from database."""
    if not is_db_available():
        return None
    
    db = SessionLocal()
    try:
        records = db.query(ScrapedSchemeDb).all()
        aligned = []
        for r in records:
            aligned.append({
                "id": r.id,
                "type": r.type,
                "name": {"en": r.name_en, "ta": r.name_ta},
                "shortDescription": {"en": r.short_description_en, "ta": r.short_description_ta},
                "categories": r.categories if isinstance(r.categories, list) else json.loads(r.categories),
                "source": r.source,
                "sourceUrl": r.source_url,
                "pdfUrl": r.pdf_url,
                "benefits": r.benefits if r.benefits is not None else [],
                "eligibility": r.eligibility if r.eligibility is not None else [],
                "requiredDocuments": r.required_documents if r.required_documents is not None else [],
                "process": r.process if r.process is not None else []
            })
        return aligned
    except Exception as e:
        logger.error(f"[database] Failed to load schemes: {e}")
        return None
    finally:
        db.close()

def save_scraped_schemes(schemes: list[dict]) -> bool:
    """Save/update a list of aligned schemes into the database."""
    if not is_db_available():
        return False
    
    db = SessionLocal()
    try:
        # Upsert or refresh items
        for s in schemes:
            categories_data = s.get("categories", [])
            # Map item
            record = db.query(ScrapedSchemeDb).filter(ScrapedSchemeDb.id == s["id"]).first()
            if record:
                record.type = s["type"]
                record.name_en = s["name"]["en"]
                record.name_ta = s["name"]["ta"]
                record.short_description_en = s["shortDescription"]["en"]
                record.short_description_ta = s["shortDescription"]["ta"]
                record.categories = categories_data
                record.source = s["source"]
                record.source_url = s["sourceUrl"]
                record.pdf_url = s.get("pdfUrl") or s.get("pdf_url")
                record.benefits = s.get("benefits")
                record.eligibility = s.get("eligibility")
                record.required_documents = s.get("requiredDocuments")
                record.process = s.get("process")
            else:
                new_record = ScrapedSchemeDb(
                    id=s["id"],
                    type=s["type"],
                    name_en=s["name"]["en"],
                    name_ta=s["name"]["ta"],
                    short_description_en=s["shortDescription"]["en"],
                    short_description_ta=s["shortDescription"]["ta"],
                    categories=categories_data,
                    source=s["source"],
                    source_url=s["sourceUrl"],
                    pdf_url=s.get("pdfUrl") or s.get("pdf_url"),
                    benefits=s.get("benefits"),
                    eligibility=s.get("eligibility"),
                    required_documents=s.get("requiredDocuments"),
                    process=s.get("process")
                )
                db.add(new_record)
        db.commit()
        logger.info(f"[database] Successfully saved {len(schemes)} schemes to Neon database.")
        return True
    except Exception as e:
        logger.error(f"[database] Failed to save schemes: {e}")
        db.rollback()
        return False
    finally:
        db.close()
