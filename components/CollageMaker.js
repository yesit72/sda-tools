'use client';
import { useEffect, useRef, useState } from 'react';
import { SIZE, LAYOUT_NAMES, drawCollage, collageCells, defaultCrop } from '../lib/collage';
import { loadImage } from '../lib/draw';
import { loadPhotos, loadOne } from '../lib/photos';
import { canShareFiles, canvasBlob, download, shareImage } from '../lib/share';
import CropEditor from './CropEditor';
import PhotoStrip from './PhotoStrip';

const MAX = 4;
const BGS = [
  { v: '#E9EDF3', label: '청회색' },
  { v: '#FBEEEC', label: '연분홍' },
  { v: '#FFFFFF', label: '흰색' },
];

export default function CollageMaker() {
  const [imgs, setImgs] = useState([]);
  const [crops, setCrops] = useState([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} (${'일월화수목금토'[d.getDay()]})`;
  });
  const [bg, setBg] = useState('#E9EDF3');
  const [variant, setVariant] = useState(0);
  const [logo, setLogo] = useState(null);
  const [step, setStep] = useState('edit'); // edit | final
  const [cropIdx, setCropIdx] = useState(null);
  const [notice, setNotice] = useState('');
  const [saved, setSaved] = useState('');
  const [scale, setScale] = useState(0.3);
  const [share, setShare] = useState(false);
  const fileRef = useRef(null);
  const canvasRef = useRef(null);
  const imgsRef = useRef(imgs);
  imgsRef.current = imgs;

  useEffect(() => {
    loadImage('/sda-logo.png').then(setLogo).catch(() => {});
    setShare(canShareFiles());
  }, []);

  const names = LAYOUT_NAMES[imgs.length] || [];
  const v = variant < names.length ? variant : 0;
  const opts = { bg, logo, title, date, crops, variant: v };
  const geom = collageCells(imgs.length, { logo, title, variant: v });

  useEffect(() => {
    if (!imgs.length || !canvasRef.current) return;
    (async () => { if (document.fonts?.ready) await document.fonts.ready; drawCollage(canvasRef.current, imgs, opts); })();
  }, [imgs, crops, bg, logo, title, date, step, v]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / SIZE.W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [imgs.length, step]);

  // 저장하지 않고 창을 닫으려 하면 한 번 묻기
  useEffect(() => {
    const onLeave = (e) => { if (imgs.length && !saved) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [imgs.length, saved]);

  // 사진 넣기: 이미 고른 사진 뒤에 이어 붙입니다 (최대 4장)
  const add = async (files) => {
    const room = MAX - imgsRef.current.length;
    if (room <= 0) { setNotice(`사진은 최대 ${MAX}장입니다. 바꾸려면 아래 목록에서 '바꾸기'를 누르세요.`); return; }
    const { imgs: im, notice: n } = await loadPhotos(files, room);
    setNotice(n);
    if (!im.length) return;
    setImgs(p => [...p, ...im]); setStep('edit'); setSaved('');
  };

  useEffect(() => {
    const onPaste = (e) => { const f = [...(e.clipboardData?.files || [])]; if (f.length) { e.preventDefault(); add(f); } };
    const onDrop = (e) => { e.preventDefault(); if (e.dataTransfer?.files?.length) add(e.dataTransfer.files); };
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

  // 사진 순서 바꾸기 (자르기 값은 사진을 따라갑니다)
  const moveImg = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= imgs.length) return;
    const swap = (arr) => { const n = Array.from({ length: imgs.length }, (_, k) => arr[k]); [n[i], n[j]] = [n[j], n[i]]; return n; };
    setImgs(swap); setCrops(swap);
  };
  const removeImg = (i) => {
    setImgs(p => p.filter((_, k) => k !== i));
    setCrops(c => Array.from({ length: imgs.length }, (_, k) => c[k]).filter((_, k) => k !== i));
    setNotice('');
  };
  const replaceImg = async (i, file) => {
    const { img, notice: n } = await loadOne(file);
    setNotice(n);
    if (!img) return;
    setImgs(p => p.map((x, k) => (k === i ? img : x)));
    setCrops(c => { const n2 = [...c]; n2[i] = undefined; return n2; });
  };
  const applyCrop = (c) => {
    setCrops(prev => { const n = [...prev]; n[cropIdx] = c; return n; });
    setCropIdx(null);
  };

  const go = (s) => { if (s === 'final' && !imgs.length) return; setStep(s); setSaved(''); window.scrollTo({ top: 0 }); };

  const render = () => canvasBlob(canvasRef.current, 'image/jpeg', 0.92);
  const save = async () => { download(await render(), 'SDA_collage.jpg'); setSaved('saved'); };
  const doShare = async () => {
    const r = await shareImage(await render(), 'SDA_collage.jpg', title || 'SDA 사진');
    if (r !== 'cancel') setSaved(r === 'shared' ? 'shared' : 'saved');
  };

  const editing = step === 'edit';

  return (
    <>
      <nav className="steps" aria-label="진행 단계">
        <button type="button" className="step" aria-current={editing ? 'step' : undefined} onClick={() => go('edit')}>1 사진·자르기</button>
        <button type="button" className="step" aria-current={!editing ? 'step' : undefined} disabled={!imgs.length} onClick={() => go('final')}>2 최종 확인</button>
      </nav>

      {editing && (
        <div className="panel">
          <div className="field">
            <label>사진 (최대 {MAX}장)</label>
            <PhotoStrip imgs={imgs} onMove={moveImg} onRemove={removeImg} onReplace={replaceImg} onCrop={(i) => setCropIdx(i)} />
            {imgs.length < MAX && (
              <button className={`btn ${imgs.length ? 'alt' : ''}`} type="button" onClick={() => fileRef.current.click()}>
                {imgs.length ? `사진 더 넣기 (${imgs.length}/${MAX})` : `사진 고르기 (최대 ${MAX}장)`}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" multiple hidden
              onChange={e => { add(e.target.files); e.target.value = ''; }} />
            <p className="hint">
              {imgs.length ? '목록의 ▲▼로 순서를 바꾸고, 자르기로 보여 줄 부분을 고릅니다.' : '사진을 복사해 붙여넣거나 끌어다 놓아도 됩니다.'}
              {notice && <><br />{notice}</>}
            </p>
          </div>

          {names.length > 1 && (
            <div className="field">
              <label>배치</label>
              <div className="row">
                {names.map((n, i) => (
                  <button key={n} type="button" className="chip" aria-pressed={v === i} onClick={() => setVariant(i)}>{n}</button>
                ))}
              </div>
            </div>
          )}
          <div className="field">
            <label htmlFor="c-title">제목 (한 줄, 비워도 됩니다)</label>
            <input id="c-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="함께한 사람들" />
          </div>
          <div className="field">
            <label htmlFor="c-date">날짜</label>
            <input id="c-date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>배경</label>
            <div className="row">
              {BGS.map(b => (
                <button key={b.v} type="button" className="chip" aria-pressed={bg === b.v} onClick={() => setBg(b.v)}>{b.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {imgs.length > 0 && (
        <>
          <p className="hint" style={{ margin: '16px 0 8px' }}>
            {editing ? '사진 칸을 누르면 그 사진에서 남길 부분을 고를 수 있습니다.' : '저장될 모습 그대로입니다. 고칠 곳이 없으면 공유하거나 저장하세요.'}
          </p>
          <div className="stage">
            <canvas ref={canvasRef} width={SIZE.W} height={SIZE.H} />
            {editing && geom.cells.map(([x, y, w, h], i) => (
              <button key={i} type="button" className="hit crop-hit"
                style={{ left: x * scale, top: y * scale, width: w * scale, height: h * scale }}
                aria-label={`${i + 1}번 사진 자르기`} onClick={() => setCropIdx(i)}>
                <span>{i + 1}번 자르기</span>
              </button>
            ))}
          </div>
        </>
      )}

      {imgs.length > 0 && (
        <div className="actionbar">
          {editing ? (
            <button className="btn" type="button" onClick={() => go('final')}>최종 확인</button>
          ) : (
            <>
              <div className="btn-row">
                <button className="btn alt" type="button" onClick={() => go('edit')}>수정</button>
                {share && <button className="btn grow" type="button" onClick={doShare}>카카오톡 등으로 공유</button>}
                <button className={`btn ${share ? 'alt' : 'grow'}`} type="button" onClick={save}>JPG 저장</button>
              </div>
              {saved && <p className="hint" role="status">{saved === 'shared' ? '공유 창으로 보냈습니다.' : '저장했습니다. 저장이 안 되면 그림을 길게 눌러 저장하세요.'}</p>}
            </>
          )}
        </div>
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
