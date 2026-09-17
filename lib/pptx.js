import { FORMATS, DOTS } from './formats.js';

const px = (v) => v / 160; // 1200px = 7.5in

export async function buildPptx(data, logoDataUrls) {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const p = new PptxGenJS();
  p.defineLayout({ name: 'SDA', width: 7.5, height: 12.6 });
  p.layout = 'SDA';
  const f = FORMATS[data.format] || FORMATS.news;
  const s = p.addSlide();
  s.background = { color: f.bg.replace('#', '') };

  if (f.tri) {
    [[0.35, 'FE0106'], [0.44, '0AAF50'], [0.53, '0000FE']].forEach(([m, c]) => {
      s.addShape(p.ShapeType.roundRect, {
        x: m, y: m, w: 7.5 - m * 2, h: 12.6 - m * 2,
        fill: { type: 'none' }, line: { color: c, width: 1.5 }, rectRadius: 0.02,
      });
    });
  } else if (f.frame) {
    s.addShape(p.ShapeType.roundRect, {
      x: 0.4, y: 0.4, w: 6.7, h: 11.8,
      fill: { type: 'none' }, line: { color: f.frame.replace('#', ''), width: 1 }, rectRadius: 0.015,
    });
  }

  const X = px(152), CW = px(896);
  s.addImage({ data: logoDataUrls.wordmark, x: X, y: px(136), w: px(208), h: px(71) });
  s.addText(`소식 | ${data.date}`, {
    x: X + px(232), y: px(136), w: px(300), h: px(71),
    fontFace: 'Noto Sans KR', fontSize: 13, bold: true, color: '1E2A44', valign: 'middle',
  });
  s.addText(data.tag || f.tag, {
    x: X + CW - px(400), y: px(136), w: px(400), h: px(71), align: 'right',
    fontFace: 'Noto Sans KR', fontSize: 13.5, bold: true, color: '1E2A44', valign: 'middle',
  });

  s.addText(data.title, {
    x: X, y: px(288), w: CW, h: px(150),
    fontFace: 'Noto Sans KR', fontSize: 27, bold: true, color: '1E2A44', valign: 'top',
  });

  const info = data.info.filter(i => i.value).map(i => ([
    { text: i.label + '   ', options: { bold: true } },
    { text: i.value + '\n', options: {} },
  ])).flat();
  if (info.length) {
    s.addText(info, {
      x: X, y: px(452), w: CW, h: px(180),
      fontFace: 'Noto Sans KR', fontSize: 15, color: '5A6275', lineSpacingMultiple: 1.3,
    });
  }

  s.addText(data.body.join('\n\n'), {
    x: X, y: px(660), w: CW, h: px(1000),
    fontFace: 'Noto Sans KR', fontSize: data.photos?.length ? 16 : 17, color: '1E2A44',
    lineSpacingMultiple: 1.45, paraSpaceAfter: 10,
  });

  s.addImage({ data: logoDataUrls.logo, x: (7.5 - px(640)) / 2, y: px(1743), w: px(640), h: px(108) });

  await p.writeFile({ fileName: `SDA_${data.format}_${data.date}.pptx` });
}
