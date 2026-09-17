export const SIZE = { W: 1080, H: 1350, PAD: 46, GAP: 14, LOGOW: 300 };

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function layout(n, x, y, w, h, gap) {
  if (n === 1) return [[x, y, w, h]];
  if (n === 2) { const ch = (h - gap) / 2; return [[x, y, w, ch], [x, y + ch + gap, w, ch]]; }
  if (n === 3) {
    const top = h * 0.54, bot = h - top - gap, cw = (w - gap) / 2;
    return [[x, y, w, top], [x, y + top + gap, cw, bot], [x + cw + gap, y + top + gap, cw, bot]];
  }
  const cw = (w - gap) / 2, ch = (h - gap) / 2;
  return [[x, y, cw, ch], [x + cw + gap, y, cw, ch], [x, y + ch + gap, cw, ch], [x + cw + gap, y + ch + gap, cw, ch]];
}

export function drawCollage(canvas, imgs, { bg = '#E9EDF3', fit = 'cover', logo = null } = {}) {
  const { W, H, PAD, GAP, LOGOW } = SIZE;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(30,42,68,.16)'; ctx.lineWidth = 2;
  rr(ctx, 20, 20, W - 40, H - 40, 18); ctx.stroke();

  const logoH = logo ? LOGOW * logo.height / logo.width : 40;
  const areaY = PAD, areaH = H - PAD - logoH - 30 - PAD;

  layout(imgs.length, PAD, areaY, W - PAD * 2, areaH, GAP).forEach((r, i) => {
    const [x, y, w, h] = r, img = imgs[i];
    ctx.save(); rr(ctx, x, y, w, h, 10); ctx.clip();
    ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h);
    if (img) {
      if (fit === 'cover') {
        const s = Math.max(w / img.width, h / img.height);
        const sw = w / s, sh = h / s;
        const bias = img.width / img.height < w / h ? 0.30 : 0.45;
        ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) * bias, sw, sh, x, y, w, h);
      } else {
        const s = Math.min(w / img.width, h / img.height);
        const dw = img.width * s, dh = img.height * s;
        ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
      }
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(30,42,68,.14)'; ctx.lineWidth = 2;
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 10); ctx.stroke();
  });

  if (logo) ctx.drawImage(logo, (W - LOGOW) / 2, H - PAD - logoH + 6, LOGOW, logoH);
  return canvas;
}
