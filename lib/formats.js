// 소식지 3종 포맷 정의 — 색과 테두리만 다르고 조판 규칙은 같다.
export const FORMATS = {
  news:  { key:'news',  label:'소식(지)',       bg:'#FFFFFF', tag:'소식',           tri:true  },
  tour:  { key:'tour',  label:'미술관 탐방',     bg:'#E9EDF3', tag:'미술관 탐방',     frame:'#BCC2CD' },
  study: { key:'study', label:'목요미술스터디',   bg:'#FBEEEC', tag:'목요미술스터디',   frame:'#CAC3C7' },
};

export const INK = '#1E2A44';
export const MUTED = '#5A6275';
export const DOTS = ['#FE0106', '#0AAF50', '#0000FE'];

// 슬라이드 7.5 x 12.6in 를 1200px 폭으로 옮긴 값 (1pt = 2.222px)
export const W = 1200, H = 2017, PT = 1200 / 540;
export const LAYOUT = {
  x: 152, w: 896,
  headerY: 136, headerH: 71,
  lineY: 247,
  titleY: 295,
  bodyTop: 448,
  bodyBottom: 1700,
  logoY: 1743, logoW: 640,
};
