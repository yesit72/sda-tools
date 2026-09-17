export const SIZE = { W: 1200, H: 1600, PAD: 40, GAP: 14, LOGOW: 210 };

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 1장: 전체 / 2장: 위아래 / 3장: 큰 사진 + 아래 둘 / 4장: 큰 사진 + 아래 왼쪽 둘·오른쪽 하나
export function layout(n, x, y, w, h, gap) {
  if (n === 1) return [[x, y, w, h]];
  if (n === 2) { const ch = (h - gap) / 2; return [[x, y, w, ch], [x, y + ch + gap, w, ch]]; }
  if (n === 3) {
    const top = h * 0.55, bot = h - top - gap, cw = (w - gap) / 2;
    return [[x, y, w, top], [x, y + top + gap, cw, bot], [x + cw + gap, y + top + gap, cw, bot]];
  }
  const top = h * 0.48, rest = h - top - gap;
  const lw = w * 0.46, rw = w - lw - gap, ch = (rest - gap) / 2;
  return [
    [x, y, w, top],
    [x, y + top + gap, lw, ch],
    [x, y + top + gap + ch + gap, lw, ch],
    [x + lw + gap, y + top + gap, rw, rest],
  ];
}

export function drawCollage(canvas, imgs, opts = {}) {
  const { bg = '#E9EDF3', fit = 'cover', logo = null, title = '', date = '' } = opts;
  const { W, H, PAD, GAP, LOGOW } = SIZE;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const F = (px, bold) => `${bold ? 900 : 400} ${px}px "Noto Sans KR", sans-serif`;

  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // 제목 (볼드 한 줄)
  let top = PAD;
  if (title) {
    ctx.fillStyle = '#1E2A44'; ctx.font = F(44, true); ctx.textBaseline = 'top';
    ctx.fillText(title, PAD, top);
    top += 68;
  }

  const logoH = logo ? LOGOW * logo.height / logo.width : 36;
  const footY = H - PAD - logoH;
  const areaY = top + 10, areaH = footY - 26 - areaY;

  layout(imgs.length, PAD, areaY, W - PAD * 2, areaH, GAP).forEach((r, i) => {
    const [x, y, w, h] = r, img = imgs[i];
    ctx.save(); rr(ctx, x, y, w, h, 8); ctx.clip();
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
    ctx.strokeStyle = 'rgba(30,42,68,.12)'; ctx.lineWidth = 2;
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 8); ctx.stroke();
  });

  if (logo) ctx.drawImage(logo, PAD, footY, LOGOW, logoH);
  if (date) {
    ctx.fillStyle = '#5A6275'; ctx.font = F(22, false);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(date, W - PAD, footY + logoH / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }
  return canvas;
}
