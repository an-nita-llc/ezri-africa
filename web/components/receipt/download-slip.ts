/**
 * Fortune 500 Remittance Canvas Image Slip Generator.
 * Renders Ezri Africa logo, financial data, and "Protected by Ezri" footer into a high-res PNG
 * image file that saves directly to mobile phone galleries (iOS & Android) or desktop downloads.
 */

import { USD_LRD } from "@/app/fx";

export function downloadRemittanceSlipAsImage(
  escrowRecord: any,
  sessionName: string,
  sessionEmail: string
) {
  if (!escrowRecord) return;

  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 860;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const amount = Number(escrowRecord.amount_usd) || 60;
  const fee = Number(escrowRecord.fee_usd) || amount * 0.02;
  const total = amount + fee;
  const lrd = amount * USD_LRD;
  const eid = escrowRecord.escrow_id || escrowRecord.id || "EZR-8F32A1";
  const tag = escrowRecord.tag || "SCHOOL";
  const note = escrowRecord.note || "Purpose-locked remittance";
  const status = escrowRecord.status || "HELD";

  const renderReceipt = (logoImg?: HTMLImageElement) => {
    // 1. Background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, 640, 860);

    // 2. Deep Navy Header
    ctx.fillStyle = "#003868";
    ctx.fillRect(0, 0, 640, 150);

    // 3. Orange Accent Line
    ctx.fillStyle = "#ea580c";
    ctx.fillRect(0, 0, 640, 8);

    // 4. Logo Image
    if (logoImg) {
      try {
        ctx.drawImage(logoImg, 30, 26, 48, 48);
      } catch {}
    }

    // 5. Header Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("EZRI AFRICA", logoImg ? 90 : 30, 50);

    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#d9e4f1";
    ctx.fillText("Official Remittance Escrow Receipt", logoImg ? 90 : 30, 72);

    ctx.font = "bold 12px monospace";
    ctx.fillStyle = "#f26522";
    ctx.fillText(`SESSION: ${eid}`, 30, 120);

    // 6. Status Badge on Header Right
    ctx.fillStyle = status === "RELEASED" ? "#00a651" : "#ea580c";
    ctx.beginPath();
    ctx.roundRect(450, 38, 150, 36, 18);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(status, 525, 60);
    ctx.textAlign = "left";

    // 7. Main Receipt Voucher Container
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(30, 170, 580, 620, 20);
    ctx.fill();
    ctx.stroke();

    let y = 210;

    // Section 1: Sender & Purpose
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("SENDER & PURPOSE DETAILS", 55, y);
    y += 26;

    ctx.fillStyle = "#0f172a";
    ctx.font = "13px sans-serif";
    ctx.fillText(`Sender Name:  ${sessionName || "Demo Sender"}`, 55, y);
    y += 22;
    ctx.fillText(`Sender Email: ${sessionEmail || "demo@ezri.africa"}`, 55, y);
    y += 22;
    ctx.fillText(`Purpose Tag:  ${tag}`, 55, y);
    y += 22;
    ctx.fillText(`Note:         ${note}`, 55, y);
    y += 28;

    // Divider
    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(55, y);
    ctx.lineTo(585, y);
    ctx.stroke();
    y += 26;

    // Section 2: Financial Breakdown
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("FINANCIAL BREAKDOWN", 55, y);
    y += 26;

    ctx.fillStyle = "#0f172a";
    ctx.font = "13px sans-serif";
    ctx.fillText(`Transfer Amount:       $${amount.toFixed(2)} USD`, 55, y);
    y += 22;
    ctx.fillText(`Ezri Fee (2%):         $${fee.toFixed(2)} USD`, 55, y);
    y += 22;

    ctx.font = "bold 15px sans-serif";
    ctx.fillStyle = "#ea580c";
    ctx.fillText(`Total Charged:         $${total.toFixed(2)} USD`, 55, y);
    y += 30;

    ctx.fillStyle = "#0b4d8f";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(`Exchange Rate:         1 USD = ${USD_LRD.toFixed(2)} LRD`, 55, y);
    y += 22;

    ctx.fillStyle = "#007a3d";
    ctx.font = "bold 17px sans-serif";
    ctx.fillText(`Guaranteed Local Payout: ${lrd.toLocaleString()} LRD`, 55, y);
    y += 35;

    // Divider
    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(55, y);
    ctx.lineTo(585, y);
    ctx.stroke();
    y += 26;

    // Section 3: Receiver Claim Instructions
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("RECEIVER CLAIM INSTRUCTIONS", 55, y);
    y += 24;

    ctx.fillStyle = "#0f172a";
    ctx.font = "12px monospace";
    const claimUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/claim/${eid}`;
    ctx.fillText(`Claim Link: ${claimUrl}`, 55, y);
    y += 24;

    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#475569";
    ctx.fillText("1. Open the claim link in any mobile or desktop browser.", 55, y);
    y += 20;
    ctx.fillText("2. Select receiving provider (Mobile Money or Bank Wire).", 55, y);
    y += 20;
    ctx.fillText("3. Upload bill or receipt photo for deterministic proof verification.", 55, y);
    y += 20;
    ctx.fillText("4. Payout is disbursed automatically upon proof PASS.", 55, y);

    // Footer - Updated to Protected by Ezri
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Protected by Ezri Purpose-Locked Escrow & deterministic proof guard", 320, 825);

    // Export & Native Mobile Gallery Image Save Trigger
    const dataUrl = canvas.toDataURL("image/png");
    const filename = `Ezri-Remittance-Receipt-${eid}.png`;

    const link = document.createElement("a");
    link.href = dataUrl;
    link.setAttribute("download", filename);
    link.setAttribute("target", "_blank");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Load logo image
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => renderReceipt(img);
  img.onerror = () => renderReceipt();
  img.src = "/brand/annita-mark.png";
}
