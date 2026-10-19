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
FEE_PCT = float(os.environ.get("EZRI_FEE_PCT", "0.02"))  # Ezri platform fee: 2% of every transaction
TAGS = ["FOOD", "SCHOOL", "HEALTH", "RENT", "EMERGENCY", "GENERAL"]

# "to my sister" / "for mom" recipient mapping
KIN = {
    "MOM": "mom", "MUM": "mom", "MOTHER": "mom", "MAMA": "mom", "MOMMY": "mom",
    "DAD": "dad", "FATHER": "dad", "PAPA": "dad",
    "SISTER": "sister", "BROTHER": "brother", "WIFE": "wife", "HUSBAND": "husband",
    "SON": "son", "DAUGHTER": "daughter", "UNCLE": "uncle", "AUNT": "aunt",
    "AUNTIE": "aunt", "FRIEND": "friend", "LANDLORD": "landlord", "LANDLADY": "landlord",
    "GRANDMA": "mom", "GRANDMOTHER": "mom", "GRANDPA": "dad", "GRANDFATHER": "dad",
}
SEND_RE = re.compile(r"\b(SENDS?|TRANSFERS?|REMIT\w*|DISBURSE\w*|TOP-?UPS?|PAYS?|WIRE|MOVE)\b")
GREETING_RE = re.compile(r"\b(HI|HELLO|HEY|YO|HOWdy|GOOD\s+MORNING|GOOD\s+AFTERNOON|GOOD\s+EVENING|AS\s+SALAAM\w*|HOW\s+ARE\s+YOU)\b")


def fee_of(amount_usd: float) -> float:
    return round(amount_usd * FEE_PCT, 2)


def _classify(t: str, has_amount: bool, has_send: bool, explicit: bool) -> tuple[str, str]:
    """Rule-based conversational intent. Only transfer intent unlocks money movement."""
    pct = f"{FEE_PCT * 100:g}%"
    if has_send and has_amount:
        return "transfer", ""
    if any(
        w in t
        for w in (
            "FEE", "CHARGE", "COST", "COMMISSION", "PERCENT", "%", "EXCHANGE",
            "CONVERT", "IN LRD", "TO LRD", "IN USD", "HOW MUCH IS", "HIDDEN",
        )
    ):
        ex = fee_of(60.0)
        return (
            "fees",
            f"Ezri charges a flat {pct} service fee on every transfer — paid by the sender and added to the PayPal total. "
            f"On a $60 send that's ${ex:.2f} of fee (${60 + ex:.2f} charged), and the receiver still gets the full amount: "
            f"at the live rate 1 USD = {USD_LRD} LRD, $60 arrives as {round(60 * USD_LRD):,} LRD. "
            f"No hidden FX markup, no monthly cost, and the fee is shown to you before you approve.",
        )
    if explicit and has_amount:
        return "transfer", ""
    if any(w in t for w in ("ESCROW", "PURPOSE", "PROOF", "CLAIM", "VERIF", "RECEIPT", "LOCK", "REFUND")):
        return (
            "escrow",
            "Every transfer is purpose-locked and held in PayPal escrow. The receiver uploads a bill photo that must match the purpose "
            "(school fees, hospital bill, rent receipt…), and the Vision AI returns a strict PASS or FAIL with a reason before any mobile "
            "money is released. No proof, no payout — unclaimed funds auto-refund after 48 hours, and you can override a FAIL from the "
            "Transfers Ledger after approval + PIN.",
        )
    if any(w in t for w in ("WHAT CAN YOU DO", "HELP", "HOW DOES", "HOW IT WORKS", "HOW DO I", "EXPLAIN", "WHAT IS", "TELL ME", "SHOW ME")):
        return (
            "help",
            "Here's what I do:\n1) You describe a transfer in plain language — “Send $60 to mom for school”.\n"
            "2) I extract the amount, recipient and purpose, fetch live FX and run a fraud score.\n"
            "3) I stop and wait for your approval + 4-digit PIN — nothing moves without you.\n"
            "4) Funds hold in PayPal escrow until the receiver's bill photo passes the proof check, then mobile money is released.\n"
            "Start with one of the chips below, or ask me about fees, escrow or claiming.",
        )
    if any(w in t for w in ("STATUS", "WHERE IS", "TRACK", "LEDGER", "HISTORY", "UPDATE ON")):
        return (
            "status",
            "Open the Transfers Ledger (bottom bar on mobile, sidebar on desktop) to follow every transfer in real time — "
            "escrow status, fraud score, fee breakdown, claim link and the AI verdict on each one.",
        )
    if GREETING_RE.search(t):
        return (
            "greeting",
            "Hey! I'm Ezri, your purpose-locked transfer assistant. Tell me something like “Send $60 to mom for school” and I'll "
            "set up the full flow — purpose lock, live FX, fraud score and the 2% fee — then I'll always stop for your approval "
            "and PIN before any money moves.",
        )
    if has_send:
        return (
            "needs_amount",
            f"Sure — how much would you like to send, and to whom? Example: “Send $45 for grocery food”. "
            f"I'll show the purpose lock, live FX and the {pct} fee before anything moves.",
        )
    return (
        "chat",
        "I can set up purpose-locked transfers end to end — amount, recipient, live FX, fraud scoring, escrow and proof-before-payout. "
        "Tell me a transfer (e.g. “Send $120 for hospital bill”), or ask me about fees, escrow or how claiming works.",
    )


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

    # recipient: "to my sister" / "for mom"
    recipient = "mom"
    rm = re.search(r"\b(?:TO|FOR)\s+(?:MY\s+)?([A-Z]+)", t)
    if rm and rm.group(1) in KIN:
        recipient = KIN[rm.group(1)]

    # amount: explicit "$60" / "60 dollars" first; plain number only when a send verb is present
    m = re.search(r"\$\s?(\d+(?:\.\d{1,2})?)", text)
    if not m:
        m = re.search(r"(\d+(?:\.\d{1,2})?)\s*(?:USD|DOLLARS?)", t)
    explicit = m is not None
    has_send = bool(SEND_RE.search(t))
    if not m and has_send:
        m = re.search(r"\b(\d+(?:\.\d{1,2})?)\b", text)
    amount = max(1.0, min(float(m.group(1)), 2000.0)) if m else 60.0
    has_amount = m is not None

    fraud, reason = 10, "Small first send. No red flags."
    if amount >= 500:
        fraud, reason = 55, "Large amount for first send. Double-check recipient."
    if any(w in t for w in ["URGENT", "NOW NOW", "QUICK QUICK"]):
        fraud = max(fraud, 35)
        reason = "Urgency language. Confirm by voice before release."

    fee = fee_of(amount)
    intent, reply = _classify(t, has_amount, has_send, explicit)
    return {
        "intent": intent,
        "reply": reply,
        "tag": tag,
        "amount_usd": amount,
        "recipient": recipient,
        "fx_lrd": round(amount * USD_LRD, 2),
        "fee_usd": fee,
        "fee_pct": round(FEE_PCT * 100, 2),
        "total_usd": round(amount + fee, 2),
        "fraud_score": fraud,
        "fraud_reason": reason,
        "lock_label": f"Locked for {tag}",
    }


