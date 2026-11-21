// 휴대폰 공유 창(카카오톡 등)으로 바로 보내거나, 안 되면 파일로 내려받습니다.
export function canShareFiles() {
  try {
    if (typeof navigator === 'undefined' || !navigator.canShare) return false;
    const f = new File([new Blob(['x'], { type: 'image/png' })], 't.png', { type: 'image/png' });
    return navigator.canShare({ files: [f] });
  } catch { return false; }
}

export function canvasBlob(canvas, type = 'image/png', quality) {
  return new Promise((res) => canvas.toBlob(res, type, quality));
}

export function download(blob, name) {
  const a = document.createElement('a');
  a.download = name;
  a.href = URL.createObjectURL(blob);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// 성공하면 'shared', 사용자가 취소하면 'cancel', 공유가 안 되면 내려받기로 대신하고 'downloaded'
export async function shareImage(blob, name, title) {
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return 'shared'; }
    catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
  }
  download(blob, name);
  return 'downloaded';
}
