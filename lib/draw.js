import { FORMATS, INK, MUTED, DOTS, W, H, PT, LAYOUT } from './formats';

export function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx, text, maxW) {
  const out = [];
  let line = '';
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch === ' ' ? '' : ch; }
    else line += ch;
  }
  out.push(line);
  return out;
}

const font = (px, bold) => `${bold ? 700 : 400} ${px}px "Noto Sans KR", sans-serif`;

// data: { format, date, title, info:[{label,value}], body:[문단], photos:[Image] }
export function drawNewsletter(ctx, data, assets) {
  const f = FORMATS[data.format] || FORMATS.news;
  const { x, w } = LAYOUT;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = f.bg; ctx.fillRect(0, 0, W, H);

  if (f.tri) {
    [[56, DOTS[0]], [70, DOTS[1]], [85, DOTS[2]]].forEach(([m, c]) => {
      ctx.strokeStyle = c; ctx.lineWidth = 3;
      rr(ctx, m, m, W - m * 2, H - m * 2, 22); ctx.stroke();
    });
  } else if (f.frame) {
    ctx.strokeStyle = f.frame; ctx.lineWidth = 2;
    rr(ctx, 64, 64, W - 128, H - 128, 18); ctx.stroke();
  }

  // 헤더
  const wm = assets.wordmark;
  if (wm) {
    const hh = LAYOUT.headerH, ww = wm.width / wm.height * hh;
    ctx.drawImage(wm, x, LAYOUT.headerY, ww, hh);
  }
  ctx.fillStyle = INK; ctx.textBaseline = 'middle';
  ctx.font = font(13 * PT, true);
  ctx.fillText(`소식 | ${data.date}`, x + 232, LAYOUT.headerY + LAYOUT.headerH / 2);

  // 카테고리 태그 (오른쪽)
  ctx.textAlign = 'right';
  const tagY = LAYOUT.headerY + LAYOUT.headerH / 2;
  ctx.font = font(13.5 * PT, true);
  const tagText = data.tag || f.tag;
  ctx.fillStyle = INK;
  ctx.fillText(tagText, x + w, tagY);
  const tw = ctx.measureText(tagText).width;
  ctx.textAlign = 'left';
  DOTS.forEach((c, i) => {
    ctx.fillStyle = c; ctx.beginPath();
    ctx.arc(x + w - tw - 74 + i * 26, tagY, 9, 0, Math.PI * 2); ctx.fill();
  });

  if (!f.tri) {
    ctx.strokeStyle = 'rgba(30,42,68,.16)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, LAYOUT.lineY); ctx.lineTo(x + w, LAYOUT.lineY); ctx.stroke();
  }

  // 제목 (26~30pt, 최대 두 줄)
  ctx.fillStyle = INK; ctx.textBaseline = 'top';
  let titleSize = 30 * PT;
  let lines = [];
  for (; titleSize >= 24 * PT; titleSize -= 2) {
    ctx.font = font(titleSize, true);
    lines = wrap(ctx, data.title, w);
    if (lines.length <= 2) break;
  }
  ctx.font = font(titleSize, true);
  let y = LAYOUT.titleY;
  lines.slice(0, 2).forEach(l => { ctx.fillText(l, x, y); y += titleSize * 1.28; });

  // 정보줄 15pt, 라벨 bold
  y = Math.max(LAYOUT.bodyTop, y + 26);
  const infoSize = 15 * PT;
  data.info.filter(i => i.value).forEach(i => {
    ctx.font = font(infoSize, true); ctx.fillStyle = MUTED;
    const lw = ctx.measureText(i.label).width;
    ctx.fillText(i.label, x, y);
    ctx.font = font(infoSize, false);
    wrap(ctx, i.value, w - lw - 24).forEach((l, k) => {
      ctx.fillText(l, x + lw + 24, y); if (k < 99) y += infoSize * 1.35;
    });
    y += 6;
  });

  // 사진 (있으면 본문 아래에 자리를 잡아둔다)
  const photos = (data.photos || []).slice(0, 5);
  const photoH = photos.length ? (photos.length === 1 ? 420 : 760) : 0;
  const bodyBottom = LAYOUT.bodyBottom - photoH - (photos.length ? 30 : 0);

  // 본문 — 남는 높이에 맞춰 16~18pt 사이에서 자동 조절
  const bodyTop = y + 24;
  let size = (photos.length ? 16 : 17.5) * PT, lh = 1.5, gap = 13 * PT;
  const fits = (s) => {
    ctx.font = font(s, false);
    let total = 0;
    data.body.forEach(p => { total += wrap(ctx, p, w).length * s * lh + gap; });
    return total <= bodyBottom - bodyTop;
  };
  while (size > 12 * PT && !fits(size)) size -= PT * 0.5;
  ctx.font = font(size, false); ctx.fillStyle = INK;
  y = bodyTop;
  data.body.forEach(p => {
    wrap(ctx, p, w).forEach(l => { ctx.fillText(l, x, y); y += size * lh; });
    y += gap;
  });

  // 사진 배치 — 큰 사진 1장 + 2x2
  if (photos.length) {
    const top = LAYOUT.bodyBottom - photoH;
    const gapP = 18;
    const cell = (img, cx, cy, cw, ch) => {
      ctx.save(); rr(ctx, cx, cy, cw, ch, 8); ctx.clip();
      const s = Math.max(cw / img.width, ch / img.height);
      const sw = cw / s, sh = ch / s;
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) * 0.38, sw, sh, cx, cy, cw, ch);
      ctx.restore();
    };
    if (photos.length === 1) {
      cell(photos[0], x, top, w, photoH);
    } else {
      const bigH = 420;
      cell(photos[0], x, top, w, bigH);
      const rest = photos.slice(1);
      const cw = (w - gapP) / 2, ch = (photoH - bigH - gapP * 2) / 2;
      rest.forEach((p, i) => {
        const cx = x + (i % 2) * (cw + gapP);
        const cy = top + bigH + gapP + Math.floor(i / 2) * (ch + gapP);
        cell(p, cx, cy, cw, ch);
      });
    }
  }

  // 하단 로고
  const lg = assets.logo;
  if (lg) {
    const lw = LAYOUT.logoW, lh2 = lg.height / lg.width * lw;
    ctx.drawImage(lg, (W - lw) / 2, LAYOUT.logoY, lw, lh2);
  }
}
