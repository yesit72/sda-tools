'use client';
import { useEffect, useRef } from 'react';

// 휴대폰에서 칸을 누르면 아래에서 올라오는 큰 편집창. 위쪽 미리보기는 입력하는 대로 바뀝니다.
export default function EditSheet({ label, value, onChange, onClose, kind = 'text', hint }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const common = {
    ref, value, 'aria-label': label,
    onChange: (e) => onChange(e.target.value),
    onKeyDown: (e) => {
      if (e.key === 'Escape') onClose();
      if (kind === 'text' && e.key === 'Enter') { e.preventDefault(); onClose(); }
    },
  };
  return (
    <div className="esheet" role="dialog" aria-label={`${label} 고치기`}>
      <div className="esheet-head">
        <b>{label}</b>
        <button type="button" className="btn small" onClick={onClose}>완료</button>
      </div>
      {kind === 'textarea' && <textarea {...common} rows={7} />}
      {kind === 'text' && <input {...common} enterKeyHint="done" />}
      {kind === 'date' && <input {...common} type="date" />}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
