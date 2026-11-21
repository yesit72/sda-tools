'use client';
import { useEffect, useRef, useState } from 'react';
import { SIZE, drawCollage, collageCells, cropSource, defaultCrop } from '../lib/collage';
import { loadImage } from '../lib/draw';

const MAX = 4;
const BGS = [
  { v: '#E9EDF3', label: '청회색' },
  { v: '#FBEEEC', label: '연분홍' },
  { v: '#FFFFFF', label: '흰색' },
];

// ---- 사진 한 장에서 쓸 영역 고르기 (끌어서 옮기고, 막대나 두 손가락으로 확대) ----
function CropEditor({ img, cell, initial, onDone, onClose }) {
  const [w, h] = cell;
  const [crop, setCrop] = useState(initial);
  const cvRef = useRef(null);
  const pts = useRef(new Map());
  const pinch = useRef(0);

  const maxW = Math.min(window.innerWidth - 40, 440);
  const maxH = window.innerHeight * 0.52;
  const vh = Math.min(maxH, maxW * h / w);
  const vw = vh * w / h;

  useEffect(() => {
    const c = cvRef.current, dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(vw * dpr); c.height = Math.round(vh * dpr);
    const [sx, sy, sw, sh] = cropSource(img, w, h, crop);
    c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  }, [crop, img, vw, vh, w, h]);

  const clamp = (v) => Math.min(1, Math.max(0, v));
  // 화면에서 dx, dy 만큼 끌면 사진은 그만큼 따라 움직입니다.
  const pan = (dx, dy) => setCrop(c => {
    const [sx0, sy0, sw, sh] = cropSource(img, w, h, c);
    const k = vw / sw; // 원본 1px = 화면 k px
    const ox = img.width - sw, oy = img.height - sh;
    return {
      ...c,
      fx: ox > 0 ? clamp((sx0 - dx / k) / ox) : 0.5,
      fy: oy > 0 ? clamp((sy0 - dy / k) / oy) : 0.5,
    };
  });
  const zoomTo = (z) => setCrop(c => {
    const [sx, sy, sw, sh] = cropSource(img, w, h, c);
    const cx = sx + sw / 2, cy = sy + sh / 2;
    const n = { ...c, z: Math.min(4, Math.max(1, z)) };
    const [, , nw, nh] = cropSource(img, w, h, n);
    const ox = img.width - nw, oy = img.height - nh;
    return {
      ...n,
      fx: ox > 0 ? clamp((cx - nw / 2) / ox) : 0.5,
      fy: oy > 0 ? clamp((cy - nh / 2) / oy) : 0.5,
    };
  });

  const down = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const move = (e) => {
    const p = pts.current.get(e.pointerId);
    if (!p) return;
    const nx = e.clientX, ny = e.clientY;
    if (pts.current.size === 1) {
      pan(nx - p.x, ny - p.y);
    } else if (pts.current.size === 2) {
      pts.current.set(e.pointerId, { x: nx, y: ny });
      const [a, b] = [...pts.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current) zoomTo(crop.z * d / pinch.current);
      pinch.current = d;
      return;
    }
    pts.current.set(e.pointerId, { x: nx, y: ny });
  };
  const up = (e) => { pts.current.delete(e.pointerId); pinch.current = 0; };
  const wheel = (e) => { zoomTo(crop.z * (e.deltaY < 0 ? 1.08 : 1 / 1.08)); };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="사진 영역 고르기">
      <div className="sheet">
        <p className="sheet-title">보여 줄 부분만 남기세요</p>
        <canvas ref={cvRef} className="crop-view"
          style={{ width: vw, height: vh }}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          onWheel={wheel} />
        <p className="hint" style={{ textAlign: 'center' }}>사진을 끌어서 옮기고, 아래 막대로 확대합니다.</p>
        <input type="range" className="zoom" min="1" max="4" step="0.01" value={crop.z}
          aria-label="확대"
          onChange={(e) => zoomTo(parseFloat(e.target.value))} />
        <div className="btns" style={{ flexDirection: 'row' }}>
          <button className="btn alt" type="button" onClick={() => setCrop(defaultCrop(img, w, h))}>처음 상태로</button>
          <button className="btn alt" type="button" onClick={onClose}>취소</button>
          <button className="btn" type="button" onClick={() => onDone(crop)}>적용</button>
        </div>
      </div>
    </div>
  );
}

