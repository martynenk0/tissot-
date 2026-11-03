/* ============================================================
   ЗАДНЯЯ КРЫШКА: стальное кольцо с гравировками, сапфировое окно,
   механика Powermatic 80, баланс, ротор, плашки TISSOT.
   ============================================================ */
(function (global) {
  'use strict';
  const T = global.THREE;

  const R_OUT = 19.02;      // внешний радиус кольца
  const R_IN = 15.02;       // радиус окна сапфира
  const ZB = -5.40;         // плоскость кольца задней крышки (тонкий корпус)

  /* Все накладки смотрят в −Z, поэтому текстуру по X отражаем. */
  function flipX(tex) {
    tex.wrapS = T.RepeatWrapping;
    tex.repeat.x = -1;
    tex.offset.x = 1;
    return tex;
  }

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  /* ---------------- кольцо с гравировками ---------------- */
  function makeRingTexture() {
    const S = 2048;
    const c = makeCanvas(S, S);
    const g = c.getContext('2d');
    const cx = S / 2, cy = S / 2;
    const PX = S / (2 * R_OUT);
    const px = v => v * PX;

    // полированное поле кольца
    let gr = g.createLinearGradient(0, 0, S, S);
    gr.addColorStop(0.00, '#d3d8d6');
    gr.addColorStop(0.30, '#b6bcba');
    gr.addColorStop(0.62, '#9aa19f');
    gr.addColorStop(1.00, '#c8cecc');
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);

    // мягкие круговые риски полировки
    g.save();
    g.globalAlpha = 0.10;
    for (let i = 0; i < 700; i++) {
      const a = Math.random() * Math.PI * 2;
      const r0 = px(R_IN) + Math.random() * (S / 2 - px(R_IN));
      const r1 = r0 + 6 + Math.random() * 70;
      g.strokeStyle = Math.random() > 0.5 ? '#ffffff' : '#8f9694';
      g.lineWidth = 0.8 + Math.random() * 1.1;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      g.stroke();
    }
    g.restore();

    // гравировка: тёмный штрих + светлый борт
    function engrave(draw) {
      g.save();
      g.fillStyle = '#7c8380';
      g.strokeStyle = '#7c8380';
      draw(1.6, 2.2);
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.strokeStyle = 'rgba(255,255,255,0.6)';
      draw(0, 0);
      g.restore();
    }

    function plainText(text, x, y, size, spacing, font) {
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `${font || '500'} ${px(size)}px "Helvetica Neue", Arial, sans-serif`;
      engrave((dx, dy) => {
        if (spacing) {
          const chars = Array.from(text);
          const w = chars.map(ch => g.measureText(ch).width);
          const total = w.reduce((a, b) => a + b, 0) + px(spacing) * (chars.length - 1);
          let cxp = cx + px(x) - total / 2 + dx;
          for (let i = 0; i < chars.length; i++) {
            g.fillText(chars[i], cxp + w[i] / 2, cy + px(y) + dy);
            cxp += w[i] + px(spacing);
          }
        } else {
          g.fillText(text, cx + px(x) + dx, cy + px(y) + dy);
        }
      });
    }

    // дуговая надпись (0 — верх, по часовой стрелке)
    function arcText(text, radiusMM, angle, size, font, spacing) {
      const r = px(radiusMM);
      g.save();
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `${font || '500'} ${px(size)}px "Helvetica Neue", Arial, sans-serif`;
      const chars = Array.from(text);
      const w = chars.map(ch => g.measureText(ch).width + px(spacing || 0.05));
      const total = w.reduce((a, b) => a + b, 0);
      let a0 = angle - (total / r) / 2;
      for (let i = 0; i < chars.length; i++) {
        const ac = a0 + (w[i] / r) / 2;
        const x = cx + Math.sin(ac) * r;
        const y = cy - Math.cos(ac) * r;
        g.save();
        g.translate(x, y);
        g.rotate(ac);
        g.fillStyle = '#7c8380';
        g.fillText(chars[i], 0.8, 1.4);
        g.fillStyle = 'rgba(255,255,255,0.62)';
        g.fillText(chars[i], 0, 0);
        g.restore();
        a0 += w[i] / r;
      }
      g.restore();
    }

    // Le Locle курсивом сверху
    g.save();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let fsz = px(2.55);
    g.font = `italic ${fsz}px "Segoe Script", "Brush Script MT", cursive`;
    let w = g.measureText('Le Locle').width;
    if (w > px(9.6)) {
      fsz *= px(9.6) / w;
      g.font = `italic ${fsz}px "Segoe Script", "Brush Script MT", cursive`;
    }
    g.fillStyle = '#7c8380';
    g.fillText('Le Locle', cx + 1.3, cy - px(16.55) + 2.0);
    g.fillStyle = 'rgba(255,255,255,0.62)';
    g.fillText('Le Locle', cx, cy - px(16.55));
    g.restore();

    // верхняя корона-орнамент под надписью
    engrave((dx, dy) => {
      g.save();
      g.translate(cx + dx, cy - px(13.9) + dy);
      g.beginPath();
      g.moveTo(-px(1.5), 0);
      g.quadraticCurveTo(-px(0.6), -px(0.55), 0, -px(0.95));
      g.quadraticCurveTo(px(0.6), -px(0.55), px(1.5), 0);
      g.stroke();
      g.beginPath();
      g.arc(0, px(0.35), px(0.34), 0, Math.PI * 2);
      g.stroke();
      g.restore();
    });

    arcText('ETANCHE 3bar (30m/100ft)', 17.0, Math.PI * 0.80, 0.72, '500', 0.03);
    arcText('GLACE SAPHIR', 17.0, -Math.PI * 0.80, 0.72, '500', 0.03);
    arcText('T006.407.11.093.00', 16.55, Math.PI, 0.58, '400', 0.05);
    arcText('ULX DUU 4JL', 18.05, Math.PI, 0.52, '400', 0.05);

    // боковые орнаменты
    engrave((dx, dy) => {
      g.save();
      g.translate(cx + dx, cy + dy);
      g.lineWidth = 2.4;
      for (const s of [-1, 1]) {
        g.beginPath();
        const bx = s * px(17.25);
        g.moveTo(bx - s * px(0.75), -px(0.9));
        g.bezierCurveTo(bx + s * px(1.15), -px(1.0), bx + s * px(1.35), px(0.35), bx, px(0.65));
        g.bezierCurveTo(bx - s * px(0.9), px(0.95), bx - s * px(0.65), -px(0.15), bx, -px(0.05));
        g.stroke();
      }
      g.restore();
    });

    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }

  /* ---------------- плашка TISSOT ---------------- */
  function makeTissotTexture() {
    const W = 1024, H = 360;
    const c = makeCanvas(W, H);
    const g = c.getContext('2d');

    // фон: мелкая «рыбья чешуя» как на референсе
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#b9bfbb');
    gr.addColorStop(0.5, '#98a09a');
    gr.addColorStop(1, '#c2c8c4');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);

    g.save();
    g.globalAlpha = 0.30;
    g.strokeStyle = '#6b736e';
    g.lineWidth = 2;
    for (let y = -20; y < H + 20; y += 18) {
      for (let x = -20; x < W + 20; x += 18) {
        g.beginPath();
        g.arc(x + (Math.round(y / 18) % 2 ? 9 : 0), y, 8, 0.15 * Math.PI, 0.85 * Math.PI);
        g.stroke();
      }
    }
    g.restore();

    // рамка
    g.strokeStyle = 'rgba(80,88,84,0.75)';
    g.lineWidth = 7;
    g.strokeRect(16, 16, W - 32, H - 32);

    // TISSOT — полированные буквы
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '600 128px "Helvetica Neue", Arial, sans-serif';
    g.fillStyle = 'rgba(70,78,74,0.85)';
    g.fillText('TISSOT', W / 2 + 2, H / 2 + 5);
    const tg = g.createLinearGradient(0, H * 0.28, 0, H * 0.72);
    tg.addColorStop(0, '#ffffff');
    tg.addColorStop(0.55, '#e6eae7');
    tg.addColorStop(1, '#a9b1ac');
    g.fillStyle = tg;
    g.fillText('TISSOT', W / 2, H / 2);

    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }

  /* ---------------- перекладина MECANIQUE / 1853 / AUTOMATIQUE ---------------- */
  function makeBarTexture() {
    const W = 2048, H = 420;
    const c = makeCanvas(W, H);
    const g = c.getContext('2d');

    // сталь с круговой шлифовкой
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#eff2ef');
    gr.addColorStop(0.35, '#d5dad6');
    gr.addColorStop(0.7, '#c0c6c2');
    gr.addColorStop(1, '#e4e8e5');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);

    g.save();
    g.globalAlpha = 0.16;
    for (let i = 0; i < 500; i++) {
      const y = Math.random() * H;
      g.strokeStyle = Math.random() > 0.5 ? '#ffffff' : '#8b938e';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + (Math.random() - 0.5) * 3); g.stroke();
    }
    g.restore();

    function label(text, x, size) {
      g.save();
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `500 ${size}px "Helvetica Neue", Arial, sans-serif`;
      g.fillStyle = '#6e7671';
      g.fillText(text, x + 2, H / 2 + 4);
      g.fillStyle = '#fbfcfb';
      g.fillText(text, x, H / 2);
      g.restore();
    }

    label('MECANIQUE', W * 0.255, 118);
    label('AUTOMATIQUE', W * 0.745, 118);

    // овал 1853
    g.save();
    g.translate(W / 2, H / 2);
    g.fillStyle = '#cfd5d0';
    g.beginPath(); g.ellipse(0, 0, 210, 130, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#8b938e';
    g.lineWidth = 8;
    g.beginPath(); g.ellipse(0, 0, 200, 122, 0, 0, Math.PI * 2); g.stroke();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '500 146px "Helvetica Neue", Arial, sans-serif';
    g.fillStyle = '#6e7671';
    g.fillText('1853', 3, 6);
    g.fillStyle = '#fbfcfb';
    g.fillText('1853', 0, 0);
    g.restore();

    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }

  /* ---------------- механизм ---------------- */
  function makeMovementTexture() {
    const S = 1024;
    const c = makeCanvas(S, S);
    const g = c.getContext('2d');
    const cx = S / 2, cy = S / 2;

    // тёмная база
    let gr = g.createRadialGradient(cx - 80, cy - 120, 40, cx, cy, S * 0.55);
    gr.addColorStop(0, '#3a3f3c');
    gr.addColorStop(0.65, '#242927');
    gr.addColorStop(1, '#101413');
    g.fillStyle = gr;
    g.beginPath(); g.arc(cx, cy, S * 0.55, 0, Math.PI * 2); g.fill();

    // Женевские полосы на мостах (верхняя половина)
    g.save();
    g.beginPath();
    g.arc(cx, cy, S * 0.54, 0, Math.PI * 2);
    g.clip();
    g.globalAlpha = 0.22;
    for (let i = -26; i < 46; i++) {
      g.strokeStyle = i % 2 ? '#cfd6cd' : '#6d766f';
      g.lineWidth = 8;
      g.beginPath();
      for (let x = 0; x <= S; x += 10) {
        const y = i * 27 + Math.sin(x * 0.011 + i * 0.6) * 6;
        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.restore();

    // мосты сверху
    function bridge(x, y, w, h, rot) {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      const bg = g.createLinearGradient(0, -h / 2, 0, h / 2);
      bg.addColorStop(0, '#b9c1bb');
      bg.addColorStop(0.45, '#8d968f');
      bg.addColorStop(1, '#5c6560');
      g.fillStyle = bg;
      g.beginPath();
      if (g.roundRect) g.roundRect(-w / 2, -h / 2, w, h, h * 0.4);
      else g.rect(-w / 2, -h / 2, w, h);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 2;
      g.stroke();
      g.restore();
    }

    bridge(cx - 150, cy - 210, 330, 150, -0.35);
    bridge(cx + 160, cy - 250, 300, 130, 0.42);
    bridge(cx - 250, cy - 60, 220, 110, 0.10);

    // камни
    for (const [x, y] of [[cx - 40, cy - 150], [cx + 120, cy - 95], [cx - 300, cy - 30], [cx + 250, cy + 40]]) {
      const jg = g.createRadialGradient(x - 6, y - 6, 2, x, y, 26);
      jg.addColorStop(0, '#e05a6a');
      jg.addColorStop(0.5, '#a01f2f');
      jg.addColorStop(1, '#4d0a12');
      g.fillStyle = jg;
      g.beginPath(); g.arc(x, y, 24, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,220,220,0.35)';
      g.lineWidth = 3;
      g.stroke();
    }

    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }

  /* ---------------- ротор ---------------- */
  function makeRotorTexture() {
    const S = 1024;
    const c = makeCanvas(S, S);
    const g = c.getContext('2d');
    const cx = S / 2, cy = S / 2;

    const gr = g.createLinearGradient(0, 0, 0, S);
    gr.addColorStop(0, '#b2b9b5');
    gr.addColorStop(0.45, '#7e8681');
    gr.addColorStop(1, '#aab1ad');
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);

    // круговая шлифовка — «côtes circulaires»
    g.save();
    g.globalAlpha = 0.30;
    for (let r = 26; r < S * 0.62; r += 2.6) {
      g.strokeStyle = (Math.round(r) % 6 === 0) ? '#ffffff' : '#5a625d';
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.stroke();
    }
    g.restore();

    // тёмная гравировка ближе к краю ротора
    g.save();
    g.globalAlpha = 0.20;
    g.strokeStyle = '#3f4642';
    g.lineWidth = 10;
    g.beginPath(); g.arc(cx, cy, S * 0.40, 0, Math.PI * 2); g.stroke();
    g.restore();

    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }

  /* ---------------- сборка ---------------- */
  function build(renderer, M) {
    const grp = new T.Group();

    // стенка крышки
    const wallGeo = new T.CylinderGeometry(R_OUT, R_OUT - 0.06, 0.86, 192, 1, true);
    wallGeo.rotateX(Math.PI / 2);
    const wall = new T.Mesh(wallGeo, M.satin);
    wall.position.z = ZB + 0.45;
    grp.add(wall);

    // кольцо с гравировками
    const ringTex = makeRingTexture();
    const ringMat = new T.MeshPhysicalMaterial({
      map: ringTex, color: 0xb4bab8, metalness: 1.0, roughness: 0.24,
      bumpMap: ringTex, bumpScale: 0.015, envMapIntensity: 0.9
    });
    const ring = new T.Mesh(new T.RingGeometry(R_IN, R_OUT, 256, 1), ringMat);
    ring.rotation.y = Math.PI;
    ring.position.z = ZB;
    grp.add(ring);

    // кромки кольца
    for (const [r, tube] of [[R_IN + 0.06, 0.16], [R_OUT - 0.06, 0.22]]) {
      const tor = new T.Mesh(new T.TorusGeometry(r, tube, 12, 220), M.polished);
      tor.position.z = ZB;
      grp.add(tor);
    }

    // сапфировое окно
    const glass = new T.Mesh(new T.CircleGeometry(R_IN + 0.12, 192), M.glassBack);
    glass.rotation.y = Math.PI;
    glass.position.z = ZB + 0.02;
    glass.renderOrder = 3;
    grp.add(glass);

    // механизм
    const movTex = makeMovementTexture();
    const plate = new T.Mesh(
      new T.CircleGeometry(R_IN + 0.35, 192),
      new T.MeshPhysicalMaterial({
        map: movTex, color: 0x7d8580, metalness: 0.85, roughness: 0.48,
        envMapIntensity: 0.42
      })
    );
    plate.rotation.y = Math.PI;
    plate.position.z = ZB + 0.46;
    grp.add(plate);

    // балансовое колесо
    const gold = new T.MeshPhysicalMaterial({
      color: 0xd7b56a, metalness: 1.0, roughness: 0.22, envMapIntensity: 1.4
    });
    const balance = new T.Group();
    balance.add(new T.Mesh(new T.TorusGeometry(2.55, 0.19, 12, 96), gold));
    for (let i = 0; i < 3; i++) {
      const spoke = new T.Mesh(new T.BoxGeometry(4.95, 0.14, 0.13), gold);
      spoke.rotation.z = (i / 3) * Math.PI * 2;
      balance.add(spoke);
    }
    const hub = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.42, 24), gold);
    hub.geometry.rotateX(Math.PI / 2);
    balance.add(hub);
    balance.position.set(-5.8, 5.7, ZB + 0.52);
    grp.add(balance);

    // ротор: сектор снизу
    const rotorTex = makeRotorTexture();
    const rotorShape = new T.Shape();
    rotorShape.absarc(0, 0, 14.75, Math.PI * 1.08, Math.PI * 1.92, false);
    rotorShape.absarc(0, 0, 3.20, Math.PI * 1.92, Math.PI * 1.08, true);
    const rotorMat = new T.MeshPhysicalMaterial({
      map: rotorTex, color: 0xa6ada9, metalness: 1.0, roughness: 0.40,
      envMapIntensity: 0.72, side: T.DoubleSide
    });
    const rotorGeo = new T.ShapeGeometry(rotorShape, 72);
    // ShapeGeometry даёт UV в мировых координатах — нормируем,
    // иначе круговая шлифовка ротора выглядит плоским пятном.
    rotorGeo.computeBoundingBox();
    {
      const bb = rotorGeo.boundingBox;
      const sx = bb.max.x - bb.min.x || 1;
      const sy = bb.max.y - bb.min.y || 1;
      const p = rotorGeo.attributes.position;
      const uvArr = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i++) {
        uvArr[i * 2] = (p.getX(i) - bb.min.x) / sx;
        uvArr[i * 2 + 1] = (p.getY(i) - bb.min.y) / sy;
      }
      rotorGeo.setAttribute('uv', new T.BufferAttribute(uvArr, 2));
    }
    const rotor = new T.Mesh(rotorGeo, rotorMat);
    rotor.rotation.y = Math.PI;
    rotor.position.z = ZB + 0.42;
    grp.add(rotor);

    // гравировка TISSOT / 1853 на роторе
    const ovalC = makeCanvas(512, 300);
    const og = ovalC.getContext('2d');
    og.clearRect(0, 0, 512, 300);
    og.textAlign = 'center';
    og.textBaseline = 'middle';
    og.fillStyle = 'rgba(40,46,43,0.55)';
    og.font = '600 92px "Helvetica Neue", Arial, sans-serif';
    og.fillText('TISSOT', 258, 114);
    og.font = '500 86px "Helvetica Neue", Arial, sans-serif';
    og.fillText('1853', 258, 218);
    og.fillStyle = '#e8ece9';
    og.font = '600 92px "Helvetica Neue", Arial, sans-serif';
    og.fillText('TISSOT', 256, 110);
    og.font = '500 86px "Helvetica Neue", Arial, sans-serif';
    og.fillText('1853', 256, 214);
    const ovalTex = new T.CanvasTexture(ovalC);
    ovalTex.colorSpace = T.SRGBColorSpace;
    const oval = new T.Mesh(
      new T.PlaneGeometry(5.6, 3.3),
      new T.MeshPhysicalMaterial({
        map: ovalTex, transparent: true, metalness: 0.9,
        roughness: 0.34, envMapIntensity: 0.9
      })
    );
    oval.rotation.y = Math.PI;
    oval.position.set(0, -5.6, ZB + 0.49);
    grp.add(oval);

    return grp;
  }

  global.BackKit = { build: build };
})(window);