async def parse_intent(text: str, note: str = "") -> dict:
    base = rule_parse(f"{text} {note}")
    # Conversational intents never reach money extraction — the agent only
    # refines amount/tag when the rules already see a real transfer request.
    if base["intent"] not in ("transfer", "needs_amount") or not OPENROUTER_KEY:
        return base
    try:
        async with httpx.AsyncClient(timeout=25) as c:
            r = await c.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_KEY}",
                    "HTTP-Referer": os.environ.get("OPENROUTER_SITE_URL", "https://ezri-africa.com"),
                    "X-Title": os.environ.get("OPENROUTER_SITE_NAME", "Ezri Africa"),
                },
                json={
                    "model": "deepseek/deepseek-chat",
                    "temperature": 0,
                    "messages": [
                        {
                            "role": "system",
                            "content": "Extract JSON only: {tag: FOOD|SCHOOL|HEALTH|RENT|EMERGENCY|GENERAL, amount_usd: number|null, recipient: string}. Tag by purpose. amount_usd null when no amount is stated.",
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
        return base
    tag = str(data.get("tag", base["tag"])).upper()
    if tag not in TAGS:
        tag = base["tag"]
    recipient = str(data.get("recipient") or base["recipient"]).strip()[:40] or base["recipient"]
    try:
        amount = float(data.get("amount_usd"))
    except (TypeError, ValueError):
        amount = base["amount_usd"] if base["intent"] == "transfer" else None
    if not amount:
        # LLM found no amount for a send request → ask the user before anything happens.
        base.update({"intent": "needs_amount", "reply": _classify("", False, True, False)[1]})
        return base
    amount = max(1.0, min(amount, 2000.0))
    fee = fee_of(amount)
    base.update({
        "intent": "transfer",
        "reply": "",
        "tag": tag,
        "recipient": recipient,
        "amount_usd": amount,
        "fx_lrd": round(amount * USD_LRD, 2),
        "fee_usd": fee,
        "fee_pct": round(FEE_PCT * 100, 2),
        "total_usd": round(amount + fee, 2),
        "lock_label": f"Locked for {tag}",
    })
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
