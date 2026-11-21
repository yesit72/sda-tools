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

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// 사진마다 고르는 영역: z = 확대(1 이상), fx/fy = 보이는 창의 위치(0~1)
export function defaultCrop(img, w, h) {
  return { z: 1, fx: 0.5, fy: img.width / img.height < w / h ? 0.30 : 0.45 };
}

// 원본에서 잘라 쓸 영역 [sx, sy, sw, sh]
export function cropSource(img, w, h, c) {
  const z = Math.max(1, c?.z ?? 1);
  const s = Math.max(w / img.width, h / img.height) * z;
  const sw = w / s, sh = h / s;
  return [(img.width - sw) * clamp(c?.fx ?? 0.5), (img.height - sh) * clamp(c?.fy ?? 0.4), sw, sh];
}

// 사진 칸의 위치 (미리보기 위에 누를 자리를 만들 때도 같이 씁니다)
export function collageCells(n, { logo = null, title = '' } = {}) {
  const { W, H, PAD, GAP, LOGOW } = SIZE;
  const top = PAD + (title ? 68 : 0);
  const logoH = logo ? LOGOW * logo.height / logo.width : 36;
  const footY = H - PAD - logoH;
  const areaY = top + 10, areaH = footY - 26 - areaY;
  return { cells: layout(n, PAD, areaY, W - PAD * 2, areaH, GAP), footY, logoH, top: PAD };
}

// crops: 사진별 자르기 값 배열 (없으면 기본 자르기)
export function drawCollage(canvas, imgs, opts = {}) {
  const { bg = '#E9EDF3', logo = null, title = '', date = '', crops = [] } = opts;
  const { W, H, PAD, LOGOW } = SIZE;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const F = (px, bold) => `${bold ? 900 : 400} ${px}px "Noto Sans KR", sans-serif`;

  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  if (title) {
    ctx.fillStyle = '#1E2A44'; ctx.font = F(44, true); ctx.textBaseline = 'top';
    ctx.fillText(title, PAD, PAD);
  }

  const { cells, footY, logoH } = collageCells(imgs.length, { logo, title });
  cells.forEach((r, i) => {
    const [x, y, w, h] = r, img = imgs[i];
    ctx.save(); rr(ctx, x, y, w, h, 8); ctx.clip();
    ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h);
    if (img) {
      const [sx, sy, sw, sh] = cropSource(img, w, h, crops[i] || defaultCrop(img, w, h));
      ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
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
  return cells;
}
