"""Structured logger setup writing to logs/app.log and logs/error.log."""

import os
import logging

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

logger = logging.getLogger("approval_api")
logger.setLevel(logging.INFO)

formatter = logging.Formatter(
    "[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

# App log file handler
app_handler = logging.FileHandler(os.path.join(LOG_DIR, "app.log"))
app_handler.setLevel(logging.INFO)
app_handler.setFormatter(formatter)

# Error log file handler
error_handler = logging.FileHandler(os.path.join(LOG_DIR, "error.log"))
error_handler.setLevel(logging.ERROR)
error_handler.setFormatter(formatter)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(formatter)

if not logger.handlers:
    logger.addHandler(app_handler)
    logger.addHandler(error_handler)
    logger.addHandler(console_handler)
