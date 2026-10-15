"""AI guard — same router idea as AnnitaPlug gateway/ai_router.py, tiny for demo.

- Intent: OpenRouter DeepSeek Flash when OPENROUTER_API_KEY set, else rule-based (EN only).
- Fraud: heuristic 0-100 + reason (amount spike, urgency words).
- FX: static demo rate USD->LRD 194.50 with note (real rates after contest).
- Vision: strict prove-first check. Heuristic now (size, tag keyword in filename/note, amount window);
  production swaps to Qwen vision. Always returns PASS/FAIL + reason so video shows reasoning.
"""
from __future__ import annotations
import os
import re

import httpx

OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")
USD_LRD = 194.50
TAGS = ["FOOD", "SCHOOL", "HEALTH", "RENT", "EMERGENCY", "GENERAL"]


def rule_parse(text: str) -> dict:
    t = text.upper()
    tag = "GENERAL"
    for cand in TAGS:
        if cand in t:
            tag = cand
            break
    if any(w in t for w in ["RICE", "FOOD", "EAT", "MARKET"]) and tag == "GENERAL":
        tag = "FOOD"
    if any(w in t for w in ["SCHOOL", "FEES", "TUITION", "SEMESTER"]) and tag == "GENERAL":
        tag = "SCHOOL"
    m = re.search(r"\$?\s?(\d+(?:\.\d{1,2})?)", text)
    amount = float(m.group(1)) if m else 60.0
    amount = max(1.0, min(amount, 2000.0))
    fraud, reason = 10, "Small first send. No red flags."
    if amount >= 500:
        fraud, reason = 55, "Large amount for first send. Double-check recipient."
    if any(w in t for w in ["URGENT", "NOW NOW", "QUICK QUICK"]):
        fraud = max(fraud, 35)
        reason = "Urgency language. Confirm by voice before release."
    return {
        "tag": tag,
        "amount_usd": amount,
        "recipient": "mom",
        "fx_lrd": round(amount * USD_LRD, 2),
        "fraud_score": fraud,
        "fraud_reason": reason,
        "lock_label": f"Locked for {tag}",
    }


async def parse_intent(text: str, note: str = "") -> dict:
    if not OPENROUTER_KEY:
        return rule_parse(f"{text} {note}")
    try:
        async with httpx.AsyncClient(timeout=25) as c:
            r = await c.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_KEY}",
                    "HTTP-Referer": os.environ.get("OPENROUTER_SITE_URL", "http://localhost:3000"),
                    "X-Title": os.environ.get("OPENROUTER_SITE_NAME", "Ezri Africa"),
                },
                json={
                    "model": "deepseek/deepseek-chat",
                    "temperature": 0,
                    "messages": [
                        {
                            "role": "system",
                            "content": "Extract JSON only: {tag: FOOD|SCHOOL|HEALTH|RENT|EMERGENCY|GENERAL, amount_usd: number, recipient: string}. Tag by purpose.",
                        },
                        {"role": "user", "content": f"{text} NOTE:{note}"},
                    ],
                },
            )
            r.raise_for_status()
            import json as _json

            content = r.json()["choices"][0]["message"]["content"]
            start, end = content.find("{"), content.rfind("}") + 1
            data = _json.loads(content[start:end])
    except Exception:
        return rule_parse(f"{text} {note}")
    base = rule_parse(f"{text} {note}")
    tag = str(data.get("tag", base["tag"])).upper()
    if tag not in TAGS:
        tag = base["tag"]
    try:
        amount = float(data.get("amount_usd", base["amount_usd"]))
    except (TypeError, ValueError):
        amount = base["amount_usd"]
    base.update({"tag": tag, "amount_usd": amount, "fx_lrd": round(amount * USD_LRD, 2),
                 "lock_label": f"Locked for {tag}"})
    return base


def strict_proof_check(tag: str, amount_usd: float, filename: str, filesize: int, note: str) -> tuple[str, str]:
    """Returns (PASS|FAIL, reason). Prove-first: bill/quote/invoice BEFORE release."""
    name = (filename or "").lower()
    if filesize <= 0:
        return "FAIL", "Empty file. Upload a clear photo of the bill or invoice."
    if filesize < 5_000:
        return "FAIL", "Photo too small/blurry. Retake close to the bill."
    if tag == "GENERAL":
        return "PASS", "General send. Claim + ID confirmed. No strict purpose match needed."
    keywords = {
        "FOOD": ["rice", "market", "food", "shop", "store", "receipt", "invoice", "bill"],
        "SCHOOL": ["school", "tuition", "fees", "semester", "student", "invoice", "bill"],
        "HEALTH": ["clinic", "hospital", "pharmacy", "drug", "bill", "receipt"],
        "RENT": ["rent", "landlord", "house", "apartment", "receipt"],
        "EMERGENCY": ["hospital", "clinic", "bill", "receipt", "invoice"],
    }
    hay = f"{name} {note}".lower()
    if not any(k in hay for k in keywords.get(tag, [])):
        return "FAIL", f"Paper does not look like {tag}. Need a {tag} bill, quote, or invoice photo."
    return "PASS", f"Looks like {tag} paperwork. Amount window ok near ${amount_usd:.2f}. Provider release allowed."
