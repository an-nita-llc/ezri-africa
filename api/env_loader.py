"""Load local .env files before any module reads os.environ.

Local development: repo-root `.env` (shared API keys), then `api/.env`
(optional local override). Render injects real environment variables, and
load_dotenv never overrides existing process env -- so dashboard values always
win and this module is a no-op in production.

Call `load_env()` at the very top of every entry point (server.py,
mcp_tools.py, seed_demo.py) BEFORE importing ledger / paypal_client / ai_guard.
"""
from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

API_DIR = Path(__file__).resolve().parent
ROOT_DIR = API_DIR.parent


def load_env() -> None:
    """Populate missing env vars from local files; never override real ones."""
    for path in (ROOT_DIR / ".env", API_DIR / ".env"):
        if path.exists():
            load_dotenv(path, override=False)
