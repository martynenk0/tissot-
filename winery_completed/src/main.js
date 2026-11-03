/* ============================================================
   СЦЕНА И УПРАВЛЕНИЕ
   ============================================================ */
(async function () {
  'use strict';
  const T = window.THREE;

  const canvas = document.getElementById('scene');
  const loader = document.getElementById('loader');
  const fallback = document.getElementById('fallback');
  const hint = document.getElementById('hint');

  let renderer;
  try {
    renderer = new T.WebGLRenderer({
      canvas: canvas, antialias: true, alpha: false,
      powerPreference: 'high-performance'
    });
  } catch (e) {
    fallback.classList.add('show');
    loader.classList.add('done');
    return;
  }

  if (!renderer.capabilities.isWebGL2) {
    fallback.classList.add('show');
    loader.classList.add('done');
    return;
  }

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.useLegacyLights = false;
  renderer.setClearColor(0x050806, 1);

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(30, 1, 1, 2000);
  camera.position.set(0, 0, 190);

  /* ---------- окружение ---------- */
  const env = window.EnvKit.makeStudioEnv(renderer);
  scene.environment = env;

  // фон
  const backdrop = new T.Mesh(
    new T.PlaneGeometry(1200, 1200),
    new T.MeshBasicMaterial({
      map: window.EnvKit.makeBackdropTexture(), toneMapped: false, depthWrite: false
    })
  );
  backdrop.position.z = -420;
  scene.add(backdrop);

  // ореол
  const glow = new T.Sprite(new T.SpriteMaterial({
    map: window.EnvKit.makeGlowTexture(),
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.9
  }));
  glow.scale.set(230, 230, 1);
  glow.position.set(0, 0, -90);
  scene.add(glow);

  /* ---------- свет ---------- */
  const key = new T.DirectionalLight(0xfff4e6, 2.1);
  key.position.set(-70, 90, 120);
  scene.add(key);

  const rim = new T.DirectionalLight(0xbfd6ff, 1.35);
  rim.position.set(90, -30, -110);
  scene.add(rim);

  const fill = new T.DirectionalLight(0xdfeee4, 0.55);
  fill.position.set(20, -80, 90);
  scene.add(fill);

  /* ---------- часы ---------- */
  let dialImg = null;
  if (window.DIAL_IMG) {
    dialImg = await new Promise(resolve => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = window.DIAL_IMG;
    });
  }
  const watch = window.WatchKit.build(renderer, dialImg);
  watch.rotation.order = 'YXZ';
  scene.add(watch);

  /* ---------- параметры камеры ---------- */
  const DEFAULT = { yaw: -0.20, pitch: 0.09, dist: 166 };
  const params = new URLSearchParams(location.search);
  const autoParam = params.get('auto');
  const autoRotate = autoParam === null ? true : autoParam !== '0';
  const showUI = params.get('ui') !== '0';
  if (!showUI) document.querySelectorAll('.ui').forEach(el => el.style.display = 'none');

  // показываем только лицевую сторону: поворот ограничен,
  // задняя крышка в кадр не попадает
  const YAW_MIN = -0.55, YAW_MAX = 0.55;
  const PITCH_MIN = -0.55, PITCH_MAX = 0.55;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let yaw = params.has('yaw') ? +params.get('yaw') * Math.PI / 180 : DEFAULT.yaw;
  let pitch = params.has('pitch') ? +params.get('pitch') * Math.PI / 180 : DEFAULT.pitch;
  let dist = params.has('dist') ? +params.get('dist') : DEFAULT.dist;
  yaw = clamp(yaw, YAW_MIN, YAW_MAX);
  pitch = clamp(pitch, PITCH_MIN, PITCH_MAX);
  let tYaw = yaw, tPitch = pitch, tDist = dist;
  let autoDir = 1;
  let dragging = false;
  let pointerId = null;
  let lastX = 0, lastY = 0;
  let lastInteract = performance.now();
  let hintHidden = false;
  const pointers = new Map();
  let pinchStart = 0, pinchDist = 0;

  function hideHint() {
    if (hintHidden) return;
    hintHidden = true;
    if (hint) hint.classList.add('hide');
  }

  function onDown(e) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      pinchStart = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchDist = tDist;
      dragging = false;
      return;
    }
    dragging = true;
    pointerId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    lastInteract = performance.now();
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  }

  function onMove(e) {
    if (pointers.has(e.pointerId)) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchStart > 0) {
        tDist = Math.max(118, Math.min(330, pinchDist * (pinchStart / d)));
      }
      return;
    }
    if (!dragging || e.pointerId !== pointerId) return;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    tYaw += dx * 0.0072;
    tPitch += dy * 0.0055;
    tYaw = clamp(tYaw, YAW_MIN, YAW_MAX);
    tPitch = clamp(tPitch, PITCH_MIN, PITCH_MAX);

    lastInteract = performance.now();
    hideHint();
  }

  function onUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = 0;
    if (e.pointerId === pointerId) {
      dragging = false;
      pointerId = null;
      canvas.style.cursor = 'grab';
    }
    lastInteract = performance.now();
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'none';

  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    tDist = Math.max(115, Math.min(200, tDist * Math.exp(e.deltaY * 0.0011)));
    lastInteract = performance.now();
    hideHint();
  }, { passive: false });

  function resetView() {
    tYaw = DEFAULT.yaw;
    tPitch = DEFAULT.pitch;
    tDist = DEFAULT.dist;
    lastInteract = performance.now();
  }
  const resetBtn = document.getElementById('reset');
  if (resetBtn) resetBtn.addEventListener('click', resetView);
  window.addEventListener('keydown', e => { if (e.key === 'r' || e.key === 'R') resetView(); });

  canvas.addEventListener('dblclick', resetView);

  /* ---------- resize ---------- */
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // на узких экранах чуть отодвигаем камеру
    const narrow = Math.min(1, w / 900);
    camera.fov = 30 + (1 - narrow) * 6;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  /* ---------- цикл ---------- */
  const clock = new T.Clock();
  let started = false;

  function loop() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const now = performance.now();

    if (autoRotate && !dragging && pointers.size === 0 && now - lastInteract > 2600) {
      tYaw += dt * 0.10 * autoDir;
      if (tYaw >= YAW_MAX) { tYaw = YAW_MAX; autoDir = -1; }
      if (tYaw <= YAW_MIN) { tYaw = YAW_MIN; autoDir = 1; }
    }

    yaw += (tYaw - yaw) * Math.min(1, dt * 9);
    pitch += (tPitch - pitch) * Math.min(1, dt * 9);
    dist += (tDist - dist) * Math.min(1, dt * 7);

    watch.rotation.y = yaw;
    watch.rotation.x = pitch;
    camera.position.z = dist;
    camera.lookAt(0, 0, -8);

    renderer.render(scene, camera);

    if (!started) {
      started = true;
      window.__ready = true;
      canvas.classList.add('ready');
      setTimeout(() => loader.classList.add('done'), 420);
    }
  }

  renderer.setAnimationLoop(loop);

  window.__watch = { scene: scene, camera: camera, watch: watch, renderer: renderer };
})();
