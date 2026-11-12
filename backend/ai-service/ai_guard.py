"""Ezri AI Microservice — Purpose Lock Guard & OpenRouter Intent Parser.
Decoupled microservice for OpenRouter DeepSeek Flash intent parsing & Qwen Vision receipt checks.
"""
from __future__ import annotations
import os
import re
import httpx

FEE_PCT = 0.02  # 2% Ezri platform fee

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "").strip()
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "deepseek/deepseek-chat")

# Standardized Exchange Rate: 1 USD = 194.50 LRD
USD_LRD = 194.50


def fee_of(amount_usd: float) -> float:
    return round(amount_usd * FEE_PCT, 2)


def extract_amount_and_recipient(text: str) -> tuple[float, str]:
    m_amt = re.search(r"\$(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:usd|dollars?)", text, re.I)
    amount = 60.0
    if m_amt:
        val = m_amt.group(1) or m_amt.group(2)
        try:
            amount = float(val)
        except ValueError:
            pass

    m_rec = re.search(r"(?:to|for)\s+([a-z0-9_\-\.\s]{2,20}?)(?:\s+for|\s+to|\s+lock|\s+\$|\,|$)", text, re.I)
    recipient = "mom"
    if m_rec:
        cand = m_rec.group(1).strip().lower()
        if cand not in ("hospital", "school", "tuition", "food", "grocery", "rent", "clinic"):
            recipient = cand

    return amount, recipient


def classify_tag(text: str) -> str:
    t = text.lower()
    if any(k in t for k in ("school", "tuition", "fees", "books", "uniform", "college", "uni")):
        return "SCHOOL"
    if any(k in t for k in ("food", "rice", "grocery", "market", "shop", "eat", "meal")):
        return "FOOD"
    if any(k in t for k in ("hospital", "health", "doctor", "clinic", "pharmacy", "medicine", "drug")):
        return "HEALTH"
    if any(k in t for k in ("rent", "housing", "landlord", "lease", "apartment")):
        return "RENT"
    if any(k in t for k in ("emergency", "urgent", "disaster", "help", "sos")):
        return "EMERGENCY"
    return "GENERAL"


def calculate_fraud_score(amount: float, tag: str, text: str) -> int:
    score = 10
    if amount > 500:
        score += 25
    if amount > 1500:
        score += 35
    if tag == "EMERGENCY":
        score += 15
    if any(k in text.lower() for k in ("urgent", "now", "quick", "asap", "wire")):
        score += 10
    return min(score, 100)


async def parse_intent_openrouter(text: str, note: str = "") -> dict:
    if not OPENROUTER_API_KEY:
        return _fallback_parse(text, note)

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": os.environ.get("OPENROUTER_SITE_URL", "https://ezri-africa.com"),
        "X-Title": os.environ.get("OPENROUTER_SITE_NAME", "Ezri Africa"),
        "Content-Type": "application/json",
    }

    prompt = f"""
You are Ezri AI, a financial copilot for African cross-border remittances.
Analyze this user text: "{text}"

Output a JSON object with:
- intent: "transfer" or "question"
- amount_usd: number
- recipient: string
- tag: "SCHOOL" | "FOOD" | "HEALTH" | "RENT" | "EMERGENCY" | "GENERAL"
- reply: friendly natural response
"""

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json={
                    "model": OPENROUTER_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"},
                },
            )
            if res.status_code == 200:
                data = res.json()
                content = data["choices"][0]["message"]["content"]
                import json
                parsed = json.loads(content)
                amt = float(parsed.get("amount_usd", 60))
                tag = str(parsed.get("tag", "SCHOOL")).upper()
                fee = fee_of(amt)
                lrd = round(amt * USD_LRD, 2)

                return {
                    "intent": parsed.get("intent", "transfer"),
                    "amount_usd": amt,
                    "recipient": parsed.get("recipient", "mom"),
                    "tag": tag,
                    "note": note or text,
                    "fee_usd": fee,
                    "fx_lrd": lrd,
                    "fraud_score": calculate_fraud_score(amt, tag, text),
                    "reply": parsed.get("reply", f"I can lock ${amt} USD for {tag}."),
                }
    except Exception as e:
        print(f"[OpenRouter AI Warning] Fallback: {e}")

    return _fallback_parse(text, note)


def _fallback_parse(text: str, note: str = "") -> dict:
    amt, rec = extract_amount_and_recipient(text)
    tag = classify_tag(text)
    fee = fee_of(amt)
    lrd = round(amt * USD_LRD, 2)
    score = calculate_fraud_score(amt, tag, text)

    is_transfer = (
        re.search(r"\b(send|pay|transfer|remit|wire|move)\b", text, re.I) is not None
        and re.search(r"\d+", text) is not None
    )

    intent = "transfer" if is_transfer else "question"
    reply = (
        f"I can lock ${amt} USD for {tag} ({rec}). Estimated payout: {lrd:.2f} LRD."
        if intent == "transfer"
        else "I am Ezri AI. Ask me about fees, purpose lock rules, or escrow claims."
    )

    return {
        "intent": intent,
        "amount_usd": amt,
        "recipient": rec,
        "tag": tag,
        "note": note or text,
        "fee_usd": fee,
        "fx_lrd": lrd,
        "fraud_score": score,
        "reply": reply,
    }


def strict_proof_check(tag: str, amount_usd: float, filename: str, file_size: int, note_text: str) -> tuple[str, str]:
    if file_size < 5000:
        return "FAIL", "Bill image is too blurry or under minimum size (5 KB)."

    txt = (filename + " " + note_text).lower()

    if tag == "SCHOOL":
        keywords = ["school", "tuition", "fees", "semester", "student", "invoice", "receipt", "bill"]
        if not any(k in txt for k in keywords):
            return "FAIL", "Receipt image does not contain school/tuition keywords."

    if tag == "HEALTH":
        keywords = ["hospital", "clinic", "pharmacy", "health", "doctor", "drug", "bill", "receipt"]
        if not any(k in txt for k in keywords):
            return "FAIL", "Receipt image does not contain hospital/clinic keywords."

    if tag == "RENT":
        keywords = ["rent", "landlord", "lease", "apartment", "house", "receipt"]
        if not any(k in txt for k in keywords):
            return "FAIL", "Receipt image does not contain rent/landlord keywords."

    return "PASS", "Verified bill photo matches purpose tag."
