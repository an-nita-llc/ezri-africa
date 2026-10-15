"""Reset demo ledger with 2 clean takes for the video. Run: python seed_demo.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
db = os.path.join(os.path.dirname(__file__), "ezri.db")
if os.path.exists(db):
    os.remove(db)

from ledger import create_escrow, update_escrow

a = create_escrow(60, "SCHOOL", "semester fees for mom", "mom", 10)
update_escrow(a["id"], paypal_order_id="MOCK-ORDER-VIDEO1", paypal_capture_id="MOCK-CAPTURE-VIDEO1",
              provider="MTN", provider_number="0881234567", verdict="PASS",
              verdict_reason="School invoice verified.", mock_momo_txn_id="MOCK-MOMO-VIDEO1", status="RELEASED")
b = create_escrow(25, "FOOD", "rice for mom", "mom", 10)
update_escrow(b["id"], paypal_order_id="MOCK-ORDER-VIDEO2", paypal_capture_id="MOCK-CAPTURE-VIDEO2",
              provider="ORANGE", provider_number="0771234567", verdict="FAIL",
              verdict_reason="Paper does not look like FOOD.", status="NEEDS_RETRY")
print(f"seeded: {a['id']} RELEASED, {b['id']} NEEDS_RETRY")