export default function CollageMaker() {
  const [imgs, setImgs] = useState([]);
  const [crops, setCrops] = useState([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} (${'일월화수목금토'[d.getDay()]})`;
  });
  const [bg, setBg] = useState('#E9EDF3');
  const [logo, setLogo] = useState(null);
  const [step, setStep] = useState('edit'); // edit | final
  const [cropIdx, setCropIdx] = useState(null);
  const [notice, setNotice] = useState('');
  const [saved, setSaved] = useState(false);
  const [scale, setScale] = useState(0.3);
  const fileRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => { loadImage('/sda-logo.png').then(setLogo).catch(() => {}); }, []);

  const opts = { bg, logo, title, date, crops };
  const geom = collageCells(imgs.length, { logo, title });

  useEffect(() => {
    if (!imgs.length || !canvasRef.current) return;
    (async () => { if (document.fonts?.ready) await document.fonts.ready; drawCollage(canvasRef.current, imgs, opts); })();
  }, [imgs, crops, bg, logo, title, date, step]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / SIZE.W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [imgs.length, step]);

  const take = (files) => {
    const list = [...files].filter(f => f.type.startsWith('image/'));
    if (!list.length) return;
    setNotice(list.length > MAX ? `최대 ${MAX}장까지라서 앞의 ${MAX}장만 사용했습니다.` : '');
    Promise.all(list.slice(0, MAX).map(f => loadImage(URL.createObjectURL(f)))).then((im) => {
      setImgs(im); setCrops([]); setStep('edit'); setSaved(false);
    });
  };

  useEffect(() => {
    const onPaste = (e) => { const f = [...(e.clipboardData?.files || [])]; if (f.length) { e.preventDefault(); take(f); } };
    const onDrop = (e) => { e.preventDefault(); if (e.dataTransfer?.files?.length) take(e.dataTransfer.files); };
    const onOver = (e) => e.preventDefault();
    document.addEventListener('paste', onPaste);
    document.addEventListener('drop', onDrop);
    document.addEventListener('dragover', onOver);
    return () => {
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('drop', onDrop);
      document.removeEventListener('dragover', onOver);
    };
  }, []);

  const save = () => {
    canvasRef.current.toBlob((blob) => {
      const a = document.createElement('a');
      a.download = 'SDA_collage.jpg';
      a.href = URL.createObjectURL(blob);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setSaved(true);
    }, 'image/jpeg', 0.92);
  };

  const applyCrop = (c) => {
    setCrops(prev => { const n = [...prev]; n[cropIdx] = c; return n; });
    setCropIdx(null);
  };

  const editing = step === 'edit';

  return (
    <>
      <div className="steps" aria-label="진행 단계">
        <span className="step" aria-current={editing}>1 사진·자르기</span>
        <span className="step" aria-current={!editing}>2 최종 확인</span>
      </div>

      {editing && (
        <div className="panel">
          <button className="btn" type="button" onClick={() => fileRef.current.click()}>
            {imgs.length ? '사진 다시 고르기' : `사진 고르기 (최대 ${MAX}장)`}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden
            onChange={e => { take(e.target.files); e.target.value = ''; }} />
          <p className="hint">
            {imgs.length
              ? `${imgs.length}장 선택됨`
              : '사진을 복사해 붙여넣거나 끌어다 놓아도 됩니다. 4장을 넘기면 앞의 4장만 씁니다.'}
            {notice && <><br />{notice}</>}
          </p>

          <div className="field" style={{ marginTop: 16 }}>
            <label>제목 (한 줄, 비워도 됩니다)</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="함께한 사람들" />
          </div>
          <div className="field">
            <label>날짜</label>
            <input value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>배경</label>
            <div className="row">
              {BGS.map(b => (
                <button key={b.v} type="button" className="chip" aria-pressed={bg === b.v}
                  onClick={() => setBg(b.v)}>{b.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {imgs.length > 0 && (
        <>
          <p className="hint" style={{ margin: '0 0 8px' }}>
            {editing
              ? '점선 칸을 누르면 그 사진에서 남길 부분을 고를 수 있습니다.'
              : '저장될 모습 그대로입니다. 고칠 곳이 없으면 저장하세요.'}
          </p>
          <div className="stage">
            <canvas ref={canvasRef} width={SIZE.W} height={SIZE.H} />
            {editing && geom.cells.map(([x, y, w, h], i) => (
              <button key={i} type="button" className="hit crop-hit"
                style={{ left: x * scale, top: y * scale, width: w * scale, height: h * scale }}
                aria-label={`${i + 1}번 사진 자르기`}
                onClick={() => setCropIdx(i)}>
                <span>{i + 1}번 자르기</span>
              </button>
            ))}
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            {editing ? (
              <div className="btns" style={{ marginTop: 0 }}>
                <button className="btn" type="button" onClick={() => { setStep('final'); setSaved(false); window.scrollTo({ top: 0 }); }}>
                  최종 확인
                </button>
              </div>
            ) : (
              <div className="btns" style={{ marginTop: 0 }}>
                <button className="btn" type="button" onClick={save}>완성 · JPG로 저장</button>
                <button className="btn alt" type="button" onClick={() => setStep('edit')}>수정하러 돌아가기</button>
              </div>
            )}
            {saved && <p className="hint">저장했습니다. 폰에서는 그림을 길게 눌러 저장해도 됩니다.</p>}
          </div>
        </>
      )}

      {cropIdx !== null && imgs[cropIdx] && geom.cells[cropIdx] && (
        <CropEditor
          img={imgs[cropIdx]}
          cell={[geom.cells[cropIdx][2], geom.cells[cropIdx][3]]}
          initial={crops[cropIdx] || defaultCrop(imgs[cropIdx], geom.cells[cropIdx][2], geom.cells[cropIdx][3])}
          onDone={applyCrop}
          onClose={() => setCropIdx(null)}
        />
      )}
    </>
  );
}
