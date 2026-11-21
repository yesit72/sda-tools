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

// 줄바꿈은 브라우저가 직접 계산하게 맡깁니다. 수정 칸(textarea)과 똑같은 CSS를 건 숨은 상자에 글을 넣고,
// 각 줄이 어디서 끊기는지 읽어 옵니다. (괄호·가운뎃점·따옴표 같은 문장부호의 끊김 규칙까지 수정 화면과 같아집니다.)
let measurer = null;
function setupMeasurer(text, px, bold, lh, width) {
  if (!measurer) {
    measurer = document.createElement('div');
    measurer.setAttribute('aria-hidden', 'true');
    Object.assign(measurer.style, {
      position: 'absolute', left: '-99999px', top: '0', visibility: 'hidden', pointerEvents: 'none',
      margin: '0', padding: '0', border: '0', boxSizing: 'border-box', textAlign: 'left', letterSpacing: '0',
      whiteSpace: 'pre-wrap', wordBreak: 'keep-all', overflowWrap: 'anywhere', fontKerning: 'normal',
    });
    document.body.appendChild(measurer);
  }
  measurer.style.width = `${width}px`;
  measurer.style.font = font(px, bold);
  measurer.style.lineHeight = String(lh);
  measurer.textContent = text;
  return measurer;
}

// 몇 줄이 되는지 (글자 크기를 줄여 가며 맞출 때 쓰는 빠른 계산)
function countLines(text, px, bold, lh, width) {
  if (!text) return 1;
  const el = setupMeasurer(text, px, bold, lh, width);
  return Math.max(1, Math.round(el.scrollHeight / (px * lh)));
}

// 실제 줄 목록
function layoutLines(text, px, bold, lh, width) {
  if (!text) return [''];
  const el = setupMeasurer(text, px, bold, lh, width);
  const node = el.firstChild, n = text.length;
  const range = document.createRange();
  const topOf = (i) => {
    for (let k = i; k >= 0; k--) {
      range.setStart(node, k); range.setEnd(node, k + 1);
      const r = range.getClientRects();
      if (r.length) return r[0].top;
    }
    return 0;
  };
  const half = px * lh / 2;
  const starts = [0];
  let cur = topOf(0);
  for (;;) {
    let lo = starts[starts.length - 1] + 1, hi = n; // 현재 줄보다 아래에 있는 첫 글자
    if (lo >= n || topOf(n - 1) <= cur + half) break;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (topOf(mid) > cur + half) hi = mid; else lo = mid + 1;
    }
    starts.push(lo);
    cur = topOf(lo);
  }
  return starts.map((st, k) => text.slice(st, starts[k + 1] ?? n).replace(/\n$/, ''));
}

// 글자를 줄 상자(lineH) 안에 브라우저와 똑같이 앉히는 baseline 위치 (수정 칸과 글자 높이를 맞추기 위함)
function baseY(ctx, top, lineH) {
  const m = ctx.measureText('가');
  const px = parseFloat(ctx.font.match(/([\d.]+)px/)?.[1] || 16);
  const a = m.fontBoundingBoxAscent ?? px * 1.16, d = m.fontBoundingBoxDescent ?? px * 0.288;
  return top + (lineH - (a + d)) / 2 + a;
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
  ctx.fillStyle = INK; ctx.textBaseline = 'alphabetic';
  ctx.font = font(15 * PT, true);
  const dateOn = data.dateOn !== false;
  const headBase = baseY(ctx, LAYOUT.headerY, LAYOUT.headerH);
  ctx.fillText(dateOn ? `소식 | ${data.date}` : '소식', x + 232, headBase);
  if (dateOn) {
    const pre = ctx.measureText('소식 | ').width;
    const dw = Math.max(ctx.measureText(data.date).width, 150);
    regions.push({ key: 'date', x: x + 232 + pre, y: LAYOUT.headerY, w: dw, h: LAYOUT.headerH, fs: 15 * PT, lh: LAYOUT.headerH / (15 * PT), bold: true, single: true });
  }

  // 카테고리 태그 (오른쪽)
  ctx.textAlign = 'right';
  const tagY = LAYOUT.headerY + LAYOUT.headerH / 2;
  ctx.font = font(15 * PT, true);
  const tagText = data.tag || f.tag;
  ctx.fillStyle = INK;
  ctx.fillText(tagText, x + w, headBase);
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
  ctx.textBaseline = 'alphabetic';
  let y = LAYOUT.titleY;
  const infoSize = 15 * PT;
  const meta = { titleOverflow: false, bodyOverflow: false, bodyPt: 0 };
  (data.items || []).forEach((it, idx) => {
    if (!it.value && !data.edit) return;
    if (it.kind === 'title') {
      const text = it.value || PH_TEXT.title;
      let size = 30 * PT;
      while (size > 24 * PT && countLines(text, size, true, 1.28, w) > 2) size -= 2;
      size = Math.max(size, 24 * PT);
      const lines = layoutLines(text, size, true, 1.28, w);
      if (lines.length > 2) meta.titleOverflow = true;
      ctx.font = font(size, true);
      ctx.fillStyle = it.value ? INK : PH;
      const top = y, shown = lines.slice(0, 2);
      shown.forEach(l => { ctx.fillText(l, x, baseY(ctx, y, size * 1.28)); y += size * 1.28; });
      regions.push({ key: it.key, x, y: top, w, h: Math.max(shown.length, 1) * size * 1.28, fs: size, lh: 1.28, bold: true, single: true });
      y = Math.max(LAYOUT.bodyTop, y + 26);
    } else {
      ctx.font = font(infoSize, true); ctx.fillStyle = MUTED;
      const lw = ctx.measureText(it.label).width;
      ctx.font = font(infoSize, true);
      ctx.fillText(it.label, x, baseY(ctx, y, infoSize * 1.35));
      ctx.font = font(infoSize, false);
      ctx.fillStyle = it.value ? MUTED : PH;
      const rowTop = y;
      layoutLines(it.value || PH_TEXT.info(it.label), infoSize, false, 1.35, w - lw - 24).forEach((l) => {
        ctx.fillText(l, x + lw + 24, baseY(ctx, y, infoSize * 1.35)); y += infoSize * 1.35;
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
  const bodyText = (data.body || '').replace(/\s+$/, '');
  const bodyEmpty = !bodyText;
  const text = bodyEmpty ? (data.edit ? PH_TEXT.body : '') : bodyText;
  let size = (photos.length ? 17 : 19) * PT;
  const lh = 1.5;
  const fits = (s) => countLines(text, s, false, lh, w) * s * lh <= bodyBottom - bodyTop;
  while (size > 13 * PT && !fits(size)) size -= PT * 0.5;
  meta.bodyOverflow = !fits(size) || bodyBottom - bodyTop < 60;
  meta.bodyPt = Math.round(size / PT * 2) / 2;
  ctx.font = font(size, false); ctx.fillStyle = bodyEmpty ? PH : INK;
  y = bodyTop;
  layoutLines(text, size, false, lh, w).forEach(l => {
    if (y + size * lh <= bodyBottom + 4) ctx.fillText(l, x, baseY(ctx, y, size * lh)); // 넘치는 줄은 그리지 않는다 (한 장을 넘기지 않음)
    y += size * lh;
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
