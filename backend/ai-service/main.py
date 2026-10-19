"""Ezri AI Microservice Server (FastAPI).
Handles AI intent classification, Vision receipt checks, and risk scoring independently.
"""
from __future__ import annotations
import os
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ai_guard import parse_intent_openrouter, strict_proof_check, FEE_PCT, USD_LRD

app = FastAPI(
    title="Ezri AI Service — Microservice",
    version="1.0.0",
    description="Dedicated AI microservice for OpenRouter intent parsing & Vision receipt inspection.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ParseRequest(BaseModel):
    text: str
    note: str = ""


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "ai-service",
        "fee_pct": FEE_PCT,
        "fx_lrd": USD_LRD,
    }


@app.post("/parse")
async def parse(body: ParseRequest):
    return await parse_intent_openrouter(body.text, body.note)


@app.post("/inspect-receipt")
async def inspect_receipt(
    tag: str = Form(...),
    amount_usd: float = Form(...),
    note: str = Form(""),
    proof: UploadFile = File(...),
):
    data = await proof.read()
    verdict, reason = strict_proof_check(
        tag, amount_usd, proof.filename or "", len(data), note
    )
    return {
        "verdict": verdict,
        "reason": reason,
        "filename": proof.filename,
        "file_size": len(data),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
