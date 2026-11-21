'use client';
import { useEffect, useRef, useState } from 'react';
import { cropSource, defaultCrop } from '../lib/collage';

// ---- 사진 한 장에서 쓸 영역 고르기 (끌어서 옮기고, 막대나 두 손가락으로 확대) ----
export default function CropEditor({ img, cell, initial, onDone, onClose }) {
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

