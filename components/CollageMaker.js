'use client';
import { useEffect, useRef, useState } from 'react';
import { drawCollage } from '../lib/collage';
import { loadImage } from '../lib/draw';

const BGS = [
  { v: '#E9EDF3', label: '청회색' },
  { v: '#FBEEEC', label: '연분홍' },
  { v: '#FFFFFF', label: '흰색' },
];

export default function CollageMaker() {
  const [imgs, setImgs] = useState([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} (${'일월화수목금토'[d.getDay()]})`;
  });
  const [bg, setBg] = useState('#E9EDF3');
  const [fit, setFit] = useState('cover');
  const [logo, setLogo] = useState(null);
  const [outs, setOuts] = useState([]);
  const fileRef = useRef(null);
  const anyRef = useRef(null);

  useEffect(() => { loadImage('/sda-logo.png').then(setLogo).catch(() => {}); }, []);

  useEffect(() => {
    if (!imgs.length) { setOuts([]); return; }
    const res = [];
    for (let i = 0; i < imgs.length; i += 4) {
      const c = document.createElement('canvas');
      drawCollage(c, imgs.slice(i, i + 4), { bg, fit, logo, title, date });
      res.push(c.toDataURL('image/jpeg', 0.92));
    }
    setOuts(res);
  }, [imgs, bg, fit, logo, title, date]);

  const take = (files) => {
    const list = [...files].filter(f => f.type.startsWith('image/'));
    if (!list.length) return;
    Promise.all(list.map(f => loadImage(URL.createObjectURL(f)))).then(setImgs);
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

  const save = (src, i) => {
    const a = document.createElement('a');
    a.download = `SDA_collage_${i + 1}.jpg`;
    a.href = src; a.click();
  };

  return (
    <>
      <div className="panel">
        <button className="btn" type="button" onClick={() => fileRef.current.click()}>갤러리에서 사진 고르기</button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/*"
          multiple hidden onChange={e => take(e.target.files)} />
        <div className="btns">
          <button className="btn alt" type="button" onClick={() => anyRef.current.click()}>파일에서 고르기</button>
        </div>
        <input ref={anyRef} type="file" multiple hidden onChange={e => take(e.target.files)} />
        <p className="hint">
          {imgs.length
            ? `${imgs.length}장 선택됨 · 콜라주 ${Math.ceil(imgs.length / 4)}장`
            : '고른 순서대로 4장씩 묶습니다 · 사진을 복사해 붙여넣거나 끌어다 놓아도 됩니다'}
        </p>

        <div className="field" style={{ marginTop: 16 }}>
          <label>제목 (한 줄)</label>
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
        <div className="field">
          <label>사진 채우기</label>
          <div className="row">
            <button type="button" className="chip" aria-pressed={fit === 'cover'} onClick={() => setFit('cover')}>꽉 채우기</button>
            <button type="button" className="chip" aria-pressed={fit === 'contain'} onClick={() => setFit('contain')}>전부 보이기</button>
          </div>
        </div>
      </div>

      <div className="out">
        {outs.map((src, i) => (
          <figure key={i}>
            <img src={src} alt={`콜라주 ${i + 1}`} />
            <figcaption>
              <span>콜라주 {i + 1}</span>
              <button className="chip" type="button" onClick={() => save(src, i)}>저장</button>
            </figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}
