"""Cloudflare R2 Object Storage Helper for Bill Photo Proof Files.
Uses boto3 S3 client with CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID,
CLOUDFLARE_R2_SECRET_ACCESS_KEY, and CLOUDFLARE_R2_BUCKET_NAME.
"""
from __future__ import annotations
import os
import boto3
from botocore.config import Config

R2_ACCOUNT_ID = os.environ.get("CLOUDFLARE_R2_ACCOUNT_ID", "").strip()
R2_ACCESS_KEY_ID = os.environ.get("CLOUDFLARE_R2_ACCESS_KEY_ID", "").strip()
R2_SECRET_ACCESS_KEY = os.environ.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY", "").strip()
R2_BUCKET = os.environ.get("CLOUDFLARE_R2_BUCKET_NAME", "ezri-proofs").strip()

_s3_client = None


def get_r2_client():
    global _s3_client
    if _s3_client:
        return _s3_client

    if R2_ACCOUNT_ID and R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY:
        try:
            endpoint_url = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
            _s3_client = boto3.client(
                "s3",
                endpoint_url=endpoint_url,
                aws_access_key_id=R2_ACCESS_KEY_ID,
                aws_secret_access_key=R2_SECRET_ACCESS_KEY,
                config=Config(signature_version="s3v4"),
            )
            return _s3_client
        except Exception as e:
            print(f"[Cloudflare R2 Error] Client initialization failed: {e}")

    return None


async def upload_proof_to_r2(filename: str, content: bytes, content_type: str = "image/jpeg") -> str | None:
    client = get_r2_client()
    if not client:
        return None

    try:
        client.put_object(
            Bucket=R2_BUCKET,
            Key=filename,
            Body=content,
            ContentType=content_type,
        )
        return f"https://{R2_BUCKET}.r2.cloudflarestorage.com/{filename}"
    except Exception as e:
        print(f"[Cloudflare R2 Upload Error] {e}")
        return None
