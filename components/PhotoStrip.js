'use client';
import { useRef } from 'react';

// 고른 사진 목록: 순서 바꾸기 · 자르기 · 바꾸기 · 빼기
export default function PhotoStrip({ imgs, onMove, onCrop, onReplace, onRemove }) {
  const fileRef = useRef(null);
  const target = useRef(0);
  if (!imgs.length) return null;
  return (
    <ul className="plist">
      {imgs.map((im, i) => (
        <li key={im.src + i} className="prow">
          <span className="pthumb"><img src={im.src} alt="" /><b>{i + 1}</b></span>
          <span className="pctl">
            <button type="button" className="mini" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label={`${i + 1}번 사진 앞으로`}>▲</button>
            <button type="button" className="mini" disabled={i === imgs.length - 1} onClick={() => onMove(i, 1)} aria-label={`${i + 1}번 사진 뒤로`}>▼</button>
            {onCrop && <button type="button" className="mini" onClick={() => onCrop(i)} aria-label={`${i + 1}번 사진 자르기`}>자르기</button>}
            <button type="button" className="mini" onClick={() => { target.current = i; fileRef.current.click(); }} aria-label={`${i + 1}번 사진 바꾸기`}>바꾸기</button>
            <button type="button" className="mini" onClick={() => onRemove(i)} aria-label={`${i + 1}번 사진 빼기`}>빼기</button>
          </span>
        </li>
      ))}
      <input ref={fileRef} type="file" accept="image/*" hidden
        onChange={(e) => { if (e.target.files[0]) onReplace(target.current, e.target.files[0]); e.target.value = ''; }} />
    </ul>
  );
}
