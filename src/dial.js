/* ============================================================
   ЦИФЕРБЛАТ: clous de Paris, римские цифры, таблички, дата
   Всё рисуется в Canvas 2048×2048 и упаковывается в текстуры.
   ============================================================ */
(function (global) {
  'use strict';
  const T = global.THREE;

  const DIAL_R = 16.0;          // мм, радиус видимого циферблата

  /* ---------- палитра ---------- */
  const C = {
    baseTop: '#123a22',
    baseBot: '#05190e',
    ringTop: '#113620',
    ringBot: '#061d10',
    pTopL: '#3a7a4b',
    pTopR: '#22512f',
    pBotL: '#123621',
    pBotR: '#04170c',
    edge: 'rgba(0,0,0,0.30)',
    metalHi: '#f2f4ec',
    metalMid: '#c3cbbd',
    metalLo: '#7d8a7c',
    plate: '#123a24',
    white: '#f2f1e9'
  };

  function makeCanvas(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    return c;
  }

  /* Металлический градиент для «накладных» элементов */
  function metalGrad(g, x0, y0, x1, y1) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0.00, '#ffffff');
    gr.addColorStop(0.35, '#e8ede2');
    gr.addColorStop(0.62, '#b9c4b4');
    gr.addColorStop(1.00, '#8c9a8b');
    return gr;
  }

  /* Текст с разрядкой, по центру */
  function spacedText(g, text, x, y, spacing) {
    const chars = Array.from(text);
    const widths = chars.map(ch => g.measureText(ch).width);
    let total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    let cx = x - total / 2;
    const prevAlign = g.textAlign;
    g.textAlign = 'center';
    for (let i = 0; i < chars.length; i++) {
      g.fillText(chars[i], cx + widths[i] / 2, y);
      cx += widths[i] + spacing;
    }
    g.textAlign = prevAlign;
  }

  /* Поле пирамид clous de Paris */
  function drawPyramids(g, cx, cy, radius, pxPerMm) {
    const step = 0.40 * pxPerMm;        // шаг решётки
    const h = step * 0.5;               // половина диагонали ромба
    const rows = Math.ceil((radius * 2) / h) + 2;
    const cols = Math.ceil((radius * 2) / step) + 2;

    for (let j = -1; j < rows; j++) {
      const y = -radius + j * h;
      const off = (j & 1) ? h * 0.5 : 0;
      for (let i = -1; i < cols; i++) {
        const x = -radius + i * step + off;
        const px = cx + x, py = cy + y;
        if (px < cx - radius - step || px > cx + radius + step) continue;

        // 4 грани пирамиды: центр (вершина) -> рёбра ромба
        // свет слева-сверху
        g.fillStyle = C.pTopL;
        g.beginPath(); g.moveTo(px, py);
        g.lineTo(px, py - h); g.lineTo(px - h, py); g.closePath(); g.fill();

        g.fillStyle = C.pTopR;
        g.beginPath(); g.moveTo(px, py);
        g.lineTo(px + h, py); g.lineTo(px, py - h); g.closePath(); g.fill();

        g.fillStyle = C.pBotR;
        g.beginPath(); g.moveTo(px, py);
        g.lineTo(px + h, py); g.lineTo(px, py + h); g.closePath(); g.fill();

        g.fillStyle = C.pBotL;
        g.beginPath(); g.moveTo(px, py);
        g.lineTo(px - h, py); g.lineTo(px, py + h); g.closePath(); g.fill();

        // блик на вершине
        g.fillStyle = 'rgba(255,255,255,0.10)';
        g.fillRect(px - 0.6, py - 0.6, 1.2, 1.2);

        // тонкие рёбра
        g.strokeStyle = 'rgba(0,0,0,0.22)';
        g.lineWidth = 0.7;
        g.beginPath();
        g.moveTo(px - h, py); g.lineTo(px, py - h);
        g.lineTo(px + h, py); g.lineTo(px, py + h);
        g.closePath(); g.stroke();
      }
    }
  }

  /* Нормал-мэп из яркости цветовой карты (Sobel) */
  function normalFromCanvas(src, size, strength) {
    const tmp = makeCanvas(size);
    const tg = tmp.getContext('2d');
    tg.drawImage(src, 0, 0, size, size);
    const img = tg.getImageData(0, 0, size, size);
    const d = img.data;
    const lum = new Float32Array(size * size);
    for (let i = 0; i < size * size; i++) {
      lum[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
    }

    const out = tg.createImageData(size, size);
    const o = out.data;
    const at = (x, y) => lum[((y + size) % size) * size + ((x + size) % size)];

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const l = at(x - 1, y), r = at(x + 1, y);
        const u = at(x, y - 1), dn = at(x, y + 1);
        let nx = (l - r) * strength;
        let ny = (dn - u) * strength;
        let nz = 1;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx /= len; ny /= len; nz /= len;
        const k = (y * size + x) * 4;
        o[k] = (nx * 0.5 + 0.5) * 255;
        o[k + 1] = (ny * 0.5 + 0.5) * 255;
        o[k + 2] = (nz * 0.5 + 0.5) * 255;
        o[k + 3] = 255;
      }
    }
    tg.putImageData(out, 0, 0);

    const tex = new T.CanvasTexture(tmp);
    tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
    return tex;
  }

  /* ---------------- циферблат из готового PNG ---------------- */
  function dialFromImage(img) {
    const S = 2048;
    const cv = makeCanvas(S);
    const g = cv.getContext('2d');
    const R = S / 2;

    // подложка: закрывает центральное отверстие и внешнюю альфу
    g.fillStyle = '#0a2416';
    g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.fill();

    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, S, S);

    // лёгкое усиление края, чтобы кромка не светилась
    const edge = g.createRadialGradient(R, R, R * 0.965, R, R, R);
    edge.addColorStop(0, 'rgba(0,0,0,0)');
    edge.addColorStop(1, 'rgba(0,0,0,0.22)');
    g.fillStyle = edge;
    g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.fill();

    const map = new T.CanvasTexture(cv);
    map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = 8;

    const normalMap = normalFromCanvas(cv, 1024, 1.35);
    normalMap.anisotropy = 8;

    return { map: map, normalMap: normalMap, canvas: cv };
  }

  /* ---------------- основной циферблат (fallback) ---------------- */
  function makeDial(img) {
    if (img) return dialFromImage(img);
    const S = 2048;
    const cv = makeCanvas(S);
    const g = cv.getContext('2d');
    const cx = S / 2, cy = S / 2, R = S / 2;
    const PX = S / (2 * DIAL_R);            // px на мм
    const mm = v => v * PX;
    const px = x => cx + x * PX;            // x мм -> canvas
    const py = y => cy - y * PX;            // y мм (вверх) -> canvas

    g.clearRect(0, 0, S, S);

    /* --- база --- */
    let gr = g.createRadialGradient(cx - R * 0.22, cy - R * 0.30, R * 0.03, cx, cy, R);
    gr.addColorStop(0.00, C.baseTop);
    gr.addColorStop(0.55, '#153f27');
    gr.addColorStop(1.00, C.baseBot);
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);

    /* --- пирамиды по всему полю --- */
    g.save();
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
    drawPyramids(g, cx, cy, R, PX);
    g.restore();

    /* --- приподнятое гладкое кольцо под цифры --- */
    const rIn = mm(10.9), rOut = mm(15.0);
    g.save();
    g.beginPath();
    g.arc(cx, cy, rOut, 0, Math.PI * 2);
    g.arc(cx, cy, rIn, 0, Math.PI * 2, true);
    g.clip();

    gr = g.createRadialGradient(cx - R * 0.18, cy - R * 0.26, R * 0.10, cx, cy, R * 0.98);
    gr.addColorStop(0.00, C.ringTop);
    gr.addColorStop(0.55, '#133a24');
    gr.addColorStop(1.00, C.ringBot);
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);

    // мягкая световая волна по кольцу
    gr = g.createLinearGradient(cx - rOut, cy - rOut, cx + rOut, cy + rOut);
    gr.addColorStop(0.00, 'rgba(255,255,255,0.055)');
    gr.addColorStop(0.45, 'rgba(255,255,255,0.008)');
    gr.addColorStop(1.00, 'rgba(0,0,0,0.07)');
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
    g.restore();

    /* --- фаски кольца --- */
    // внешняя кромка: тёмная канавка + светлый бортик
    g.lineWidth = mm(0.055); g.strokeStyle = 'rgba(0,0,0,0.45)';
    g.beginPath(); g.arc(cx, cy, rOut - mm(0.03), 0, Math.PI * 2); g.stroke();
    g.lineWidth = mm(0.035); g.strokeStyle = 'rgba(220,240,220,0.20)';
    g.beginPath(); g.arc(cx, cy, rOut + mm(0.03), 0, Math.PI * 2); g.stroke();

    // внутренняя кромка
    g.lineWidth = mm(0.05); g.strokeStyle = 'rgba(0,0,0,0.40)';
    g.beginPath(); g.arc(cx, cy, rIn + mm(0.025), 0, Math.PI * 2); g.stroke();
    g.lineWidth = mm(0.03); g.strokeStyle = 'rgba(225,245,225,0.16)';
    g.beginPath(); g.arc(cx, cy, rIn - mm(0.025), 0, Math.PI * 2); g.stroke();

    /* --- карман под дату --- */
    const dateX = 11.55, dateY = 0;
    g.save();
    g.fillStyle = '#123a24';
    g.beginPath();
    const pw = mm(2.55), ph = mm(2.05);
    g.roundRect(px(dateX) - pw, py(dateY) - ph, pw * 2, ph * 2, mm(0.35));
    g.fill();
    g.restore();

    /* --- дата --- */
    const dw = mm(3.10), dh = mm(2.45);
    const dx = px(dateX) - dw / 2, dy = py(dateY) - dh / 2;
    g.save();
    // окно
    const dgr = g.createLinearGradient(dx, dy, dx, dy + dh);
    dgr.addColorStop(0, '#fbfaf4');
    dgr.addColorStop(1, '#e4e2d7');
    g.fillStyle = dgr;
    g.fillRect(dx, dy, dw, dh);
    // цифра
    g.fillStyle = '#101210';
    g.font = `600 ${mm(1.80)}px "Helvetica Neue", Arial, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('8', dx + dw / 2, dy + dh / 2 + mm(0.02));
    // внутренняя тень окна
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = mm(0.05);
    g.strokeRect(dx + 0.5, dy + 0.5, dw - 1, dh - 1);
    g.restore();

    /* --- табличка TISSOT / 1853 --- */
    function plaque(x, y, w, h, r) {
      const X = px(x) - mm(w) / 2, Y = py(y) - mm(h) / 2;
      const W = mm(w), H = mm(h), RR = mm(r);
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.55)';
      g.shadowBlur = mm(0.18);
      g.shadowOffsetY = mm(0.10);
      const pg = g.createLinearGradient(X, Y, X, Y + H);
      pg.addColorStop(0, '#17442a');
      pg.addColorStop(1, '#0c2a19');
      g.fillStyle = pg;
      g.beginPath(); g.roundRect(X, Y, W, H, RR); g.fill();
      g.restore();

      // рамка: тёмная канавка + металлический бортик
      g.save();
      g.lineWidth = mm(0.10);
      g.strokeStyle = 'rgba(0,0,0,0.55)';
      g.beginPath(); g.roundRect(X - mm(0.06), Y - mm(0.06), W + mm(0.12), H + mm(0.12), RR + mm(0.05)); g.stroke();
      g.lineWidth = mm(0.055);
      g.strokeStyle = metalGrad(g, X, Y, X + W, Y + H);
      g.beginPath(); g.roundRect(X + mm(0.02), Y + mm(0.02), W - mm(0.04), H - mm(0.04), RR); g.stroke();
      g.restore();
    }

    // основная табличка
    plaque(0, 5.95, 8.30, 2.95, 0.38);
    // хвост под 1853
    plaque(0, 3.78, 3.05, 1.62, 0.30);

    /* --- TISSOT --- */
    g.save();
    g.textBaseline = 'middle';
    g.textAlign = 'center';
    g.font = `600 ${mm(1.42)}px "Helvetica Neue", Arial, sans-serif`;
    g.fillStyle = 'rgba(0,0,0,0.45)';
    spacedText(g, 'TISSOT', px(0) + mm(0.02), py(5.98) + mm(0.045), mm(0.20));
    g.fillStyle = metalGrad(g, px(0) - mm(4), py(6.7), px(0) + mm(4), py(5.2));
    spacedText(g, 'TISSOT', px(0), py(5.98), mm(0.20));
    g.restore();

    /* --- 1853 --- */
    g.save();
    g.textBaseline = 'middle';
    g.textAlign = 'center';
    g.font = `500 ${mm(0.92)}px "Helvetica Neue", Arial, sans-serif`;
    g.fillStyle = 'rgba(0,0,0,0.40)';
    spacedText(g, '1853', px(0) + mm(0.015), py(3.80) + mm(0.035), mm(0.10));
    g.fillStyle = metalGrad(g, px(0) - mm(1.5), py(4.4), px(0) + mm(1.5), py(3.2));
    spacedText(g, '1853', px(0), py(3.80), mm(0.10));
    g.restore();

    /* --- табличка Le Locle / Powermatic --- */
    plaque(0, -5.55, 7.35, 3.30, 0.36);
    plaque(0, -6.55, 4.55, 1.55, 0.26);

    /* --- Le Locle (script) --- */
    g.save();
    g.textBaseline = 'middle';
    g.textAlign = 'center';
    let scriptFont = `italic ${mm(1.62)}px "Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive`;
    g.font = scriptFont;
    let sw = g.measureText('Le Locle').width;
    if (sw > mm(5.4)) {
      const k = mm(5.4) / sw;
      g.font = `italic ${mm(1.62) * k}px "Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive`;
    }
    g.fillStyle = 'rgba(0,0,0,0.40)';
    g.fillText('Le Locle', px(0) + mm(0.02), py(5.60) + mm(0.04));
    g.fillStyle = metalGrad(g, px(0) - mm(3), py(-4.5), px(0) + mm(3), py(-6.3));
    g.fillText('Le Locle', px(0), py(-5.60));
    g.restore();

    /* --- POWERMATIC 80 --- */
    g.save();
    g.textBaseline = 'middle';
    g.textAlign = 'center';
    g.font = `500 ${mm(0.58)}px "Helvetica Neue", Arial, sans-serif`;
    g.fillStyle = 'rgba(0,0,0,0.40)';
    spacedText(g, 'POWERMATIC 80', px(0) + mm(0.012), py(-6.60) + mm(0.03), mm(0.085));
    g.fillStyle = metalGrad(g, px(0) - mm(2.4), py(-6.3), px(0) + mm(2.4), py(-7.0));
    spacedText(g, 'POWERMATIC 80', px(0), py(-6.60), mm(0.085));
    g.restore();

    /* --- SWISS / MADE --- */
    g.save();
    g.textBaseline = 'middle';
    g.textAlign = 'center';
    g.font = `500 ${mm(0.40)}px "Helvetica Neue", Arial, sans-serif`;
    g.fillStyle = 'rgba(214,226,208,0.78)';
    spacedText(g, 'SWISS', px(-2.55), py(-13.55), mm(0.05));
    spacedText(g, 'MADE', px(2.55), py(-13.55), mm(0.05));
    g.restore();

    /* --- римские цифры --- */
    const numerals = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    const NUM_R = 13.15;
    g.save();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `400 ${mm(2.10)}px "Times New Roman", Times, serif`;

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;          // 0 = 12 часов
      const x = Math.sin(a) * NUM_R;
      const y = Math.cos(a) * NUM_R;
      g.save();
      g.translate(px(x), py(y));
      g.rotate(a);

      // тень
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillText(numerals[i], mm(0.035), mm(0.075));
      // металл
      g.fillStyle = metalGrad(g, -mm(1.6), -mm(1.2), mm(1.6), mm(1.2));
      g.fillText(numerals[i], 0, 0);
      // верхний блик
      g.fillStyle = 'rgba(255,255,255,0.30)';
      g.fillText(numerals[i], 0, -mm(0.012));
      g.restore();
    }
    g.restore();

    /* --- минутная шкала по внешнему краю --- */
    g.save();
    g.translate(cx, cy);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const major = i % 5 === 0;
      g.save();
      g.rotate(a);
      const r0 = mm(15.22);
      const len = mm(major ? 0.62 : 0.34);
      const w = mm(major ? 0.085 : 0.045);
      g.fillStyle = 'rgba(238,244,232,0.94)';
      g.fillRect(-w / 2, -r0 - len, w, len);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(-w / 2 + mm(0.012), -r0 - len + mm(0.02), w, len);
      g.restore();
    }
    g.restore();

    /* --- общий световой градиент и виньетка --- */
    g.save();
    const lg = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    lg.addColorStop(0.00, 'rgba(255,255,255,0.10)');
    lg.addColorStop(0.42, 'rgba(255,255,255,0.00)');
    lg.addColorStop(1.00, 'rgba(0,0,0,0.18)');
    g.globalCompositeOperation = 'overlay';
    g.fillStyle = lg;
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    g.restore();

    g.save();
    const vg = g.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.30)');
    g.fillStyle = vg;
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    g.restore();

    const map = new T.CanvasTexture(cv);
    map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = 8;

    const normalMap = normalFromCanvas(cv, 1024, 2.2);
    normalMap.anisotropy = 8;

    return { map: map, normalMap: normalMap, canvas: cv };
  }

  /* ---------------- рео (наклонный рант с минутной шкалой) ---------------- */
  function makeRehaut() {
    const W = 2048, H = 128;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');

    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0.0, '#0b2a19');
    gr.addColorStop(0.55, '#17452a');
    gr.addColorStop(1.0, '#0e331f');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);

    // минутные штрихи: 60 делений
    for (let i = 0; i < 60; i++) {
      const x = (i / 60) * W;
      const major = i % 5 === 0;
      const len = major ? H * 0.50 : H * 0.30;
      const w = major ? 5 : 2.5;
      g.fillStyle = major ? 'rgba(236,242,230,0.95)' : 'rgba(226,236,220,0.72)';
      g.fillRect(x - w / 2, H * 0.16, w, len);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(x - w / 2 + 1, H * 0.16 + len, w, 1.5);
    }

    const t = new T.CanvasTexture(cv);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 8;
    t.wrapS = T.RepeatWrapping;
    return t;
  }

  global.DialKit = {
    DIAL_R: DIAL_R,
    makeDial: makeDial,
    makeRehaut: makeRehaut,
    normalFromCanvas: normalFromCanvas,
    makeCanvas: makeCanvas,
    metalGrad: metalGrad,
    spacedText: spacedText
  };
})(window);
