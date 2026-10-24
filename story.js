// Homepage story: the PrintSlice logo as a 320 mm model built from columns of
// 4 mm cubes, which splits itself along its own cut lines the way the app
// would for a 180 mm bed while the page scrolls. Six chapters over a pinned stage; the words work on their own
// if WebGL or three.js is missing, and reduced motion gets the final state.
// With data-story="loop" (early access) the same six shots play on a timer.
(function(){
  "use strict";
  var story = document.querySelector("[data-story]");
  if (!story) return;
  var loop = story.getAttribute("data-story") === "loop";
  var stage = story.querySelector(".stage");
  var chapters = Array.prototype.slice.call(story.querySelectorAll(".chapter"));
  var railBtns = Array.prototype.slice.call(story.querySelectorAll(".rail button"));
  var N = loop ? 5 : chapters.length - 1;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small = window.matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4;

  function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }
  function smooth(a, b, v){ var x = clamp((v - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }
  function easeOutCubic(x){ return 1 - Math.pow(1 - x, 3); }
  function easeInOutCubic(x){ return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function lerp(a, b, k){ return a + (b - a) * k; }

  // ---------------------------------------------------------------------
  // Scroll position → story time t, from 0 (hero) to N (export).
  // ---------------------------------------------------------------------
  var t = 0, tTarget = 0;
  story.classList.add(reduce ? "is-static" : loop ? "is-loop" : "is-pinned");
  if (reduce) t = tTarget = N;

  function run(){ return story.offsetHeight - window.innerHeight; }
  // Loop mode: hold each shot, then move to the next; after the last, a new board loads.
  var loopStart = performance.now(), STEP = 3.6, MOVE = 1.4;
  function readLoop(){
    var s = (performance.now() - loopStart) / 1000, k = Math.floor(s / STEP);
    if (k > N){ loopStart = performance.now(); k = 0; s = 0; t = 0; if (gl) gl.restart(); }
    tTarget = Math.min(N, k + easeInOutCubic(clamp((s - k * STEP - (STEP - MOVE)) / MOVE, 0, 1)));
  }
  function readScroll(){
    if (reduce) return;
    if (loop){ readLoop(); return; }
    var r = story.getBoundingClientRect(), span = run();
    tTarget = span > 0 ? clamp(-r.top / span, 0, 1) * N : 0;
  }

  function paintText(){
    if (reduce) return;
    for (var i = 0; i < chapters.length; i++){
      var d = t - i, o = 1 - smooth(0.36, 0.5, Math.abs(d));
      chapters[i].style.opacity = o.toFixed(3);
      chapters[i].style.transform = "translate3d(0," + (-d * 36).toFixed(1) + "px,0)";
      chapters[i].classList.toggle("is-on", o > 0.5);
    }
    var cur = Math.round(t);
    railBtns.forEach(function(b, i){
      if (i === cur) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    });
    stage.style.setProperty("--progress", (t / N).toFixed(4));
  }

  railBtns.forEach(function(b, i){
    b.addEventListener("click", function(){
      if (reduce){ chapters[i].scrollIntoView({ block: "start" }); return; }
      var top = story.getBoundingClientRect().top + window.scrollY + run() * (i / N) + 2;
      window.scrollTo({ top: top, behavior: "smooth" });
    });
  });

  // ---------------------------------------------------------------------
  // The field.
  // ---------------------------------------------------------------------
  var gl = initField();
  if (!gl){
    stage.classList.add("no-gl", "is-ready");
  }

  var visible = true, last = performance.now(), raf = 0;
  function frame(now){
    raf = 0;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    readScroll();
    var before = t;
    t = reduce ? N : loop ? tTarget : t + (tTarget - t) * (1 - Math.exp(-dt * 7));
    if (Math.abs(tTarget - t) < 0.0005) t = tTarget;
    paintText();
    var busy = Math.abs(t - before) > 1e-5;
    if (gl) busy = gl.draw(t, now) || busy;
    if (visible && !document.hidden && (busy || (gl && gl.alive))) raf = requestAnimationFrame(frame);
  }
  function wake(){ if (!raf && visible && !document.hidden){ last = performance.now(); raf = requestAnimationFrame(frame); } }
  window.addEventListener("scroll", wake, { passive: true });
  window.addEventListener("resize", function(){ if (gl) gl.resize(); readScroll(); wake(); });
  document.addEventListener("visibilitychange", wake);
  if ("IntersectionObserver" in window){
    new IntersectionObserver(function(es){ visible = es[0].isIntersecting; wake(); }).observe(story);
  }
  readScroll(); t = reduce ? N : tTarget; paintText(); wake();

  function initField(){
    var canvas = document.getElementById("field");
    if (!window.THREE || !canvas) return null;
    var THREE = window.THREE, renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: "high-performance" });
    } catch (e){ return null; }
    if (!renderer.getContext()) return null;

    // The logo's colours: connector blue, a lighter blue for light, slate and deep slate for the pieces.
    var VOID = 0x0c1117, BLUE = new THREE.Color(0x4a90d9), SKY = new THREE.Color(0x8fbbe8);
    renderer.setClearColor(VOID, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
    renderer.shadowMap.enabled = !small;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(VOID, 0.0068);
    var camera = new THREE.PerspectiveCamera(40, 1, 1, 700);

    // The PrintSlice logo as a model: a 320 mm square of four rounded tiles
    // (slate and deep slate), cut-line grooves between them, and the blue
    // connector diamond in the middle. One world unit is 8 mm.
    var U = 1 / 8, CELL = small ? 8 : 4, N = 320 / CELL, cs = CELL * U, HX = 160 * U, HZ = 160 * U;
    // The app's rule for a 180 mm bed: 168.8 mm usable, so 2 × 2 pieces of 160 mm, cut along the logo's lines.
    var PX = 2, PZ = 2, PIECE = 160 * U, BED = 180 * U, GAP = 2.2, SPREAD = 2.6;
    var SLATE = new THREE.Color(0x4e5f76), DEEP = new THREE.Color(0x2c3849), LINE = new THREE.Color(0x2c5682);

    // Height in mm at a point of the logo, and what it is: 0 tile, 1 groove, 2 diamond (or null outside).
    function logoAt(x, z){
      if (Math.abs(x - 160) + Math.abs(z - 160) < 34) return { h: 30, kind: 2 };
      var ix = x < 160 ? 0 : 1, iz = z < 160 ? 0 : 1;
      var lx = Math.abs(x - (ix ? 240 : 80)), lz = Math.abs(z - (iz ? 240 : 80));
      var hs = 76, r = 26, qx = lx - (hs - r), qz = lz - (hs - r);
      var d = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r;
      if (d < 0) return { h: 22 - 6 * smooth(-10, 0, d), kind: 0 };
      if ((Math.abs(x - 160) < 6 || Math.abs(z - 160) < 6) && x > 4 && x < 316 && z > 4 && z < 316) return { h: 6, kind: 1 };
      return null;
    }

    // Per-column data, for the columns inside the logo only.
    var cells = [];
    for (var gz = 0; gz < N; gz++) for (var gx = 0; gx < N; gx++){
      var xm = (gx + 0.5) * CELL, zm = (gz + 0.5) * CELL, at = logoAt(xm, zm);
      if (at) cells.push({ x: xm, z: zm, h: Math.max(CELL, Math.round(at.h / CELL) * CELL), kind: at.kind });
    }
    var COUNT = cells.length;
    var px = new Float32Array(COUNT), pz = new Float32Array(COUNT), hh = new Float32Array(COUNT), kind = new Uint8Array(COUNT);
    var dirX = new Float32Array(COUNT), dirZ = new Float32Array(COUNT), delay = new Float32Array(COUNT);
    var outside = new Uint8Array(COUNT), base = new Float32Array(COUNT * 3);
    var maxD = Math.hypot(HX, HZ);
    cells.forEach(function(c, i){
      px[i] = (c.x - 160) * U; pz[i] = (c.z - 160) * U; hh[i] = c.h * U; kind[i] = c.kind;
      var ix = c.x < 160 ? 0 : 1, iz = c.z < 160 ? 0 : 1;
      // The diamond and the cut lines stay where they are, as in the logo: the
      // squares move apart around them.
      dirX[i] = c.kind ? 0 : ix - 0.5; dirZ[i] = c.kind ? 0 : iz - 0.5;
      delay[i] = Math.hypot(px[i], pz[i]) / maxD * 1.4;
      outside[i] = Math.abs(px[i]) > BED / 2 || Math.abs(pz[i]) > BED / 2 ? 1 : 0;
      var col = c.kind === 2 ? BLUE : c.kind === 1 ? LINE : (ix + iz) % 2 ? DEEP : SLATE;
      // The lit diamond reads lighter than it is; start it darker so it shows as the logo blue.
      var k = c.kind === 2 ? 0.72 : 1;
      base[i * 3] = col.r * k; base[i * 3 + 1] = col.g * k; base[i * 3 + 2] = col.b * k;
    });

    // A column: unit box sitting on y = 0, darker towards its foot.
    var geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    var pos = geo.attributes.position, vc = new Float32Array(pos.count * 3);
    for (var v = 0; v < pos.count; v++){ var s = 0.5 + 0.5 * pos.getY(v); vc[v * 3] = vc[v * 3 + 1] = vc[v * 3 + 2] = s; }
    geo.setAttribute("color", new THREE.BufferAttribute(vc, 3));
    var mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.15 });
    var mesh = new THREE.InstancedMesh(geo, mat, COUNT);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(COUNT * 3), 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.castShadow = mesh.receiveShadow = !small;
    scene.add(mesh);

    // Floor: shadows and a faint plate grid in the logo's line blue.
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.ShadowMaterial({ opacity: 0.45 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    var grid = new THREE.GridHelper(320, 80, 0x2c5682, 0x2c5682);
    grid.material.transparent = true; grid.material.opacity = 0.16; grid.position.y = 0.02; scene.add(grid);

    function lineMat(color){ return new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0, depthWrite: false }); }
    function square(size, mat, y){
      var s = size / 2, g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-s, y, -s), new THREE.Vector3(s, y, -s), new THREE.Vector3(s, y, s), new THREE.Vector3(-s, y, s)]);
      return new THREE.LineLoop(g, mat);
    }
    function glowMat(color){ return new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); }

    // Chapter 1: a scan sweeps the model, then its dimensions are drawn.
    var scanMat = glowMat(BLUE), scan = new THREE.Mesh(new THREE.PlaneGeometry(2 * HZ + 4, 8), scanMat);
    scan.rotation.y = Math.PI / 2; scan.position.y = 4; scene.add(scan);
    var dimMat = lineMat(BLUE), dimPts = [];
    function seg(a, b){ dimPts.push(a, b); }
    var V = THREE.Vector3;
    var dz = HZ + 3, dx = HX + 3;
    seg(new V(-HX, 0.05, dz), new V(HX, 0.05, dz)); seg(new V(-HX, 0.05, dz - 1), new V(-HX, 0.05, dz + 1)); seg(new V(HX, 0.05, dz - 1), new V(HX, 0.05, dz + 1));
    seg(new V(dx, 0.05, -HZ), new V(dx, 0.05, HZ)); seg(new V(dx - 1, 0.05, -HZ), new V(dx + 1, 0.05, -HZ)); seg(new V(dx - 1, 0.05, HZ), new V(dx + 1, 0.05, HZ));
    var dims = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(dimPts), dimMat); scene.add(dims);

    // Chapter 2: the printer's 180 mm build volume, lowered over the middle of the logo.
    var bedMat = lineMat(BLUE);
    var volume = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BED, BED, BED)), bedMat);
    volume.position.y = BED / 2;
    var bedFillMat = glowMat(BLUE), bedFill = new THREE.Mesh(new THREE.BoxGeometry(BED, BED, BED), bedFillMat);
    bedFill.position.y = BED / 2;
    var bedGroup = new THREE.Group(); bedGroup.add(volume, bedFill); scene.add(bedGroup);

    // Chapter 3: the cut planes run down the logo's own cut lines.
    var cutMat = glowMat(SKY), cuts = new THREE.Group();
    var cxp = new THREE.Mesh(new THREE.PlaneGeometry(2 * HZ + 3, 7), cutMat); cxp.rotation.y = Math.PI / 2; cxp.position.set(0, 3.5, 0); cuts.add(cxp);
    var czp = new THREE.Mesh(new THREE.PlaneGeometry(2 * HX + 3, 7), cutMat); czp.position.set(0, 3.5, 0); cuts.add(czp);
    scene.add(cuts);

    // Chapter 5: every piece on a bed of its own.
    var plateMat = lineMat(BLUE), plates = new THREE.Group();
    for (var pzI = 0; pzI < PZ; pzI++) for (var pxI = 0; pxI < PX; pxI++){
      var p = square(BED, plateMat, 0.06);
      var off = PIECE + GAP + SPREAD;
      p.position.set((pxI - 0.5) * off, 0, (pzI - 0.5) * off);
      plates.add(p);
    }
    scene.add(plates);

    // Light: a steady key, a cool sky, and a blue rim that shifts per chapter.
    scene.add(new THREE.HemisphereLight(0xdde5f0, 0x0c1117, 0.45));
    scene.add(new THREE.AmbientLight(0x2a3340, 0.4));
    var key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(-38, 70, 34);
    key.castShadow = !small;
    key.shadow.mapSize.set(2048, 2048);
    var sc = key.shadow.camera; sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 10; sc.far = 200;
    key.shadow.bias = -0.0008;
    scene.add(key);
    var rim = new THREE.DirectionalLight(0x4a90d9, 0.45); scene.add(rim);
    var glow = new THREE.PointLight(0x4a90d9, 0.5, 34, 2); glow.position.set(0, 8, 0); scene.add(glow);
    var LIGHTS = [BLUE, SKY, BLUE, SKY, BLUE, BLUE];
    var lightC = new THREE.Color();

    // Camera: six shots, about 50 degrees of orbit apart, ending straight down 88 units up.
    var SHOTS = [
      { az: -32, el: 40, r: 64, tx: 0, ty: 0, tz: 0 },
      { az: 18, el: 30, r: 58, tx: 0, ty: 0, tz: 0 },
      { az: 62, el: 32, r: 68, tx: 0, ty: 5, tz: 0 },
      { az: 112, el: 58, r: 60, tx: 0, ty: 0, tz: 0 },
      { az: 160, el: 36, r: 26, tx: 0, ty: 2, tz: 0 },
      { az: 180, el: 89.6, r: 88, tx: 0, ty: 0, tz: 0 }
    ];
    var shot = { az: 0, el: 0, r: 0, tx: 0, ty: 0, tz: 0 }, target = new THREE.Vector3();
    function placeCamera(t){
      var k = Math.min(SHOTS.length - 2, Math.floor(t)), f = easeInOutCubic(clamp(t - k, 0, 1));
      var a = SHOTS[k], b = SHOTS[k + 1];
      for (var key2 in shot) shot[key2] = lerp(a[key2], b[key2], f);
      var az = shot.az * Math.PI / 180, el = shot.el * Math.PI / 180;
      // Tall screens see less of the model across, so the camera stands further back.
      var r = shot.r * Math.max(1, 0.84 / camera.aspect);
      target.set(shot.tx, shot.ty, shot.tz);
      camera.position.set(target.x + r * Math.cos(el) * Math.sin(az), target.y + r * Math.sin(el), target.z + r * Math.cos(el) * Math.cos(az));
      camera.lookAt(target);
    }

    // Sizing, with the picture shifted clear of the words (right on wide screens, up on phones).
    var wide = true;
    function resize(){
      var w = canvas.clientWidth || stage.clientWidth, h = canvas.clientHeight || stage.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      wide = w > 760;
      // Unpinned (reduced motion) the picture has the width to itself; pinned, it moves clear of the words.
      if (reduce || loop) camera.clearViewOffset();
      else if (wide) camera.setViewOffset(w, h, -w * 0.17, 0, w, h);
      else camera.setViewOffset(w, h, 0, h * 0.2, w, h);
      camera.updateProjectionMatrix();
      dirty = true;
    }

    var mArr = mesh.instanceMatrix.array, cArr = mesh.instanceColor.array;
    var loadStart = 0, loadDone = reduce, lastT = -1, dirty = true;

    function updateField(t, now){
      var el = (now - loadStart) / 1000;
      var sp = smooth(2.55, 3.05, t), spread = smooth(4.25, 4.85, t);
      var over = smooth(1.5, 1.85, t) * (1 - smooth(2.15, 2.4, t));
      var scanOn = smooth(0.4, 0.55, t) * (1 - smooth(1.3, 1.45, t));
      var scanX = -HX - 3 + (2 * HX + 6) * smooth(0.48, 1.32, t);
      // Chapter 4: the diamond is the connector; it lifts and lights up.
      var join = smooth(3.3, 3.8, t) * (1 - smooth(4.4, 4.8, t));
      var off = GAP * sp + SPREAD * spread, w = cs * 0.9;
      for (var i = 0; i < COUNT; i++){
        var rise = loadDone ? 1 : easeOutCubic(clamp((el - delay[i]) / 1.2, 0, 1));
        var lift = kind[i] === 2 ? 1 + 0.35 * join : 1;
        var o = i * 16;
        mArr[o] = w; mArr[o + 5] = Math.max(0.001, hh[i] * rise * lift); mArr[o + 10] = w;
        mArr[o + 12] = px[i] + dirX[i] * off; mArr[o + 13] = 0; mArr[o + 14] = pz[i] + dirZ[i] * off; mArr[o + 15] = 1;
        var c = i * 3, r = base[c], g = base[c + 1], b = base[c + 2];
        if (kind[i] === 2 && join > 0){ r += BLUE.r * 0.6 * join; g += BLUE.g * 0.6 * join; b += BLUE.b * 0.6 * join; }
        if (over > 0){
          if (outside[i]){ var ko = over * 0.7; r = lerp(r, 0.035, ko); g = lerp(g, 0.05, ko); b = lerp(b, 0.07, ko); }
          else { r += BLUE.r * over * 0.22; g += BLUE.g * over * 0.22; b += BLUE.b * over * 0.22; }
        }
        if (scanOn > 0){ var d = (px[i] - scanX) / 1.1, ks = scanOn * 0.8 * Math.exp(-d * d); r += BLUE.r * ks; g += BLUE.g * ks; b += BLUE.b * ks; }
        cArr[c] = r; cArr[c + 1] = g; cArr[c + 2] = b;
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      if (!loadDone && el > 2.7) loadDone = true;

      scan.position.x = scanX; scanMat.opacity = 0.22 * scanOn;
      dimMat.opacity = smooth(1.05, 1.3, t) * (1 - smooth(1.6, 1.85, t));
      var bedIn = smooth(1.45, 1.8, t), bedOut = smooth(2.35, 2.7, t);
      bedMat.opacity = 0.9 * bedIn * (1 - bedOut); bedFillMat.opacity = 0.05 * bedIn * (1 - bedOut);
      bedGroup.position.y = 10 * (1 - easeOutCubic(bedIn));
      cutMat.opacity = 0.32 * smooth(2.2, 2.45, t) * (1 - smooth(2.8, 3.05, t));
      plateMat.opacity = smooth(4.45, 4.9, t);
      return true;
    }

    var alive = true, firstFrame = true;
    function draw(t, now){
      if (firstFrame){ loadStart = now; }
      var changed = dirty || !loadDone || Math.abs(t - lastT) > 1e-5;
      if (changed){ updateField(t, now); placeCamera(t); lastT = t; dirty = false; }
      // The coloured light follows the chapter and sits behind the board from the camera.
      var k = Math.min(LIGHTS.length - 2, Math.floor(t)), f = smooth(0.4, 0.7, t - k);
      lightC.copy(LIGHTS[k]).lerp(LIGHTS[k + 1], f);
      rim.color.copy(lightC); glow.color.copy(lightC);
      rim.position.set(-camera.position.x, 40, -camera.position.z);
      var s = now / 1000;
      glow.position.set(Math.sin(s * 0.35) * 13, 8 + Math.sin(s * 0.5) * 1.2, Math.cos(s * 0.27) * 8);
      renderer.render(scene, camera);
      if (firstFrame){ firstFrame = false; stage.classList.add("is-ready"); }
      return changed;
    }

    resize();
    function restart(){ firstFrame = true; loadDone = false; dirty = true; }
    return { draw: draw, resize: resize, restart: restart, get alive(){ return alive && !reduce; } };
  }
})();
