"""Devpost thumbnail generator — text-only, no third-party logos.
Run: python make_thumbnail.py  -> assets/thumbnail.png (1200x800)
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 800
BG, GREEN, MUTED, WHITE = (11, 18, 32), (46, 125, 50), (140, 155, 175), (245, 247, 250)


def font(size: int, bold: bool = True):
    path = r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf"
    return ImageFont.truetype(path, size)


img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)
d.rectangle([0, 0, W, 14], fill=GREEN)
d.text((80, 120), "Ezri Africa", font=font(120), fill=WHITE)
d.text((80, 260), "Proof Before Payout", font=font(64), fill=GREEN)
d.text((80, 360), "Chat, lock, prove. Protected mobile money", font=font(36, False), fill=WHITE)
d.text((80, 415), "with AI verification and escrow.", font=font(36, False), fill=WHITE)
for i, chip in enumerate(["CHAT", "LOCK", "PROVE"]):
    x = 80 + i * 220
    d.rounded_rectangle([x, 520, x + 190, 590], radius=18, fill=(22, 35, 59), outline=GREEN, width=3)
    bb = d.textbbox((0, 0), chip, font=font(36))
    d.text((x + (190 - (bb[2] - bb[0])) / 2, 532), chip, font=font(36), fill=WHITE)
d.text((80, 700), "PayPal AI Hackathon entry  -  Built for Africa", font=font(28, False), fill=MUTED)
img.save("assets/thumbnail.png")
print("wrote assets/thumbnail.png")
