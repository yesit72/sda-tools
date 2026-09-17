'use client';
import { useEffect, useRef, useState } from 'react';
import { FORMATS, W, H } from '../lib/formats';
import { drawNewsletter, loadImage } from '../lib/draw';
import { buildPptx } from '../lib/pptx';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

export default function NewsletterMaker() {
  const canvasRef = useRef(null);
  const [assets, setAssets] = useState({});
  const [form, setForm] = useState({
    format: 'tour',
    date: today(),
    title: '',
    i1: '', i2: '', i3: '',
    body: '',
  });
  const [photos, setPhotos] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const [wordmark, logo] = await Promise.all([
        loadImage('/sda-wordmark.png'),
        loadImage('/sda-logo.png'),
      ]);
      if (document.fonts?.ready) await document.fonts.ready;
      if (live) { setAssets({ wordmark, logo }); setReady(true); }
    })();
    return () => { live = false; };
  }, []);

  const data = () => ({
    format: form.format,
    date: form.date,
    title: form.title || '제목을 입력하세요',
    info: [
      { label: '일시', value: form.i1 },
      { label: '장소', value: form.i2 },
      { label: '주제', value: form.i3 },
    ],
    body: form.body.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean),
    photos,
  });

  useEffect(() => {
    if (!ready || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    drawNewsletter(ctx, data(), assets);
  }, [ready, assets, form, photos]);

  const pick = (e) => {
    const list = [...e.target.files].filter(f => f.type.startsWith('image/')).slice(0, 5);
    Promise.all(list.map(f => loadImage(URL.createObjectURL(f)))).then(setPhotos);
  };

  const savePng = () => {
    const a = document.createElement('a');
    a.download = `SDA_${form.format}_${form.date}.png`;
    a.href = canvasRef.current.toDataURL('image/png');
    a.click();
  };

  const savePptx = async () => {
    const toData = (img) => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      return c.toDataURL('image/png');
    };
    await buildPptx(data(), { wordmark: toData(assets.wordmark), logo: toData(assets.logo) });
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="panel">
        <div className="field">
          <label>포맷</label>
          <div className="row">
            {Object.values(FORMATS).map(f => (
              <button key={f.key} type="button" className="chip"
                aria-pressed={form.format === f.key}
                onClick={() => setForm({ ...form, format: f.key })}>{f.label}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>날짜 (YYYYMMDD)</label>
          <input value={form.date} onChange={set('date')} inputMode="numeric" />
        </div>
        <div className="field">
          <label>제목</label>
          <input value={form.title} onChange={set('title')} placeholder="9월 갤러리 탐방 후기" />
        </div>
        <div className="field">
          <label>일시</label>
          <input value={form.i1} onChange={set('i1')} placeholder="2026. 9. 16(수) 16:00~17:40" />
        </div>
        <div className="field">
          <label>장소</label>
          <input value={form.i2} onChange={set('i2')} placeholder="국립현대미술관 덕수궁" />
        </div>
        <div className="field">
          <label>주제 / 발제</label>
          <input value={form.i3} onChange={set('i3')} placeholder="이대원: 당신을 슬프게 하는 것은 하나도 없다" />
        </div>
        <div className="field">
          <label>본문 (빈 줄로 문단을 나눕니다)</label>
          <textarea value={form.body} onChange={set('body')} placeholder={'회원 여러분 안녕하세요.\n\n오늘 함께한 탐방은…'} />
        </div>
        <div className="field">
          <label>사진 (최대 5장, 넣지 않으면 글자가 커집니다)</label>
          <input type="file" accept="image/*" multiple onChange={pick} />
        </div>
        <div className="btns">
          <button className="btn" type="button" onClick={savePng}>PNG로 저장 (카카오톡용)</button>
          <button className="btn alt" type="button" onClick={savePptx}>PPTX로 저장 (편집용)</button>
        </div>
      </div>

      <div className="preview">
        <canvas ref={canvasRef} width={W} height={H} />
        <p className="hint">
          본문이 길면 글자 크기가 자동으로 줄고, 짧으면 커집니다. 폰에서는 그림을 길게 눌러 저장해도 됩니다.
        </p>
      </div>
    </>
  );
}
