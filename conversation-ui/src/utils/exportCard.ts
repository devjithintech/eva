/**
 * Card export: renders a card's DOM to JPEG (html2canvas), wraps that image
 * into a PDF (jsPDF), or emits a Word-compatible HTML file as .doc. Used by
 * the Download dropdown on both card chromes (ResultCard + LightAssist card).
 *
 * html2canvas + jspdf are ~600KB minified, so they're imported lazily —
 * loaded (and cached) on the first Download click, never in the main bundle.
 */

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "card";

function save(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Rasterize the card at 2x for crisp output; white background so JPEG (no alpha) looks right. */
async function renderCanvas(el: HTMLElement): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas");
  return html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
}

export async function exportCardJpeg(el: HTMLElement, title: string): Promise<void> {
  const canvas = await renderCanvas(el);
  canvas.toBlob((b) => b && save(b, `${slug(title)}.jpg`), "image/jpeg", 0.92);
}

export async function exportCardPdf(el: HTMLElement, title: string): Promise<void> {
  const canvas = await renderCanvas(el);
  const img = canvas.toDataURL("image/jpeg", 0.92);

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: canvas.width > canvas.height ? "l" : "p" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const imgW = pageW - margin * 2;
  const imgH = (canvas.height * imgW) / canvas.width;

  // Tile a tall card across pages by re-drawing the image at a negative offset.
  let heightLeft = imgH;
  let position = margin;
  pdf.addImage(img, "JPEG", margin, position, imgW, imgH);
  heightLeft -= pageH - margin * 2;
  while (heightLeft > 0) {
    pdf.addPage();
    position = margin - (imgH - heightLeft);
    pdf.addImage(img, "JPEG", margin, position, imgW, imgH);
    heightLeft -= pageH - margin * 2;
  }
  pdf.save(`${slug(title)}.pdf`);
}

export function exportCardDoc(el: HTMLElement, title: string): void {
  // Word opens HTML saved as .doc — include a minimal style block so tables read.
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>${title}</title><style>
body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1d23; }
h1 { font-size: 16pt; } h2, h3 { font-size: 13pt; }
table { border-collapse: collapse; }
td, th { border: 1px solid #c9ccd1; padding: 5pt 9pt; font-size: 10.5pt; }
</style></head>
<body><h1>${title}</h1>${el.innerHTML}</body></html>`;
  save(new Blob(["﻿", html], { type: "application/msword" }), `${slug(title)}.doc`);
}
