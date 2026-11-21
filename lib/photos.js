import { loadImage } from './draw';

// 고른 파일을 사진으로 읽습니다. 열 수 없는 형식(아이폰 HEIC 등)은 따로 알려 줍니다.
export async function loadPhotos(files, max) {
  const list = [...files].filter(f => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
  const over = Math.max(0, list.length - max);
  const res = await Promise.allSettled(list.slice(0, max).map(f => loadImage(URL.createObjectURL(f))));
  const imgs = res.filter(r => r.status === 'fulfilled').map(r => r.value);
  const failed = res.filter(r => r.status === 'rejected').length;
  const msgs = [];
  if (over) msgs.push(`최대 ${max}장까지라서 앞의 ${max}장만 사용했습니다.`);
  if (failed) msgs.push(`${failed}장은 열 수 없는 형식이라 뺐습니다. 아이폰 사진(HEIC)은 '가장 호환성 높은 형식'으로 바꾸거나 캡처해서 넣어 주세요.`);
  return { imgs, notice: msgs.join(' ') };
}

export async function loadOne(file) {
  const { imgs, notice } = await loadPhotos([file], 1);
  return { img: imgs[0] || null, notice };
}
