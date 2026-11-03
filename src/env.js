/* ============================================================
   ОКРУЖЕНИЕ: процедурная HDR-студия + фон
   Всё генерируется в рантайме, внешних файлов нет.
   ============================================================ */
(function (global) {
  'use strict';

  const T = global.THREE;

  /* Утилита: гауссово пятно в сферических координатах */
  function angDiff(a, b) {
    return Math.atan2(Math.sin(a - b), Math.cos(a - b));
  }

  /**
   * Эквидistant HDR-карта студии.
   * DataTexture с FloatType даёт реальные значения > 1 —
   * именно они рисуют «дорогие» длинные блики на полированной стали.
   */
  function makeStudioEnv(renderer) {
    const W = 1024, H = 512;
    const data = new Float32Array(W * H * 4);

    // Источники: theta (вокруг), phi (сверху вниз), сигмы, яркость, цвет
    const lights = [
      // узкая высокая полоса слева — главный блик
      { th: 2.35, ph: 1.02, st: 0.26, sp: 0.20, i: 5.6, c: [1.00, 0.98, 0.95] },
      // узкая вертикальная полоса справа (контровой)
      { th: 5.55, ph: 1.12, st: 0.09, sp: 0.42, i: 4.6, c: [0.86, 0.93, 1.00] },
      // тонкая верхняя полоса — длинный блик по безелю
      { th: 1.55, ph: 0.52, st: 0.42, sp: 0.055, i: 3.0, c: [1.00, 1.00, 0.98] },
      // тёплый отражённый от стола
      { th: 0.35, ph: 2.35, st: 0.50, sp: 0.26, i: 0.9, c: [1.00, 0.90, 0.78] },
      // холодная вспышка сзади-справа
      { th: 3.85, ph: 1.52, st: 0.16, sp: 0.14, i: 3.2, c: [0.78, 0.88, 1.00] },
      // мягкая подсветка со стороны камеры
      { th: 0.10, ph: 1.26, st: 0.38, sp: 0.24, i: 0.75, c: [0.92, 1.00, 0.95] },
      // широкая заливка — держит металл в средних тонах
      { th: 3.05, ph: 0.98, st: 1.05, sp: 0.50, i: 0.65, c: [0.94, 0.97, 0.95] },
      // большой софтбокс за камерой — белый блик на безеле и стекле
      { th: 0.02, ph: 1.33, st: 0.45, sp: 0.24, i: 1.15, c: [1.00, 1.00, 1.00] },
      // верхний купол — мягкая засветка верхних граней
      { th: 2.70, ph: 0.48, st: 1.05, sp: 0.24, i: 0.70, c: [1.00, 0.99, 0.97] }
    ];

    for (let y = 0; y < H; y++) {
      const v = (y + 0.5) / H;
      const phi = v * Math.PI;
      // база: тёмный градиент с тёплым горизонтом
      const horizon = Math.exp(-Math.pow((phi - 1.42) / 0.26, 2));
      let br = 0.028 + 0.062 * horizon;
      let bg = 0.033 + 0.068 * horizon;
      let bb = 0.030 + 0.056 * horizon;

      for (let x = 0; x < W; x++) {
        const th = ((x + 0.5) / W) * Math.PI * 2;
        let r = br, g = bg, b = bb;

        for (let k = 0; k < lights.length; k++) {
          const L = lights[k];
          const dth = angDiff(th, L.th) / L.st;
          const dph = (phi - L.ph) / L.sp;
          const e = Math.exp(-0.5 * (dth * dth + dph * dph));
          if (e < 0.0004) continue;
          const val = L.i * e;
          r += L.c[0] * val;
          g += L.c[1] * val;
          b += L.c[2] * val;
        }

        const i = (y * W + x) * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 1;
      }
    }

    const tex = new T.DataTexture(data, W, H, T.RGBAFormat, T.FloatType);
    tex.mapping = T.EquirectangularReflectionMapping;
    tex.needsUpdate = true;

    const pmrem = new T.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const env = pmrem.fromEquirectangular(tex).texture;
    pmrem.dispose();
    tex.dispose();
    return env;
  }

  /** Мягкий радиальный градиент для фона-подложки */
  function makeBackdropTexture() {
    const S = 1024;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');

    g.fillStyle = '#050806';
    g.fillRect(0, 0, S, S);

    // центральное зелёное свечение
    let gr = g.createRadialGradient(S * 0.50, S * 0.44, 0, S * 0.50, S * 0.44, S * 0.60);
    gr.addColorStop(0.00, 'rgba(52,86,66,0.30)');
    gr.addColorStop(0.28, 'rgba(26,48,36,0.18)');
    gr.addColorStop(0.62, 'rgba(10,18,13,0.06)');
    gr.addColorStop(1.00, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);

    // верхний холодный отсвет
    gr = g.createRadialGradient(S * 0.32, S * 0.10, 0, S * 0.32, S * 0.10, S * 0.55);
    gr.addColorStop(0, 'rgba(90,112,120,0.10)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);

    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }

  /** Ореол за часами (спрайт) */
  function makeGlowTexture() {
    const S = 512;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0.00, 'rgba(120,190,145,0.22)');
    gr.addColorStop(0.35, 'rgba(70,130,95,0.10)');
    gr.addColorStop(0.70, 'rgba(30,60,44,0.03)');
    gr.addColorStop(1.00, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    return t;
  }

  /** Мягкая тень-контакт под часами */
  function makeShadowTexture() {
    const S = 512;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0.00, 'rgba(0,0,0,0.55)');
    gr.addColorStop(0.45, 'rgba(0,0,0,0.28)');
    gr.addColorStop(0.75, 'rgba(0,0,0,0.08)');
    gr.addColorStop(1.00, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
    const t = new T.CanvasTexture(c);
    return t;
  }

  global.EnvKit = {
    makeStudioEnv: makeStudioEnv,
    makeBackdropTexture: makeBackdropTexture,
    makeGlowTexture: makeGlowTexture,
    makeShadowTexture: makeShadowTexture
  };
})(window);
