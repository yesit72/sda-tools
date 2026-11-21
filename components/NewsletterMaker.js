'use client';
import { useEffect, useRef, useState } from 'react';
import { FORMATS, W, H } from '../lib/formats';
import { drawNewsletter, loadImage } from '../lib/draw';
import { defaultCrop } from '../lib/collage';
import { loadPhotos, loadOne } from '../lib/photos';
import { canShareFiles, canvasBlob, download, shareImage } from '../lib/share';
import CropEditor from './CropEditor';
import PhotoStrip from './PhotoStrip';
import EditSheet from './EditSheet';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};
const toIso = (d) => (/^\d{8}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}` : '');
const fromIso = (v) => v.replace(/-/g, '');

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
const MAX_PHOTOS = 5;
const DRAFT_KEY = 'sda-newsletter-draft-v1';
const EMPTY = { format: 'tour', date: today(), title: '', i1: '', i2: '', i3: '', i4: '', body: '' };

const store = {
  get() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; } },
  set(v) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(v)); } catch {} },
  clear() { try { localStorage.removeItem(DRAFT_KEY); } catch {} },
};
const hasContent = (f) => !!(f && (f.title || f.body || f.i1 || f.i2 || f.i3 || f.i4));

export default function NewsletterMaker() {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const offRef = useRef(null);
  const [assets, setAssets] = useState({});
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState('input');
  const [form, setForm] = useState(EMPTY);
  const [order, setOrder] = useState(DEFAULT_ORDER); // 화면에 넣을 항목과 그 순서
  const [dateOn, setDateOn] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [crops, setCrops] = useState([]);
  const [fit, setFit] = useState({ titleOverflow: false, bodyOverflow: false, bodyPt: 0, bodyUsed: 0 });
  const [photoCells, setPhotoCells] = useState([]);
  const [regions, setRegions] = useState([]);
  const [scale, setScale] = useState(0.3);
  const [editing, setEditing] = useState(null);
  const [cropIdx, setCropIdx] = useState(null);
  const [saved, setSaved] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState(null);
  const [mobile, setMobile] = useState(false);
  const [share, setShare] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const [wordmark, logo] = await Promise.all([loadImage('/sda-wordmark.png'), loadImage('/sda-logo.png')]);
      if (document.fonts?.ready) await document.fonts.ready;
      if (live) { setAssets({ wordmark, logo }); setReady(true); }
    })();
    const d = store.get();
    if (d && hasContent(d.form)) setDraft(d);
    const mq = window.matchMedia('(max-width: 700px)');
    const onMq = () => setMobile(mq.matches);
    onMq(); mq.addEventListener('change', onMq);
    setShare(canShareFiles());
    return () => { live = false; mq.removeEventListener('change', onMq); };
  }, []);

  // 쓰는 중인 글은 이 기기에 자동으로 임시 저장 (사진은 용량 때문에 저장하지 않음)
  useEffect(() => {
    if (draft) return; // 이어 쓸지 고르기 전에는 덮어쓰지 않음
    const t = setTimeout(() => {
      if (hasContent(form)) store.set({ form, order, dateOn, at: Date.now() });
    }, 400);
    return () => clearTimeout(t);
  }, [form, order, dateOn, draft]);

  // 저장하지 않고 창을 닫으려 하면 한 번 묻기
  useEffect(() => {
    const onLeave = (e) => { if (hasContent(form) && !saved) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [form, saved]);

  const data = (edit) => ({
    format: form.format,
    date: form.date,
    dateOn,
    edit,
    items: order.map(k => ({ key: k, kind: ITEMS[k].kind, label: ITEMS[k].label, value: form[k].trim() })),
    body: form.body,
    photos,
    crops,
  });

  // 미리보기 그리기 (수정 화면에서는 빈 칸 안내 문구가 연하게 보입니다)
  useEffect(() => {
    if (!ready || step === 'input' || !canvasRef.current) return;
    const { regions: r } = drawNewsletter(canvasRef.current.getContext('2d'), data(step === 'edit'), assets);
    setRegions(prev => (JSON.stringify(prev) === JSON.stringify(r) ? prev : r));
  }, [ready, assets, form, photos, crops, step, order, dateOn]);

  // 저장될 모습(안내 문구 없음) 기준으로 한 장에 들어가는지, 사진 칸 크기는 얼마인지 따로 계산
  useEffect(() => {
    if (!ready) return;
    if (!offRef.current) { offRef.current = document.createElement('canvas'); offRef.current.width = W; offRef.current.height = H; }
    const { meta, regions: r } = drawNewsletter(offRef.current.getContext('2d'), data(false), assets);
    setFit(prev => (JSON.stringify(prev) === JSON.stringify(meta) ? prev : meta));
    const cells = r.filter(x => x.photo !== undefined).map(x => [x.w, x.h]);
    setPhotoCells(prev => (JSON.stringify(prev) === JSON.stringify(cells) ? prev : cells));
  }, [ready, assets, form, photos, crops, order, dateOn]);

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

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setVal = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // 사진
  const addPhotos = async (e) => {
    const room = MAX_PHOTOS - photos.length;
    const { imgs, notice: n } = await loadPhotos(e.target.files, Math.max(room, 0));
    e.target.value = '';
    setNotice(room <= 0 ? `사진은 최대 ${MAX_PHOTOS}장입니다.` : n);
    setPhotos(p => [...p, ...imgs]);
  };
  const movePhoto = (i, d) => {
    const j = i + d;
    const swap = (arr) => { const n = Array.from({ length: photos.length }, (_, k) => arr[k]); [n[i], n[j]] = [n[j], n[i]]; return n; };
    setPhotos(swap); setCrops(swap);
  };
  const removePhoto = (i) => {
    setPhotos(p => p.filter((_, k) => k !== i));
    setCrops(c => Array.from({ length: photos.length }, (_, k) => c[k]).filter((_, k) => k !== i));
  };
  const replacePhoto = async (i, file) => {
    const { img, notice: n } = await loadOne(file);
    setNotice(n);
    if (!img) return;
    setPhotos(p => p.map((x, k) => (k === i ? img : x)));
    setCrops(c => { const n2 = [...c]; n2[i] = undefined; return n2; });
  };

  const overflow = fit.bodyOverflow || fit.titleOverflow;
  const missing = order.includes('title') && !form.title.trim();
  const badDate = dateOn && !/^\d{8}$/.test(form.date);
  const blocked = missing || overflow || badDate;
  const blockMsg = missing ? '제목을 입력하면 확인할 수 있어요'
    : badDate ? '날짜를 고르면 확인할 수 있어요'
    : overflow ? '한 장에 맞춰야 확인할 수 있어요' : '';
  const overflowMsg = fit.titleOverflow
    ? '제목이 두 줄을 넘어 한 장에 들어가지 않습니다. 제목을 줄여 주세요.'
    : '내용이 길어 한 장에 다 들어가지 않습니다. 본문을 줄이거나 사진·항목을 빼 주세요.';

  const go = (s) => {
    if (s === 'final' && blocked) return;
    setEditing(null); setSaved(''); setStep(s); window.scrollTo({ top: 0 });
  };

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

  // 저장본은 안내 문구 없이 따로 그려서 내보냅니다.
  const render = async () => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const { meta } = drawNewsletter(c.getContext('2d'), data(false), assets);
    if (meta.bodyOverflow || meta.titleOverflow) return null; // 한 장을 넘으면 저장하지 않음
    return canvasBlob(c, 'image/png');
  };
  const fileName = `SDA_${form.format}_${form.date || 'news'}.png`;
  const savePng = async () => { const b = await render(); if (b) { download(b, fileName); setSaved('saved'); } };
  const sharePng = async () => {
    const b = await render(); if (!b) return;
    const r = await shareImage(b, fileName, form.title || 'SDA 소식');
    if (r !== 'cancel') setSaved(r === 'shared' ? 'shared' : 'saved');
  };

  // 칸 누르기: 사진이면 자르기, 날짜·휴대폰이면 아래 편집창, PC면 그 자리에서 바로
  const openEdit = (r) => {
    if (r.photo !== undefined) { setCropIdx(r.photo); return; }
    setEditing(r.key);
    if (mobile || r.key === 'date') {
      const st = stageRef.current.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, st + r.y * scale - 90), behavior: 'smooth' });
    }
  };

  const Ctl = (k) => (
    <span className="ctl">
      <button type="button" className="mini" disabled={order.indexOf(k) === 0} onClick={() => move(k, -1)} aria-label={`${LABEL[k]} 위로`}>▲</button>
      <button type="button" className="mini" disabled={order.indexOf(k) === order.length - 1} onClick={() => move(k, 1)} aria-label={`${LABEL[k]} 아래로`}>▼</button>
      <button type="button" className="mini" onClick={() => drop(k)} aria-label={`${LABEL[k]} 빼기`}>빼기</button>
    </span>
  );
  const DateCtl = () => (
    <span className="ctl"><button type="button" className="mini" onClick={() => { setEditing(null); setDateOn(false); }} aria-label="날짜 빼기">빼기</button></span>
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
        <button key={f.key} type="button" className="chip" aria-pressed={form.format === f.key}
          onClick={() => setForm(x => ({ ...x, format: f.key }))}>{f.label}</button>
      ))}
    </div>
  );
  const Steps = () => (
    <nav className="steps" aria-label="진행 단계">
      {STEPS.map(([k, t]) => (
        <button key={k} type="button" className="step" aria-current={step === k ? 'step' : undefined}
          disabled={k === 'final' && blocked} onClick={() => go(k)}>{t}</button>
      ))}
    </nav>
  );
  const Meter = () => {
    const pct = Math.min(100, Math.round(fit.bodyUsed * 100));
    const state = overflow ? 'over' : fit.bodyPt > 0 && fit.bodyPt < 16 ? 'tight' : 'ok';
    return (
      <div className="meter-wrap" aria-live="polite">
        <div className={`meter ${state}`}><span style={{ width: `${overflow ? 100 : pct}%` }} /></div>
        <p className="meter-text">
          {overflow ? '한 장을 넘었습니다' : form.body.trim() ? `본문 ${fit.bodyPt}pt · 공간 ${pct}% 사용` : '본문을 쓰면 남은 공간을 보여 드립니다'}
          {!overflow && state === 'tight' && ' · 글자가 작아지는 중'}
        </p>
      </div>
    );
  };
  const Photos = () => (
    <>
      <PhotoStrip imgs={photos} onMove={movePhoto} onRemove={removePhoto} onReplace={replacePhoto}
        onCrop={(i) => setCropIdx(i)} />
      {photos.length < MAX_PHOTOS && (
        <label className="btn alt file-btn">
          사진 넣기 ({photos.length}/{MAX_PHOTOS})
          <input type="file" accept="image/*" multiple hidden onChange={addPhotos} />
        </label>
      )}
      {notice && <p className="hint">{notice}</p>}
    </>
  );

  const cropModal = cropIdx !== null && photos[cropIdx] && photoCells[cropIdx] && (
    <CropEditor
      img={photos[cropIdx]}
      cell={photoCells[cropIdx]}
      initial={crops[cropIdx] || defaultCrop(photos[cropIdx], ...photoCells[cropIdx])}
      onDone={(c) => { setCrops(p => { const n = [...p]; n[cropIdx] = c; return n; }); setCropIdx(null); }}
      onClose={() => setCropIdx(null)}
    />
  );

  // ---------- 1. 입력 ----------
  if (step === 'input') {
    return (
      <>
        {Steps()}
        {draft && (
          <div className="banner">
            <p>작성하던 소식지가 있습니다{draft.form.title ? ` — “${draft.form.title}”` : ''}.</p>
            <div className="row">
              <button type="button" className="btn small" onClick={() => {
                setForm({ ...EMPTY, ...draft.form }); setOrder(draft.order || DEFAULT_ORDER);
                setDateOn(draft.dateOn !== false); setDraft(null);
              }}>이어서 작성</button>
              <button type="button" className="btn small alt" onClick={() => { store.clear(); setDraft(null); }}>새로 시작</button>
            </div>
          </div>
        )}
        <div className="panel">
          <div className="field">
            <label>포맷</label>
            {FormatChips()}
          </div>
          {dateOn && (
            <div className="field">
              <div className="field-head"><label htmlFor="f-date">날짜</label>{DateCtl()}</div>
              <input id="f-date" type="date" value={toIso(form.date)} onChange={(e) => setVal('date', fromIso(e.target.value))} />
            </div>
          )}
          {order.map(k => (
            <div className="field" key={k}>
              <div className="field-head"><label htmlFor={`f-${k}`}>{ITEMS[k].label}</label>{Ctl(k)}</div>
              <input id={`f-${k}`} value={form[k]} onChange={set(k)} placeholder={ITEMS[k].ph} />
            </div>
          ))}
          {AddChips()}
          <div className="field">
            <label htmlFor="f-body">본문</label>
            <textarea id="f-body" value={form.body} onChange={set('body')} placeholder={'회원 여러분 안녕하세요.\n\n오늘 함께한 탐방은…'} />
            <p className="hint">엔터로 줄을 나누고, 빈 줄은 한 줄을 띄웁니다. 이모지는 넣지 않습니다.</p>
            {Meter()}
          </div>
          <div className="field">
            <label>사진 (최대 {MAX_PHOTOS}장, 넣지 않으면 글자가 커집니다)</label>
            {Photos()}
          </div>
        </div>
        <div className="actionbar">
          <button className="btn" type="button" onClick={() => go('edit')}>미리보기로 이동</button>
        </div>
        {cropModal}
      </>
    );
  }

  // ---------- 2. 미리보기·수정 / 3. 최종 확인 ----------
  const editable = step === 'edit';
  const ed = editing && regions.find(r => r.key === editing);
  const sheetOpen = editable && ed && (mobile || ed.key === 'date');

  return (
    <>
      {Steps()}
      {editable ? (
        <div className="panel">
          <div className="field">
            <label>포맷</label>
            {FormatChips()}
          </div>
          <details className="fold" open={!mobile}>
            <summary>항목 순서 · 빼기 · 사진</summary>
            {dateOn && <div className="order-row"><span>날짜</span>{DateCtl()}</div>}
            {order.map(k => (<div className="order-row" key={k}><span>{ITEMS[k].label}</span>{Ctl(k)}</div>))}
            {AddChips()}
            <div style={{ marginTop: 14 }}>{Photos()}</div>
          </details>
          <p className="hint">
            점선 칸을 누르면 바로 고칠 수 있고, 사진 칸을 누르면 보여 줄 부분을 고를 수 있습니다.
          </p>
        </div>
      ) : (
        <div className="panel">
          <p className="hint" style={{ margin: 0 }}>
            아래 그림이 저장될 모습 그대로입니다. 고칠 곳이 없으면 공유하거나 저장하세요.
          </p>
        </div>
      )}

      {editable && Meter()}

      <div className="stage" ref={stageRef}>
        <canvas ref={canvasRef} width={W} height={H} />
        {editable && regions.map(r => {
          if (editing === r.key && !sheetOpen) return null;
          const isPhoto = r.photo !== undefined;
          const box = isPhoto
            ? { left: r.x * scale, top: r.y * scale, width: r.w * scale, height: r.h * scale }
            : { left: r.x * scale - 4, top: r.y * scale - 1, width: r.w * scale + 8, height: r.h * scale + 2 };
          return (
            <button key={r.key} type="button" className={`hit${isPhoto ? ' crop-hit' : ''}${editing === r.key ? ' on' : ''}`} style={box}
              aria-label={isPhoto ? `${r.photo + 1}번 사진 자르기` : `${LABEL[r.key]} 고치기`} onClick={() => openEdit(r)}>
              {isPhoto && <span>자르기</span>}
            </button>
          );
        })}
        {editable && ed && !sheetOpen && (
          <textarea
            key={ed.key}
            className="inline-edit"
            autoFocus
            value={form[ed.key]}
            onChange={set(ed.key)}
            onBlur={() => setEditing(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || (ed.single && e.key === 'Enter')) { e.preventDefault(); e.currentTarget.blur(); }
            }}
            aria-label={LABEL[ed.key]}
            style={{
              left: ed.x * scale, top: ed.y * scale,
              width: ed.w, height: ed.h,
              transform: `scale(${scale})`, transformOrigin: '0 0',
              fontSize: ed.fs, lineHeight: ed.lh, fontWeight: ed.bold ? 700 : 400,
              outline: `${2 / scale}px solid #141414`, outlineOffset: `${5 / scale}px`,
              boxShadow: `0 0 0 ${5 / scale}px #fff`,
            }}
          />
        )}
      </div>

      {overflow && <p className="warn" role="alert">{overflowMsg}</p>}
      {sheetOpen && <div style={{ height: '58vh' }} />}

      {sheetOpen ? (
        <EditSheet
          label={LABEL[ed.key]}
          kind={ed.key === 'date' ? 'date' : ed.single ? 'text' : 'textarea'}
          value={ed.key === 'date' ? toIso(form.date) : form[ed.key]}
          onChange={(v) => setVal(ed.key, ed.key === 'date' ? fromIso(v) : v)}
          onClose={() => setEditing(null)}
          hint={ed.key === 'body' ? '엔터로 줄을 나누고, 빈 줄은 한 줄을 띄웁니다.' : undefined}
        />
      ) : (
        <div className="actionbar">
          {editable ? (
            <div className="btn-row">
              <button className="btn alt" type="button" onClick={() => go('input')}>이전</button>
              <button className="btn grow" type="button" disabled={blocked} onClick={() => go('final')}>
                {blockMsg || '최종 확인'}
              </button>
            </div>
          ) : (
            <>
              <div className="btn-row">
                <button className="btn alt" type="button" onClick={() => go('edit')}>수정</button>
                {share && <button className="btn grow" type="button" disabled={overflow} onClick={sharePng}>카카오톡 등으로 공유</button>}
                <button className={`btn ${share ? 'alt' : 'grow'}`} type="button" disabled={overflow} onClick={savePng}>PNG 저장</button>
              </div>
              {saved && <p className="hint" role="status">{saved === 'shared' ? '공유 창으로 보냈습니다.' : 'PNG를 저장했습니다. 저장이 안 되면 그림을 길게 눌러 저장하세요.'}</p>}
            </>
          )}
        </div>
      )}
      {cropModal}
    </>
  );
}
