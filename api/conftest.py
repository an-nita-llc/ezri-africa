"""Force the test suite onto the local SQLite ledger.

The repo-root .env may point DATABASE_URL at a real Neon/Postgres database.
Tests must never touch it, so clear the Postgres URLs before any test module
imports ledger/server. pytest loads conftest.py before collecting tests, and
python-dotenv does not override keys that already exist in os.environ.
"""
import os

# Never let the suite touch real infrastructure or send real webhooks.
os.environ["DATABASE_URL"] = ""
os.environ["DATABASE_URL_UNPOOLED"] = ""
os.environ["DATABASE_URL_SECONDARY"] = ""
os.environ["DATABASE_URL_SECONDARY_UNPOOLED"] = ""
os.environ["POSTGRES_URL"] = ""
os.environ["OPENROUTER_API_KEY"] = ""
os.environ["NOTIFY_WEBHOOK_URL"] = ""
os.environ["UPSTASH_REDIS_REST_URL"] = ""
os.environ["UPSTASH_REDIS_REST_TOKEN"] = ""
os.environ["DB_CACHE_ENABLED"] = "false"
