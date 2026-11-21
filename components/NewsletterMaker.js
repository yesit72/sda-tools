'use client';
import { useEffect, useRef, useState } from 'react';
import { FORMATS, W, H } from '../lib/formats';
import { drawNewsletter, loadImage } from '../lib/draw';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

const ITEMS = {
  title: { label: '제목', kind: 'title', ph: '9월 갤러리 탐방 후기' },
  i1: { label: '일시', kind: 'info', ph: '2026. 9. 16(수) 16:00~17:40' },
  i2: { label: '장소', kind: 'info', ph: '국립현대미술관 덕수궁' },
  i3: { label: '주제', kind: 'info', ph: '이대원: 당신을 슬프게 하는 것은 하나도 없다' },
  i4: { label: '발제', kind: 'info', ph: '발제자 이름' },
};
const DEFAULT_ORDER = ['title', 'i1', 'i2', 'i3', 'i4'];
const LABEL = { date: '날짜', body: '본문', ...Object.fromEntries(Object.entries(ITEMS).map(([k, v]) => [k, v.label])) };
const STEPS = [['input', '1 입력'], ['edit', '2 미리보기·수정'], ['final', '3 최종 확인']];

export default function NewsletterMaker() {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const [assets, setAssets] = useState({});
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState('input');
  const [form, setForm] = useState({
    format: 'tour', date: today(), title: '', i1: '', i2: '', i3: '', i4: '', body: '',
  });
  const [order, setOrder] = useState(DEFAULT_ORDER); // 화면에 넣을 항목과 그 순서
  const [dateOn, setDateOn] = useState(true);
  const [fit, setFit] = useState({ titleOverflow: false, bodyOverflow: false, bodyPt: 0 });
  const offRef = useRef(null);
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
    dateOn,
    edit,
    items: order.map(k => ({ key: k, kind: ITEMS[k].kind, label: ITEMS[k].label, value: form[k].trim() })),
    body: form.body,
    photos,
  });

  // 미리보기 그리기 (수정 화면에서는 빈 칸 안내 문구가 연하게 보입니다)
  useEffect(() => {
    if (!ready || step === 'input' || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const { regions: r } = drawNewsletter(ctx, data(step === 'edit'), assets);
    setRegions(prev => (JSON.stringify(prev) === JSON.stringify(r) ? prev : r));
  }, [ready, assets, form, photos, step, order, dateOn]);

  // 저장될 모습(안내 문구 없음) 기준으로 한 장에 들어가는지 따로 확인합니다.
  useEffect(() => {
    if (!ready) return;
    if (!offRef.current) { offRef.current = document.createElement('canvas'); offRef.current.width = W; offRef.current.height = H; }
    const { meta } = drawNewsletter(offRef.current.getContext('2d'), data(false), assets);
    setFit(prev => (JSON.stringify(prev) === JSON.stringify(meta) ? prev : meta));
  }, [ready, assets, form, photos, order, dateOn]);

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
    const { meta } = drawNewsletter(c.getContext('2d'), data(false), assets);
    if (meta.bodyOverflow || meta.titleOverflow) return; // 한 장을 넘으면 저장하지 않음
    c.toBlob((blob) => {
      const a = document.createElement('a');
      a.download = `SDA_${form.format}_${form.date}.png`;
      a.href = URL.createObjectURL(blob);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setSaved(true);
    }, 'image/png');
  };

  const overflow = fit.bodyOverflow || fit.titleOverflow;
  const missing = order.includes('title') && !form.title.trim();
  const blocked = missing || overflow;
  const overflowMsg = fit.titleOverflow
    ? '제목이 두 줄을 넘어 한 장에 들어가지 않습니다. 제목을 줄여 주세요.'
    : '내용이 길어 한 장에 다 들어가지 않습니다. 본문을 줄이거나 사진·항목을 빼 주세요.';

  // 항목 순서 바꾸기 / 빼기 / 다시 넣기
  const move = (k, d) => setOrder(o => {
    const i = o.indexOf(k), j = i + d;
    if (j < 0 || j >= o.length) return o;
    const n = [...o]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const drop = (k) => { setEditing(null); setOrder(o => o.filter(x => x !== k)); };
  const addBack = (k) => setOrder(o => {
    const rank = (x) => DEFAULT_ORDER.indexOf(x);
    const at = o.findIndex(x => rank(x) > rank(k));
    const n = [...o]; n.splice(at < 0 ? n.length : at, 0, k); return n;
  });
  const removed = DEFAULT_ORDER.filter(k => !order.includes(k));

  const Ctl = (k) => (
    <span className="ctl">
      <button type="button" className="mini" disabled={order.indexOf(k) === 0} onClick={() => move(k, -1)} aria-label={`${LABEL[k]} 위로`}>▲</button>
      <button type="button" className="mini" disabled={order.indexOf(k) === order.length - 1} onClick={() => move(k, 1)} aria-label={`${LABEL[k]} 아래로`}>▼</button>
      <button type="button" className="mini" onClick={() => drop(k)} aria-label={`${LABEL[k]} 빼기`}>빼기</button>
    </span>
  );
  const AddChips = () => (removed.length > 0 || !dateOn) && (
    <div className="row" style={{ marginTop: 10 }}>
      {!dateOn && <button type="button" className="chip" onClick={() => setDateOn(true)}>+ 날짜</button>}
      {removed.map(k => <button key={k} type="button" className="chip" onClick={() => addBack(k)}>+ {LABEL[k]}</button>)}
    </div>
  );

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
          {dateOn && (
            <div className="field">
              <div className="field-head"><label>날짜 (YYYYMMDD)</label>
                <span className="ctl"><button type="button" className="mini" onClick={() => { setEditing(null); setDateOn(false); }}>빼기</button></span>
              </div>
              <input value={form.date} onChange={set('date')} inputMode="numeric" />
            </div>
          )}
          {order.map(k => (
            <div className="field" key={k}>
              <div className="field-head"><label>{ITEMS[k].label}</label>{Ctl(k)}</div>
              <input value={form[k]} onChange={set(k)} placeholder={ITEMS[k].ph} />
            </div>
          ))}
          {AddChips()}
          <div className="field">
            <label>본문 (엔터로 줄을 나누고, 빈 줄은 한 줄을 띄웁니다)</label>
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
          <div className="field">
            <label>항목 순서 · 빼기</label>
            {dateOn && (
              <div className="order-row"><span>날짜</span>
                <span className="ctl"><button type="button" className="mini" onClick={() => { setEditing(null); setDateOn(false); }}>빼기</button></span>
              </div>
            )}
            {order.map(k => (<div className="order-row" key={k}><span>{ITEMS[k].label}</span>{Ctl(k)}</div>))}
            {AddChips()}
          </div>
          <p className="hint">
            점선으로 표시된 곳을 누르면 그 자리에서 바로 고칠 수 있습니다. 본문은 엔터로 줄을 나누고, 빈 줄은 한 줄을 띄웁니다.
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
              left: ed.x * scale, top: ed.y * scale,
              width: ed.w, height: ed.h,
              transform: `scale(${scale})`, transformOrigin: '0 0',
              fontSize: ed.fs, lineHeight: ed.lh, fontWeight: ed.bold ? 700 : 400,
              outline: `${2 / scale}px solid #1e2a44`, outlineOffset: `${5 / scale}px`,
              boxShadow: `0 0 0 ${5 / scale}px #fff`,
            }}
          />
        )}
      </div>

      {overflow && <p className="warn" role="alert">{overflowMsg}</p>}
      {!overflow && fit.bodyPt > 0 && fit.bodyPt < 16 && <p className="hint">본문 글자가 {fit.bodyPt}pt까지 작아졌습니다. 읽기 불편하면 본문을 조금 줄여 보세요. 한 장에는 들어갑니다.</p>}

      <div className="panel" style={{ marginTop: 16 }}>
        {editable ? (
          <div className="btns">
            <button className="btn alt" type="button" onClick={() => go('input')}>처음 입력으로</button>
            <button className="btn" type="button" disabled={blocked} onClick={() => go('final')}>
              {missing ? '제목을 입력하면 확인할 수 있어요' : overflow ? '한 장에 맞춰야 확인할 수 있어요' : '최종 확인'}
            </button>
          </div>
        ) : (
          <div className="btns">
            <button className="btn alt" type="button" onClick={() => go('edit')}>수정하러 돌아가기</button>
            <button className="btn" type="button" disabled={overflow} onClick={savePng}>PNG로 저장 (카카오톡용)</button>
          </div>
        )}
        {saved && <p className="hint">PNG를 저장했습니다. 폰에서는 그림을 길게 눌러 저장해도 됩니다.</p>}
      </div>
    </>
  );
}
