'use client';
import { useEffect, useRef, useState } from 'react';
import { FORMATS, W, H } from '../lib/formats';
import { drawNewsletter, loadImage } from '../lib/draw';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

const LABEL = { date: '날짜', title: '제목', i1: '일시', i2: '장소', i3: '주제', body: '본문' };
const STEPS = [['input', '1 입력'], ['edit', '2 미리보기·수정'], ['final', '3 최종 확인']];

export default function NewsletterMaker() {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const [assets, setAssets] = useState({});
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState('input');
  const [form, setForm] = useState({
    format: 'tour', date: today(), title: '', i1: '', i2: '', i3: '', body: '',
  });
  const [photos, setPhotos] = useState([]);
  const [regions, setRegions] = useState([]);
  const [scale, setScale] = useState(0.3);
  const [editing, setEditing] = useState(null);
  const [saved, setSaved] = useState(false);

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

  const data = (edit) => ({
    format: form.format,
    date: form.date,
    title: form.title.trim(),
    edit,
    info: [
      { key: 'i1', label: '일시', value: form.i1.trim() },
      { key: 'i2', label: '장소', value: form.i2.trim() },
      { key: 'i3', label: '주제', value: form.i3.trim() },
    ],
    body: form.body.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean),
    photos,
  });

  // 미리보기 그리기 (수정 화면에서는 빈 칸 안내 문구가 연하게 보입니다)
  useEffect(() => {
    if (!ready || step === 'input' || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const r = drawNewsletter(ctx, data(step === 'edit'), assets);
    setRegions(prev => (JSON.stringify(prev) === JSON.stringify(r) ? prev : r));
  }, [ready, assets, form, photos, step]);

  // 화면 크기에 맞춰 편집 칸 위치를 계산할 배율
  useEffect(() => {
    if (step === 'input' || !canvasRef.current) return;
    const el = canvasRef.current;
    const update = () => setScale(el.clientWidth / W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [step]);

  const pick = (e) => {
    const list = [...e.target.files].filter(f => f.type.startsWith('image/')).slice(0, 5);
    Promise.all(list.map(f => loadImage(URL.createObjectURL(f)))).then(setPhotos);
  };

  const go = (s) => { setEditing(null); setSaved(false); setStep(s); window.scrollTo({ top: 0 }); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // 저장본은 안내 문구 없이 따로 그려서 내보냅니다.
  const savePng = () => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    drawNewsletter(c.getContext('2d'), data(false), assets);
    c.toBlob((blob) => {
      const a = document.createElement('a');
      a.download = `SDA_${form.format}_${form.date}.png`;
      a.href = URL.createObjectURL(blob);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setSaved(true);
    }, 'image/png');
  };

  const missing = !form.title.trim();

  const FormatChips = () => (
    <div className="row">
      {Object.values(FORMATS).map(f => (
        <button key={f.key} type="button" className="chip"
          aria-pressed={form.format === f.key}
          onClick={() => setForm({ ...form, format: f.key })}>{f.label}</button>
      ))}
    </div>
  );

  const Steps = () => (
    <div className="steps" aria-label="진행 단계">
      {STEPS.map(([k, t]) => (
        <span key={k} className="step" aria-current={step === k}>{t}</span>
      ))}
    </div>
  );

  if (step === 'input') {
    return (
      <>
        {Steps()}
        <div className="panel">
          <div className="field">
            <label>포맷</label>
            {FormatChips()}
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
            {photos.length > 0 && <p className="hint">사진 {photos.length}장을 골랐습니다.</p>}
          </div>
          <div className="btns">
            <button className="btn" type="button" onClick={() => go('edit')}>미리보기로 이동</button>
          </div>
        </div>
      </>
    );
  }

  const editable = step === 'edit';
  const ed = editing && regions.find(r => r.key === editing);

  return (
    <>
      {Steps()}
      {editable ? (
        <div className="panel">
          <div className="field">
            <label>포맷</label>
            {FormatChips()}
          </div>
          <p className="hint">
            점선으로 표시된 곳을 누르면 그 자리에서 바로 고칠 수 있습니다. 본문은 빈 줄로 문단을 나눕니다.
            글자 크기는 길이에 맞춰 자동으로 조절됩니다.
          </p>
        </div>
      ) : (
        <div className="panel">
          <p className="hint" style={{ margin: 0 }}>
            아래 그림이 저장될 모습 그대로입니다. 고칠 곳이 없으면 PNG로 저장하세요.
          </p>
        </div>
      )}

      <div className="stage" ref={stageRef}>
        <canvas ref={canvasRef} width={W} height={H} />
        {editable && regions.map(r => {
          const box = {
            left: r.x * scale - 4, top: r.y * scale - 1,
            width: r.w * scale + 8, height: r.h * scale + 2,
          };
          if (editing === r.key) return null;
          return (
            <button key={r.key} type="button" className="hit" style={box}
              aria-label={`${LABEL[r.key]} 고치기`} onClick={() => setEditing(r.key)} />
          );
        })}
        {editable && ed && (
          <textarea
            key={ed.key}
            className="inline-edit"
            autoFocus
            value={form[ed.key === 'date' ? 'date' : ed.key]}
            onChange={set(ed.key)}
            onBlur={() => setEditing(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || (ed.single && e.key === 'Enter')) { e.preventDefault(); e.currentTarget.blur(); }
            }}
            inputMode={ed.key === 'date' ? 'numeric' : undefined}
            aria-label={LABEL[ed.key]}
            style={{
              left: ed.x * scale - 6, top: ed.y * scale - 5,
              width: ed.w * scale + 12,
              minHeight: Math.max(ed.h * scale + 10, 30),
              height: ed.single ? undefined : ed.h * scale + 10,
              fontSize: `max(16px, ${ed.fs * scale}px)`,
              lineHeight: ed.lh,
              fontWeight: ed.bold ? 700 : 400,
            }}
          />
        )}
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        {editable ? (
          <div className="btns">
            <button className="btn alt" type="button" onClick={() => go('input')}>처음 입력으로</button>
            <button className="btn" type="button" disabled={missing} onClick={() => go('final')}>
              {missing ? '제목을 입력하면 확인할 수 있어요' : '최종 확인'}
            </button>
          </div>
        ) : (
          <div className="btns">
            <button className="btn alt" type="button" onClick={() => go('edit')}>수정하러 돌아가기</button>
            <button className="btn" type="button" onClick={savePng}>PNG로 저장 (카카오톡용)</button>
          </div>
        )}
        {saved && <p className="hint">PNG를 저장했습니다. 폰에서는 그림을 길게 눌러 저장해도 됩니다.</p>}
      </div>
    </>
  );
}
