import { FORMATS, INK, MUTED, DOTS, W, H, PT, LAYOUT } from './formats.js';

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
const PH = '#AEB4C0'; // 입력 안내 글자색 (수정 화면에서만 보임)
const PH_TEXT = { title: '제목을 입력하세요', body: '본문을 입력하세요', info: (label) => `${label}을(를) 입력하세요` };

// data: { format, date, title, info:[{key,label,value}], body:[문단], photos:[Image], edit?:bool }
// edit=true 이면 비어 있는 칸에 안내 문구를 연하게 보여 줍니다(저장본에는 넣지 않음).
// data.items: 순서대로 쌓을 항목 [{key,kind:'title'|'info',label,value}], data.dateOn: 날짜 표시 여부
// 반환값: { regions: 직접 고칠 수 있는 영역 [{key,x,y,w,h,fs,lh,bold,single}], meta: {titleOverflow, bodyOverflow, bodyPt} }
export function drawNewsletter(ctx, data, assets) {
  const f = FORMATS[data.format] || FORMATS.news;
  const { x, w } = LAYOUT;
  const regions = [];

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
  ctx.font = font(15 * PT, true);
  const dateOn = data.dateOn !== false;
  ctx.fillText(dateOn ? `소식 | ${data.date}` : '소식', x + 232, LAYOUT.headerY + LAYOUT.headerH / 2);
  if (dateOn) {
    const pre = ctx.measureText('소식 | ').width;
    const dw = Math.max(ctx.measureText(data.date).width + 16, 150);
    regions.push({ key: 'date', x: x + 232 + pre - 8, y: LAYOUT.headerY + 6, w: dw, h: LAYOUT.headerH - 12, fs: 15 * PT, lh: 1.2, bold: true, single: true });
  }

  // 카테고리 태그 (오른쪽)
  ctx.textAlign = 'right';
  const tagY = LAYOUT.headerY + LAYOUT.headerH / 2;
  ctx.font = font(15 * PT, true);
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

  // 제목·정보줄을 정해진 순서대로 쌓는다 (제목 26~30pt 최대 두 줄, 정보줄 15pt 라벨 bold)
  ctx.textBaseline = 'top';
  let y = LAYOUT.titleY;
  const infoSize = 15 * PT;
  const meta = { titleOverflow: false, bodyOverflow: false, bodyPt: 0 };
  (data.items || []).forEach((it, idx) => {
    if (!it.value && !data.edit) return;
    if (it.kind === 'title') {
      let size = 30 * PT, lines = [];
      const text = it.value || PH_TEXT.title;
      for (; size >= 24 * PT; size -= 2) {
        ctx.font = font(size, true);
        lines = wrap(ctx, text, w);
        if (lines.length <= 2) break;
      }
      if (lines.length > 2) meta.titleOverflow = true;
      ctx.font = font(size, true);
      ctx.fillStyle = it.value ? INK : PH;
      const top = y, shown = lines.slice(0, 2);
      shown.forEach(l => { ctx.fillText(l, x, y); y += size * 1.28; });
      regions.push({ key: it.key, x, y: top, w, h: Math.max(shown.length, 1) * size * 1.28, fs: size, lh: 1.28, bold: true, single: true });
      y = Math.max(LAYOUT.bodyTop, y + 26);
    } else {
      ctx.font = font(infoSize, true); ctx.fillStyle = MUTED;
      const lw = ctx.measureText(it.label).width;
      ctx.fillText(it.label, x, y);
      ctx.font = font(infoSize, false);
      ctx.fillStyle = it.value ? MUTED : PH;
      const rowTop = y;
      wrap(ctx, it.value || PH_TEXT.info(it.label), w - lw - 24).forEach((l) => {
        ctx.fillText(l, x + lw + 24, y); y += infoSize * 1.35;
      });
      regions.push({ key: it.key, x: x + lw + 24, y: rowTop, w: w - lw - 24, h: y - rowTop, fs: infoSize, lh: 1.35, bold: false, single: true });
      y += 6;
    }
  });

  // 사진 (있으면 본문 아래에 자리를 잡아둔다)
  const photos = (data.photos || []).slice(0, 5);
  const photoH = photos.length ? (photos.length === 1 ? 420 : 760) : 0;
  const bodyBottom = LAYOUT.bodyBottom - photoH - (photos.length ? 30 : 0);

  // 본문 — 남는 높이에 맞춰 16~18pt 사이에서 자동 조절
  const bodyTop = y + 24;
  const bodyEmpty = !data.body.length;
  const paras = bodyEmpty ? (data.edit ? [PH_TEXT.body] : []) : data.body;
  let size = (photos.length ? 17 : 19) * PT, lh = 1.5, gap = 13 * PT;
  const fits = (s) => {
    ctx.font = font(s, false);
    let total = 0;
    paras.forEach(p => { total += wrap(ctx, p, w).length * s * lh + gap; });
    return total <= bodyBottom - bodyTop;
  };
  while (size > 13 * PT && !fits(size)) size -= PT * 0.5;
  meta.bodyOverflow = !fits(size) || bodyBottom - bodyTop < 60;
  meta.bodyPt = Math.round(size / PT * 2) / 2;
  ctx.font = font(size, false); ctx.fillStyle = bodyEmpty ? PH : INK;
  y = bodyTop;
  paras.forEach(p => {
    wrap(ctx, p, w).forEach(l => {
      if (y + size <= bodyBottom + 4) ctx.fillText(l, x, y); // 넘치는 줄은 그리지 않는다 (한 장을 넘기지 않음)
      y += size * lh;
    });
    y += gap;
  });
  regions.push({ key: 'body', x, y: bodyTop, w, h: Math.max(bodyBottom - bodyTop, 120), fs: size, lh, bold: false, single: false });

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

  return { regions, meta };
}
