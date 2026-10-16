"""Ezri Africa API — Pydantic models (English-only demo, i18n keys ready as ezri.*)."""
from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field

Tag = Literal["FOOD", "SCHOOL", "HEALTH", "RENT", "EMERGENCY", "GENERAL"]
Provider = Literal["ORANGE", "MTN"]
EscrowStatus = Literal["DRAFT", "HELD", "NEEDS_RETRY", "RELEASED", "REFUNDED", "EXPIRED"]


class ParseIn(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    note: str = ""


class ParseOut(BaseModel):
    intent: Literal["transfer", "needs_amount", "greeting", "fees", "escrow", "help", "status", "chat"] = "transfer"
    reply: str = ""
    tag: Tag = "GENERAL"
    amount_usd: float = 60.0
    recipient: str = "mom"
    fx_lrd: float = 0.0
    fee_usd: float = 1.2
    fee_pct: float = 2.0
    total_usd: float = 61.2
    fraud_score: int = 10
    fraud_reason: str = "Small first send. No red flags."
    lock_label: str = "Locked for GENERAL"


class EscrowCreateIn(BaseModel):
    amount_usd: float = Field(gt=0, le=2000)
    tag: Tag = "GENERAL"
    note: str = ""
    recipient: str = "mom"


class EscrowCreateOut(BaseModel):
    escrow_id: str
    paypal_order_id: str
    approval_url: str
    status: EscrowStatus
    expires_in_minutes: int


class CaptureIn(BaseModel):
    escrow_id: str
    paypal_order_id: str = ""


class OverrideIn(BaseModel):
    escrow_id: str
    reason: str = "Sender trusts receiver"


class RefundIn(BaseModel):
    escrow_id: str


class ProveOut(BaseModel):
    escrow_id: str
    status: EscrowStatus
    verdict: Literal["PASS", "FAIL"]
    reason: str
    provider: Optional[Provider] = None
    mock_momo_txn_id: Optional[str] = None
