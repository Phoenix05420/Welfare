import os
import logging
from logging.handlers import RotatingFileHandler

# Define log directory and file path
LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "backend.log")

# Configure logger
logger = logging.getLogger("WelfareIntelBackend")
logger.setLevel(logging.INFO)

# Clear existing handlers if any (prevents duplicate handlers on hot reload)
if logger.handlers:
    logger.handlers.clear()

# Create file handler (rotating file handler, 10MB per file, keeping 5 backups)
file_handler = RotatingFileHandler(
    LOG_FILE,
    maxBytes=10 * 1024 * 1024,
    backupCount=5,
    encoding="utf-8"
)
file_handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
logger.addHandler(file_handler)

# Create console handler (so logs still print to the live uvicorn terminal window)
console_handler = logging.StreamHandler()
console_handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
logger.addHandler(console_handler)

# Disable propagation to the root logger to prevent duplicate logs in uvicorn console
logger.propagate = False
