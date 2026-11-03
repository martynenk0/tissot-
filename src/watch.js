/* ============================================================
   ЧАСЫ: корпус, безель, стекло, ушки, головка, стрелки, браслет
   Единицы — миллиметры. Циферблат лежит в плоскости XY, z=0.
   ============================================================ */
(function (global) {
  'use strict';
  const T = global.THREE;
  const D = global.DialKit;

  const CASE_R = 19.65;
  const LUG2LUG = 48.0;
  const LUG_W = 19.0;

  /* ---------- процедурные текстуры стали ---------- */
  /* Одна «вертикальная» шлифовка: тонкие штрихи вдоль V.
     Из неё делаем и roughnessMap, и normalMap — металл начинает
     играть длинными узкими бликами, как на референсе. */
  function brushCanvas(S) {
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');

    g.fillStyle = '#8f8f8f';
    g.fillRect(0, 0, S, S);

    // мягкие широкие полосы — неравномерность шлифовки
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * S;
      const w = S * (0.008 + Math.random() * 0.05);
      const lv = Math.random() > 0.5 ? 255 : 20;
      const gr = g.createLinearGradient(x - w, 0, x + w, 0);
      gr.addColorStop(0, 'rgba(' + lv + ',' + lv + ',' + lv + ',0)');
      gr.addColorStop(0.5, 'rgba(' + lv + ',' + lv + ',' + lv + ',' + (0.04 + Math.random() * 0.05) + ')');
      gr.addColorStop(1, 'rgba(' + lv + ',' + lv + ',' + lv + ',0)');
      g.fillStyle = gr;
      g.fillRect(x - w, 0, w * 2, S);
    }

    // тонкие длинные риски
    for (let i = 0; i < 15000; i++) {
      const x = Math.random() * S;
      const y = Math.random() * S;
      const len = S * (0.08 + Math.random() * 0.55);
      const v = Math.random() > 0.52 ? 255 : 0;
      g.strokeStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (0.025 + Math.random() * 0.075) + ')';
      g.lineWidth = 0.5 + Math.random() * 0.85;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (Math.random() - 0.5) * 1.1, y + len);
      g.stroke();
    }

    // редкие глубокие царапины-бороздки
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * S;
      const y = Math.random() * S;
      const len = S * (0.2 + Math.random() * 0.7);
      g.strokeStyle = Math.random() > 0.5
        ? 'rgba(255,255,255,0.10)'
        : 'rgba(0,0,0,0.10)';
      g.lineWidth = 1 + Math.random() * 2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (Math.random() - 0.5) * 2, y + len);
      g.stroke();
    }

    // лёгкий градиент сверху вниз, чтобы карта не была плоской
    const vg = g.createLinearGradient(0, 0, 0, S);
    vg.addColorStop(0, 'rgba(255,255,255,0.06)');
    vg.addColorStop(0.5, 'rgba(255,255,255,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.06)');
    g.fillStyle = vg;
    g.fillRect(0, 0, S, S);
    return c;
  }

  function makeBrushMaps(rx, ry) {
    const S = 1024;
    const src = brushCanvas(S);

    const rough = new T.CanvasTexture(src);
    rough.wrapS = rough.wrapT = T.RepeatWrapping;
    rough.repeat.set(rx, ry);
    rough.anisotropy = 8;

    const normal = D.normalFromCanvas(src, 1024, 2.0);
    normal.wrapS = normal.wrapT = T.RepeatWrapping;
    normal.repeat.set(rx, ry);
    normal.anisotropy = 8;

    return { rough: rough, normal: normal };
  }

  function materials() {
    // шлифовка корпуса: штрихи идут вдоль высоты корпуса
    const caseBrush = makeBrushMaps(5, 1);
    // шлифовка браслета: штрихи идут вдоль длины звена
    const linkBrush = makeBrushMaps(2, 1);

    const satinCase = new T.MeshPhysicalMaterial({
      color: 0xc9ced2, metalness: 1.0,
      roughness: 0.90, roughnessMap: caseBrush.rough,
      normalMap: caseBrush.normal,
      normalScale: new T.Vector2(0.30, 0.30),
      clearcoat: 0.22, clearcoatRoughness: 0.42,
      envMapIntensity: 1.05, side: T.DoubleSide
    });

    // широкие внешние звенья — тёмная сатинированная сталь
    const satinLink = new T.MeshPhysicalMaterial({
      color: 0x8f9599, metalness: 1.0,
      roughness: 0.60, roughnessMap: linkBrush.rough,
      normalMap: linkBrush.normal,
      normalScale: new T.Vector2(0.40, 0.40),
      clearcoat: 0.05, clearcoatRoughness: 0.38,
      envMapIntensity: 0.62
    });

    // узкие внутренние звенья — полированные, но не «белые»
    const linkPolish = new T.MeshPhysicalMaterial({
      color: 0x9aa0a4, metalness: 1.0,
      roughness: 0.26, roughnessMap: linkBrush.rough,
      normalMap: linkBrush.normal,
      normalScale: new T.Vector2(0.16, 0.16),
      clearcoat: 0.32, clearcoatRoughness: 0.16,
      envMapIntensity: 0.62
    });

    return {
      polished: new T.MeshPhysicalMaterial({
        color: 0xe4e7ea, metalness: 1.0, roughness: 0.055,
        clearcoat: 1.0, clearcoatRoughness: 0.03, envMapIntensity: 1.35,
        side: T.DoubleSide
      }),
      satin: satinCase,
      satinLink: satinLink,
      linkPolish: linkPolish,
      satinDark: new T.MeshPhysicalMaterial({
        color: 0xb7bcc1, metalness: 1.0, roughness: 0.38, envMapIntensity: 1.3
      }),
      glass: new T.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 0.0, roughness: 0.02,
        transmission: 1.0, thickness: 0.55, ior: 1.77,
        clearcoat: 0.5, clearcoatRoughness: 0.02,
        envMapIntensity: 0.55, specularIntensity: 0.55
      }),
      glassBack: new T.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 0.0, roughness: 0.03,
        transmission: 0.96, thickness: 0.5, ior: 1.77,
        clearcoat: 0.2, clearcoatRoughness: 0.04,
        envMapIntensity: 0.28
      }),
      dark: new T.MeshStandardMaterial({
        color: 0x0a0c0b, metalness: 0.4, roughness: 0.6
      })
    };
  }

  function rrectShape(w, h, r) {
    const s = new T.Shape();
    const x = -w / 2, y = -h / 2;
    r = Math.min(r, Math.min(w, h) / 2);
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  function bevelBox(w, h, d, r, bevel) {
    const geo = new T.ExtrudeGeometry(rrectShape(w, h, r), {
      depth: Math.max(0.01, d - bevel * 2),
      bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
      bevelSegments: 3, curveSegments: 8
    });
    geo.center();
    return geo;
  }

  function lathe(points, segments) {
    const v = points.map(p => new T.Vector2(p[0], p[1]));
    const g = new T.LatheGeometry(v, segments || 192);
    g.rotateX(Math.PI / 2);
    return g;
  }

  /* ---------- корпус ---------- */
  /* Профиль по боковому референсу:
     узкий полированный безель, тонкий сатинированный пояс,
     полированная нижняя фаска к задней крышке. */
  function buildCase(M, dialImg) {
    const grp = new T.Group();

    // сатинированный пояс: почти цилиндр, едва заметная бочка
    const bandPts = [
      [19.61, 2.14], [19.68, 1.60], [19.70, 0.40], [19.70, -1.15],
      [19.68, -2.55], [19.62, -3.34]
    ];
    const band = new T.Mesh(lathe(bandPts, 288), M.satin);
    grp.add(band);

    // полированная нижняя фаска
    const bottomPts = [
      [19.62, -3.34], [19.58, -3.84], [19.48, -4.18],
      [19.30, -4.40], [19.10, -4.50]
    ];
    const bottom = new T.Mesh(lathe(bottomPts, 288), M.polished);
    grp.add(bottom);

    // безель: узкое полированное кольцо, почти плоское сверху
    const bezelPts = [
      [18.02, 0.62], [18.04, 1.68], [18.10, 2.08], [18.20, 2.30],
      [18.38, 2.42], [18.66, 2.47], [19.04, 2.47], [19.36, 2.41],
      [19.55, 2.29], [19.64, 2.16]
    ];
    const bezel = new T.Mesh(lathe(bezelPts, 320), M.polished);
    grp.add(bezel);

    // тонкая тёмная прокладка по внутренней кромке безеля
    const gasket = new T.Mesh(
      new T.TorusGeometry(18.01, 0.042, 8, 220),
      M.dark
    );
    gasket.position.z = 0.78;
    grp.add(gasket);

    // циферблат (готовый PNG пользователя)
    const dial = D.makeDial(dialImg);
    const dialMat = new T.MeshPhysicalMaterial({
      map: dial.map, normalMap: dial.normalMap,
      normalScale: new T.Vector2(0.72, 0.72),
      metalness: 0.05, roughness: 0.44,
      clearcoat: 0.26, clearcoatRoughness: 0.30,
      envMapIntensity: 0.55
    });
    const dialMesh = new T.Mesh(new T.CircleGeometry(17.99, 256), dialMat);
    dialMesh.position.z = 0.02;
    grp.add(dialMesh);

    // сапфировое стекло — очень пологий купол, почти заподлицо
    const sag = 0.55, R = (17.91 * 17.91 + sag * sag) / (2 * sag);
    const thetaMax = Math.asin(17.91 / R);
    const glassGeo = new T.SphereGeometry(R, 176, 44, 0, Math.PI * 2, 0, thetaMax);
    glassGeo.rotateX(Math.PI / 2);
    const glass = new T.Mesh(glassGeo, M.glass);
    glass.position.z = 2.55 - R;
    glass.renderOrder = 2;
    grp.add(glass);

    return grp;
  }

  /* ---------- ушки ---------- */
  /* Лофт ушка: тонкое полированное «перо», которое выходит из корпуса
     и плавно загибается вниз. Сечение — сглаженный прямоугольник. */
  function lugGeometry() {
    // [y, z-центр, полуширина по X, полутолщина по Z]
    const ctrl = [
      [14.2, 0.02, 2.42, 1.58],
      [16.2, -0.04, 2.36, 1.52],
      [18.0, -0.30, 2.26, 1.41],
      [19.6, -0.76, 2.12, 1.24],
      [20.9, -1.32, 1.96, 1.04],
      [22.0, -1.96, 1.79, 0.84],
      [22.9, -2.62, 1.60, 0.64],
      [23.5, -3.24, 1.42, 0.47],
      [23.8, -3.58, 1.26, 0.34]
    ];

    function cr(p0, p1, p2, p3, t) {
      const t2 = t * t, t3 = t2 * t;
      return 0.5 * ((2 * p1) + (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
    }

    const STEPS = 28, N = 36;
    const pos = [], uv = [], idx = [];
    const last = ctrl.length - 1;

    function sample(i, ch) {
      const u = (i / STEPS) * last;
      const k = Math.min(last - 1, Math.floor(u));
      const t = u - k;
      const p0 = ctrl[Math.max(0, k - 1)][ch];
      const p1 = ctrl[k][ch];
      const p2 = ctrl[k + 1][ch];
      const p3 = ctrl[Math.min(last, k + 2)][ch];
      return cr(p0, p1, p2, p3, t);
    }

    for (let i = 0; i <= STEPS; i++) {
      const y = sample(i, 0), zc = sample(i, 1);
      const hw = sample(i, 2), hh = sample(i, 3);
      for (let k = 0; k < N; k++) {
        const a = (k / N) * Math.PI * 2;
        const c = Math.cos(a), sn = Math.sin(a);
        const ex = Math.sign(c) * Math.pow(Math.abs(c), 0.44);
        const ey = Math.sign(sn) * Math.pow(Math.abs(sn), 0.44);
        // лёгкий наклон верхней грани наружу — ушко «стекает» к браслету
        pos.push(hw * ex, y, zc + hh * ey - 0.085 * hw * ex);
        uv.push(k / N, i / STEPS);
      }
    }

    for (let i = 0; i < STEPS; i++) {
      for (let k = 0; k < N; k++) {
        const k2 = (k + 1) % N;
        const a = i * N + k, b = i * N + k2;
        const c = (i + 1) * N + k, d = (i + 1) * N + k2;
        idx.push(a, c, b, b, c, d);
      }
    }

    // торцы
    for (const [si, flip] of [[0, true], [STEPS, false]]) {
      const y = sample(si, 0), zc = sample(si, 1);
      const center = pos.length / 3;
      pos.push(0, y, zc);
      uv.push(0.5, si === 0 ? 0 : 1);
      for (let k = 0; k < N; k++) {
        const k2 = (k + 1) % N;
        const a = si * N + k, b = si * N + k2;
        if (flip) idx.push(center, a, b); else idx.push(center, b, a);
      }
    }

    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }

  function buildLugs(M) {
    const geo = lugGeometry();
    const grp = new T.Group();

    // ушки стоят по краям браслета и «зажимают» его
    for (const sx of [10.95, -10.95]) {
      for (const sy of [1, -1]) {
        const mesh = new T.Mesh(geo, M.polished);
        mesh.position.x = sx;
        mesh.scale.y = sy;
        grp.add(mesh);
      }
    }
    return grp;
  }

  /* ---------- заводная головка ---------- */
  function buildCrown(M) {
    const grp = new T.Group();
    const CZ = -0.62;

    // втулка с фаской
    const tube = new T.Mesh(new T.CylinderGeometry(1.32, 1.32, 1.05, 64), M.polished);
    tube.geometry.rotateZ(-Math.PI / 2);
    tube.position.set(19.42, 0, CZ);
    grp.add(tube);

    // корпус головки: узкий по оси, с 26 глубокими насечками
    const FLUTES = 26;
    const R0 = 2.20;
    const geo = new T.CylinderGeometry(R0, R0, 1.13, 260, 1, false);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const r = Math.sqrt(x * x + z * z);
      if (r < 0.01) continue;
      const th = Math.atan2(z, x);
      // острая насечка: узкие канавки между широкими полированными гребнями
      const c = Math.cos(th * FLUTES);
      const k = 1 - 0.045 * Math.pow(Math.max(0, -c), 1.4) + 0.012 * Math.abs(c);
      pos.setX(i, x * k);
      pos.setZ(i, z * k);
    }
    geo.computeVertexNormals();
    geo.rotateZ(-Math.PI / 2);
    const crown = new T.Mesh(geo, M.polished);
    crown.position.set(20.92, 0, CZ);
    grp.add(crown);

    // полированная фаска-кольцо у основания
    const baseRing = new T.Mesh(new T.TorusGeometry(2.18, 0.10, 12, 120), M.polished);
    baseRing.geometry.rotateY(Math.PI / 2);
    baseRing.position.set(20.37, 0, CZ);
    grp.add(baseRing);

    // концевая шайба с мягким куполом (без логотипа)
    const capProfile = [
      [0.00, 0.10], [0.62, 0.09], [1.22, 0.05], [1.68, -0.03],
      [1.98, -0.14], [2.16, -0.30], [2.20, -0.44]
    ];
    const capGeo = lathe(capProfile, 160);
    capGeo.rotateY(-Math.PI / 2);
    const cap = new T.Mesh(capGeo, M.polished);
    cap.position.set(21.50, 0, CZ);
    grp.add(cap);

    // тонкий тёмный зазор между головкой и втулкой
    const gap = new T.Mesh(new T.TorusGeometry(1.72, 0.055, 8, 96), M.dark);
    gap.geometry.rotateY(Math.PI / 2);
    gap.position.set(20.36, 0, CZ);
    grp.add(gap);

    return grp;
  }

  /* ---------- стрелки ---------- */
  /* Гранёные dauphine: две плоские грани сходятся к центральному ребру.
     Геометрия неиндексированная, поэтому нормали дают чёткие фасетки. */
  function dauphineGeometry(len, w, tail, ridge) {
    const P0 = [0, -tail, 0.0];              // пятка
    const P1 = [0, len * 0.52, ridge];       // вершина ребра
    const P2 = [0, len, 0.0];                // кончик
    const L = [-w, len * 0.24, 0.0];         // левый широкий угол
    const R = [w, len * 0.24, 0.0];          // правый широкий угол

    const pos = [];
    const push = (...v) => { for (const p of v) pos.push(p[0], p[1], p[2]); };

    // верхние фасетки (смотрят на зрителя, +Z)
    push(P0, P1, L);
    push(P1, P2, L);
    push(P0, R, P1);
    push(P1, R, P2);

    // низ — плоская тонкая пластина
    push(P0, L, P2);
    push(P0, P2, R);

    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    return geo;
  }

  function handShape(M, len, w, tail, ridge, z) {
    const g = new T.Group();
    const geo = dauphineGeometry(len, w, tail, ridge);
    const mesh = new T.Mesh(geo, M.polished);
    mesh.position.z = z;
    g.add(mesh);

    // нижняя пластина придаёт стрелке толщину на просвет
    const under = new T.Mesh(
      new T.ExtrudeGeometry(new T.Shape(
        [new T.Vector2(0, -tail), new T.Vector2(w, len * 0.24),
         new T.Vector2(0, len), new T.Vector2(-w, len * 0.24)]
      ), { depth: 0.09, bevelEnabled: false }),
      M.polished
    );
    under.position.z = z - 0.09;
    g.add(under);
    return g;
  }

  function buildHands(M) {
    const grp = new T.Group();

    const hour = handShape(M, 9.80, 0.61, 1.10, 0.10, 0.44);
    const minute = handShape(M, 15.60, 0.53, 1.20, 0.09, 0.61);

    // секундная — тонкая игла с шариком-противовесом
    const sec = new T.Group();
    const needle = new T.Mesh(bevelBox(0.095, 17.6, 0.085, 0.04, 0.02), M.polished);
    needle.position.set(0, 6.55, 0.78);
    sec.add(needle);
    const ball = new T.Mesh(new T.SphereGeometry(0.48, 20, 14), M.polished);
    ball.position.set(0, -2.35, 0.78);
    sec.add(ball);
    const neck = new T.Mesh(new T.CylinderGeometry(0.10, 0.10, 1.6, 12), M.polished);
    neck.geometry.rotateX(Math.PI / 2);
    neck.position.set(0, -1.55, 0.78);
    sec.add(neck);

    const h = 10 + 10 / 60;              // 10:10:00
    hour.rotation.z = -(h / 12) * Math.PI * 2;
    minute.rotation.z = -(10 / 60) * Math.PI * 2;
    sec.rotation.z = 0;

    grp.add(hour, minute, sec);

    // ступица
    const hub = new T.Mesh(new T.CylinderGeometry(1.00, 1.12, 0.54, 64), M.polished);
    hub.geometry.rotateX(Math.PI / 2);
    hub.position.z = 0.54;
    grp.add(hub);
    const hubTop = new T.Mesh(new T.CylinderGeometry(0.54, 0.70, 0.24, 48), M.polished);
    hubTop.geometry.rotateX(Math.PI / 2);
    hubTop.position.z = 0.87;
    grp.add(hubTop);

    return grp;
  }

  /* ---------- браслет ---------- */
  /* Ветвь начинается ПОД корпусом и плавно загибается назад,
     как будто браслет надет на запястье. */
  const BR_Y0 = 18.4;
  const BR_Z0 = -2.95;

  function curveFor(sign) {
    // K < 1 укорачивает браслет, сохраняя форму дуги вокруг запястья
    const K = 0.235;
    const ctrl = [
      [18.4, -2.95], [24.0, -4.20], [30.0, -6.60], [37.0, -10.60],
      [45.0, -16.50], [54.0, -24.50], [64.0, -35.00], [75.0, -48.50],
      [87.0, -65.00], [100.0, -85.00], [114.0, -108.00],
      [129.0, -134.00], [145.0, -163.00], [163.0, -197.00],
      [182.0, -234.00]
    ].map(p => [
      BR_Y0 + (p[0] - BR_Y0) * K,
      BR_Z0 + (p[1] - BR_Z0) * K
    ]);
    // без длинного хвоста: браслет короткий и заканчивается застёжкой
    return new T.CatmullRomCurve3(
      ctrl.map(p => new T.Vector3(0, sign * p[0], p[1])),
      false, 'centripetal', 0.5
    );
  }

  /* гравировка на застёжке — без яркой белой подложки */
  function makeClaspText() {
    const W = 1024, H = 220;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#c2c8c5';
    g.fillRect(0, 0, W, H);
    g.save();
    g.globalAlpha = 0.13;
    for (let i = 0; i < 320; i++) {
      g.strokeStyle = Math.random() > 0.5 ? '#ffffff' : '#5a605c';
      g.lineWidth = 1;
      const y = Math.random() * H;
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + (Math.random() - 0.5) * 3); g.stroke();
    }
    g.restore();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#8b928d';
    g.font = '600 92px "Helvetica Neue", Arial, sans-serif';
    g.fillText('TISSOT', W / 2 + 1.5, H * 0.40 + 2);
    g.font = '500 56px "Helvetica Neue", Arial, sans-serif';
    g.fillText('1853', W / 2 + 1.5, H * 0.71 + 2);
    g.fillStyle = '#646b66';
    g.font = '600 92px "Helvetica Neue", Arial, sans-serif';
    g.fillText('TISSOT', W / 2, H * 0.40);
    g.font = '500 56px "Helvetica Neue", Arial, sans-serif';
    g.fillText('1853', W / 2, H * 0.71);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }

  /* Звено: объёмный металлический брусок.
     Сечение — скруглённый прямоугольник; по длине есть выраженные
     фаски на торцах, поэтому звено читается как отдельный металл,
     а не как плоская плитка. */
  function linkGeometry(w, L, t, exponent, endCut) {
    const N = 40;
    const ys = [
      -L / 2, -L / 2 + L * 0.045, -L / 2 + L * 0.13,
      -L * 0.24, 0, L * 0.24,
      L / 2 - L * 0.13, L / 2 - L * 0.045, L / 2
    ];
    const hf = [0.62, 0.90, 1.0, 1.0, 1.02, 1.0, 1.0, 0.90, 0.62];
    const pos = [], uv = [], idx = [];
    const hw = w / 2;
    // срез уголков на переднем торце: 0-й пояс уводится назад
    // к середине звена, 1-й и 2-й — плавно догоняют его
    const cutK = [1.0, 0.62, 0.26, 0, 0, 0, 0, 0, 0];

    for (let i = 0; i < ys.length; i++) {
      for (let k = 0; k < N; k++) {
        const a = (k / N) * Math.PI * 2;
        const c = Math.cos(a), s = Math.sin(a);
        const ex = Math.sign(c) * Math.pow(Math.abs(c), exponent);
        const ez = Math.sign(s) * Math.pow(Math.abs(s), exponent);
        // продольная линза + поперечная выпуклость:
        // середина звена заметно толще краёв, верхняя грань куполом
        const lens = 1 + 0.05 * Math.cos((ys[i] / L) * Math.PI);
        const crown = 1 + 0.16 * (1 - Math.abs(ex));
        let yy = ys[i];
        if (endCut && cutK[i]) {
          const nx = Math.abs(ex);
          yy += endCut * cutK[i] * nx * nx;
        }
        pos.push(hw * ex, yy, (t / 2) * hf[i] * lens * crown * ez);
        uv.push(k / N, (ys[i] + L / 2) / L);
      }
    }

    for (let i = 0; i < ys.length - 1; i++) {
      for (let k = 0; k < N; k++) {
        const k2 = (k + 1) % N;
        const a = i * N + k, b = i * N + k2;
        const c = (i + 1) * N + k, d = (i + 1) * N + k2;
        idx.push(a, c, b, b, c, d);
      }
    }

    for (const [si, flip] of [[0, true], [ys.length - 1, false]]) {
      const center = pos.length / 3;
      pos.push(0, ys[si], 0);
      uv.push(0.5, si === 0 ? 0 : 1);
      for (let k = 0; k < N; k++) {
        const k2 = (k + 1) % N;
        const a = si * N + k, b = si * N + k2;
        if (flip) idx.push(center, a, b); else idx.push(center, b, a);
      }
    }

    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }

  function buildBracelet(M) {
    const grp = new T.Group();

    /* 7 колонок слева направо: длинная - 5 коротких - длинная.
       Сумма ширин = 19.0 мм. */
    const NCOL = 7;
    const colW = [3.85, 2.26, 2.26, 2.26, 2.26, 2.26, 3.85];
    const xs = [];
    let acc = -19.0 / 2;
    for (let i = 0; i < NCOL; i++) {
      xs.push(acc + colW[i] / 2);
      acc += colW[i];
    }

    /* Внешние колонки — длинные звенья, внутренние — короткие.
       Соседние внутренние колонки смещены на полшага: стыки в шахматку. */
    // длина звена вдоль браслета у всех колонок одна,
    // «длинная/короткая» — это ширина колонки
    const pitchFor = [3.35, 3.35, 3.35, 3.35, 3.35, 3.35, 3.35];
    const wideCol = [true, false, false, false, false, false, true];
    // поперечная выпуклость браслета: центр выше краёв
    const liftFor = [0.00, 0.16, 0.28, 0.34, 0.28, 0.16, 0.00];

    const X = new T.Vector3(1, 0, 0);

    function frameAt(cv, t) {
      const p = cv.getPointAt(t);
      const tan = cv.getTangentAt(t).normalize();
      const nrm = new T.Vector3().crossVectors(X, tan).normalize();
      const q = new T.Quaternion().setFromRotationMatrix(
        new T.Matrix4().makeBasis(X, tan, nrm)
      );
      return { p: p, tan: tan, q: q };
    }

    for (const sign of [1, -1]) {
      const curve = curveFor(sign);
      const len = curve.getLength();

      for (let c = 0; c < NCOL; c++) {
        const wide = wideCol[c];
        const pitch = pitchFor[c];
        const L = pitch * 0.88;
        const thick = wide ? 2.58 : 2.38;
        const exp = wide ? 0.42 : 0.52;
        const w = colW[c] * 0.945;
        const mat = wide ? M.satinLink : M.linkPolish;

        // все колонки начинаются от корпуса; соседние смещены на полшага
        const phase = ((c - 1 + 7) % 2) * 0.5 * pitch;
        const sFirst = L / 2 + phase;

        /* Первое звено каждой колонки — со срезанными уголками
           у корпуса: узкий торец уходит под безель, поэтому
           прямоугольные углы больше не залезают на циферблат. */
        const firstGeo = linkGeometry(w, L, thick, exp, 1.05);
        const first = new T.Mesh(firstGeo, mat);
        const tf = sFirst / len;
        const frf = frameAt(curve, tf);
        const taperXf = 1 - 0.11 * tf;
        first.position.set(
          frf.p.x + xs[c] * taperXf,
          frf.p.y,
          frf.p.z + liftFor[c]
        );
        first.quaternion.copy(frf.q);
        first.scale.set(taperXf, 1, 1 - 0.07 * tf);
        grp.add(first);

        const n = Math.floor((len - sFirst - L / 2) / pitch) + 1;
        if (n > 1) {
          const geo = linkGeometry(w, L, thick, exp);
          const inst = new T.InstancedMesh(geo, mat, n - 1);
          inst.instanceMatrix.setUsage(T.DynamicDrawUsage);

          const dummy = new T.Object3D();

          for (let i = 1; i < n; i++) {
            const t = (sFirst + i * pitch) / len;
            const fr = frameAt(curve, t);

            const taperX = 1 - 0.11 * t;
            const taperT = 1 - 0.07 * t;

            dummy.position.set(
              fr.p.x + xs[c] * taperX,
              fr.p.y,
              fr.p.z + liftFor[c]
            );
            dummy.quaternion.copy(fr.q);
            dummy.scale.set(taperX, 1, taperT);
            dummy.updateMatrix();
            inst.setMatrixAt(i - 1, dummy.matrix);
          }
          inst.instanceMatrix.needsUpdate = true;
          grp.add(inst);
        }
      }

      /* Застёжка на конце короткого браслета: полированная
         скруглённая пластина, закрывающая торец. */
      const cp = curve.getPointAt(1);
      const ct = curve.getTangentAt(1).normalize();
      const cn = new T.Vector3().crossVectors(X, ct).normalize();
      const cq = new T.Quaternion().setFromRotationMatrix(
        new T.Matrix4().makeBasis(X, ct, cn)
      );
      const clasp = new T.Mesh(
        linkGeometry(18.5, 4.8, 3.0, 0.38),
        M.polished
      );
      clasp.position.copy(cp).addScaledVector(ct, 2.0);
      clasp.quaternion.copy(cq);
      grp.add(clasp);
    }

    return grp;
  }

  /* ---------- сборка ---------- */
  function build(renderer, dialImg) {
    const M = materials();
    const group = new T.Group();

    group.add(buildCase(M, dialImg));
    group.add(buildLugs(M));
    group.add(buildCrown(M));
    group.add(buildHands(M));
    group.add(buildBracelet(M));

    if (global.BackKit) {
      const back = global.BackKit.build(renderer, M);
      if (back) group.add(back);
    }

    return group;
  }

  global.WatchKit = {
    build: build,
    materials: materials,
    bevelBox: bevelBox,
    rrectShape: rrectShape,
    lathe: lathe
  };
})(window);
