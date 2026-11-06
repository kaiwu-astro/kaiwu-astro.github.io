/* Liebig's barrel for S8: Three.js (vendor/three.min.js, classic build, works over file://)
   with a static pseudo-3D SVG fallback (no WebGL, ?nowebgl=1, and print).
   API: Barrel.init(wrapEl, slideEl) · Barrel.setActive(bool) · Barrel.toggle() */
(function () {
  'use strict';
  var N = 16, STEP = 2 * Math.PI / N, HALF = STEP / 2 - 0.012, T = 0.075;
  var CTX_LOW = 1.15, CTX_HIGH = 2.02;           // Context stave height: short -> grown
  var IDX = { Model: -2, Harness: 2, Context: 0 }; // stave index (0 faces the viewer)
  var TALL = { Model: 2.8, Harness: 2.55 };
  var ACCENT = '#1f5b92';

  function R(y) { var yy = Math.max(0, Math.min(y, 2.1)); var u = (yy - 1.05) / 1.05; return 0.80 + 0.20 * (1 - u * u); }
  function plainH(i) { var v = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return 2.12 + 0.11 * (v - Math.floor(v)); }
  function staveList(hc) {
    var out = [];
    for (var i = -N / 2 + 1; i <= N / 2; i++) {
      var kind = null, h = plainH(i);
      if (i === IDX.Model) { kind = 'Model'; h = TALL.Model; }
      else if (i === IDX.Harness) { kind = 'Harness'; h = TALL.Harness; }
      else if (i === IDX.Context) { kind = 'Context'; h = hc; }
      out.push({ i: i, phi: i * STEP, h: h, kind: kind });
    }
    return out;
  }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  var S = { hc: CTX_LOW, target: CTX_LOW, anim: null, active: false, raf: 0, mode: null };

  /* ------------------------------------------------------------ SVG fallback */
  function svgMarkup(hc) {
    var s = 200, cx = 430, by = 622, k = 0.26, L = hc - 0.03;
    function X(r, p) { return cx + s * r * Math.sin(p); }
    function Y(r, p, y) { return by - s * y + s * k * r * Math.cos(p); }
    function pt(r, p, y) { return X(r, p).toFixed(1) + ',' + Y(r, p, y).toFixed(1); }
    function face(r0, p0, p1, h, dr) { // stave face polygon between angles p0..p1, 0..h, at radius r(y)-dr
      var a = [], y, n = 16;
      for (var j = 0; j <= n; j++) { y = h * j / n; a.push(pt(R(y) - dr, p0, y)); }
      for (j = n; j >= 0; j--) { y = h * j / n; a.push(pt(R(y) - dr, p1, y)); }
      return a.join(' ');
    }
    function cap(p0, p1, h) {
      var r = R(h); return [pt(r, p0, h), pt(r, p1, h), pt(r - T, p1, h), pt(r - T, p0, h)].join(' ');
    }
    function shade(base, f) { // base rgb array, factor
      return 'rgb(' + base.map(function (c) { return Math.round(Math.max(0, Math.min(255, c * f))); }).join(',') + ')';
    }
    var wood = [181, 129, 78], light = [222, 182, 128];
    var st = staveList(hc), o = [];
    o.push('<svg class="barrel-svg" viewBox="0 0 1000 700" width="1000" height="700" role="img" aria-label="Liebig\'s barrel: wooden staves; the Model and Harness staves stick up tall, the Context stave is the shortest, and the water (result quality) only reaches the top of the Context stave.">');
    o.push('<ellipse cx="' + cx + '" cy="' + (by + 18) + '" rx="270" ry="62" fill="#000" fill-opacity="0.10"/>');
    // back staves: inner faces + caps (far side first)
    var back = st.filter(function (q) { return Math.cos(q.phi) < 0; }).sort(function (a, b) { return Math.cos(a.phi) - Math.cos(b.phi); });
    back.forEach(function (q) {
      var f = 0.62 + 0.18 * Math.abs(Math.sin(q.phi));
      o.push('<polygon points="' + face(0, q.phi - HALF, q.phi + HALF, q.h, T) + '" fill="' + shade(q.kind ? light : wood, f) + '" stroke="#5b3a1e" stroke-width="1.5"/>');
      o.push('<polygon points="' + cap(q.phi - HALF, q.phi + HALF, q.h) + '" fill="' + shade(light, 1) + '" stroke="#5b3a1e" stroke-width="1"/>');
    });
    // water surface
    var rl = R(L) - T;
    o.push('<ellipse cx="' + cx + '" cy="' + (by - s * L).toFixed(1) + '" rx="' + (s * rl).toFixed(1) + '" ry="' + (s * k * rl).toFixed(1) + '" fill="#5d9fd6" fill-opacity="0.85" stroke="' + ACCENT + '" stroke-width="5"/>');
    // front staves: outer faces + caps (edges first, centre last)
    var front = st.filter(function (q) { return Math.cos(q.phi) >= 0; }).sort(function (a, b) { return Math.cos(a.phi) - Math.cos(b.phi); });
    front.forEach(function (q) {
      var f = 0.78 + 0.32 * Math.cos(q.phi + 0.55);
      o.push('<polygon points="' + face(0, q.phi - HALF, q.phi + HALF, q.h, 0) + '" fill="' + shade(q.kind ? light : wood, f) + '" stroke="' + (q.kind === 'Context' ? ACCENT : '#5b3a1e') + '" stroke-width="' + (q.kind === 'Context' ? 5 : 1.5) + '"/>');
      o.push('<polygon points="' + cap(q.phi - HALF, q.phi + HALF, q.h) + '" fill="' + shade(light, 1.08) + '" stroke="#5b3a1e" stroke-width="1"/>');
    });
    // hoops (front arcs)
    [0.22, 0.62, 1.42, 1.82].forEach(function (y) {
      var a = [], r = R(y) + 0.012;
      for (var j = 0; j <= 40; j++) { var p = -Math.PI / 2 + Math.PI * j / 40; a.push(pt(r, p, y)); }
      o.push('<polyline points="' + a.join(' ') + '" fill="none" stroke="#2e3136" stroke-width="12" stroke-linecap="round"/>');
      o.push('<polyline points="' + a.join(' ') + '" fill="none" stroke="#8d939b" stroke-width="3" transform="translate(0,-3)"/>');
    });
    // spill over the Context stave
    var sx = X(R(L), 0), sy = Y(R(L), 0, L);
    o.push('<path d="M' + sx + ',' + sy + ' C ' + (sx + 6) + ',' + (sy + 40) + ' ' + (sx + 14) + ',' + (by + 20) + ' ' + (sx + 18) + ',' + (by + 52) + '" fill="none" stroke="#5d9fd6" stroke-opacity="0.75" stroke-width="12" stroke-linecap="round"/>');
    o.push('<ellipse cx="' + (sx + 30) + '" cy="' + (by + 58) + '" rx="90" ry="16" fill="#5d9fd6" fill-opacity="0.35"/>');
    // labels
    function lab(q, dx, anchor) {
      var r = R(q.h), x = X(r, q.phi), y = Y(r, q.phi, q.h);
      return '<text x="' + (x + dx).toFixed(0) + '" y="' + (y - 18).toFixed(0) + '" text-anchor="' + anchor + '" class="bl">' + q.kind + '</text>';
    }
    st.forEach(function (q) {
      if (q.kind === 'Model') o.push(lab(q, -10, 'end'));
      if (q.kind === 'Harness') o.push(lab(q, 10, 'start'));
      if (q.kind === 'Context') {
        var y = Y(R(q.h), 0, q.h), x = X(R(q.h), 0), lx = x - 175;
        o.push('<path d="M' + lx + ',' + y + ' H' + (x - 6) + '" stroke="' + ACCENT + '" stroke-width="4"/><circle cx="' + (x - 4) + '" cy="' + y + '" r="7" fill="' + ACCENT + '"/>');
        o.push('<rect x="' + (lx - 205) + '" y="' + (y - 32) + '" width="200" height="64" rx="10" fill="#fff" fill-opacity="0.95" stroke="' + ACCENT + '" stroke-width="3"/>');
        o.push('<text x="' + (lx - 105) + '" y="' + (y + 15) + '" text-anchor="middle" class="bl ctx">Context</text>');
      }
    });
    var wy = (by - s * L).toFixed(1), wx = (cx + s * (R(L) + 0.02)).toFixed(1);
    o.push('<path d="M' + wx + ',' + wy + ' H 706" stroke="' + ACCENT + '" stroke-width="4"/>');
    o.push('<text x="716" y="' + (+wy + 15) + '" class="bl wq">result quality</text>');
    o.push('</svg>');
    return o.join('');
  }

  /* ------------------------------------------------------------ WebGL */
  var G = {};
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function woodTexture(THREE) {
    var c = document.createElement('canvas'); c.width = 128; c.height = 512;
    var g = c.getContext('2d'), r = rng(7);
    g.fillStyle = '#c08a55'; g.fillRect(0, 0, 128, 512);
    for (var k = 0; k < 46; k++) {
      var x = r() * 128, w = 0.6 + r() * 2.4, dark = r() < 0.6, amp = 1 + r() * 3;
      g.strokeStyle = dark ? 'rgba(95,55,25,' + (0.18 + r() * 0.35) + ')' : 'rgba(235,195,140,' + (0.15 + r() * 0.3) + ')';
      g.lineWidth = w; g.beginPath();
      for (var y = 0; y <= 512; y += 12) g.lineTo(x + Math.sin(y / 70 + k) * amp, y);
      g.stroke();
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }
  function staveGeometry(THREE, phiC, h) {
    var pos = [], uv = [], idx = [], groups = [];
    var p0 = phiC - HALF, p1 = phiC + HALF;
    function P(r, p, y) { return [r * Math.sin(p), y, r * Math.cos(p)]; }
    function grid(fn, I, J, mat) {
      var base = pos.length / 3, start = idx.length, i, j;
      for (i = 0; i <= I; i++) for (j = 0; j <= J; j++) { var q = fn(i / I, j / J); pos.push(q[0], q[1], q[2]); uv.push(j / J, (i / I) * h / 2.2); }
      for (i = 0; i < I; i++) for (j = 0; j < J; j++) { var a = base + i * (J + 1) + j, b = a + 1, c = a + J + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
      groups.push([start, idx.length - start, mat]);
    }
    var K = 28, M = 4;
    grid(function (u, v) { return P(R(u * h), p0 + (p1 - p0) * v, u * h); }, K, M, 0);       // outer
    grid(function (u, v) { return P(R(u * h) - T, p1 - (p1 - p0) * v, u * h); }, K, M, 1);   // inner
    grid(function (u, v) { return P(R(h) - T * u, p0 + (p1 - p0) * v, h); }, 1, M, 2);       // top cap
    grid(function (u, v) { return P(R(u * h) - T * v, p0, u * h); }, K, 1, 2);               // side
    grid(function (u, v) { return P(R(u * h) - T * v, p1, u * h); }, K, 1, 2);               // side
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    groups.forEach(function (g) { geo.addGroup(g[0], g[1], g[2]); });
    geo.computeVertexNormals();
    return geo;
  }
  function waterGeometry(THREE, L) {
    var pts = [], n = 20;
    pts.push(new THREE.Vector2(0.001, 0.04));
    for (var j = 0; j <= n; j++) { var y = 0.04 + (L - 0.04) * j / n; pts.push(new THREE.Vector2(R(y) - T - 0.006, y)); }
    pts.push(new THREE.Vector2(0.001, L));
    return new THREE.LatheGeometry(pts, 72);
  }
  function spillCurve(THREE, L) {
    var r = R(L);
    return new THREE.CubicBezierCurve3(
      new THREE.Vector3(0, L + 0.01, r - T * 0.5),
      new THREE.Vector3(0, L + 0.06, r + 0.16),
      new THREE.Vector3(0, L * 0.35, R(0) + 0.30),
      new THREE.Vector3(0, 0.01, R(0) + 0.34));
  }

  function initGL(wrap) {
    var THREE = window.THREE;
    var W = wrap.clientWidth || 1000, H = wrap.clientHeight || 700;
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H, false);
    renderer.domElement.className = 'barrel-gl';
    wrap.insertBefore(renderer.domElement, wrap.firstChild);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
    camera.position.set(0, 3.9, 6.5); camera.lookAt(0.2, 1.08, 0);
    scene.add(new THREE.HemisphereLight(0xfff6ea, 0x6b5a48, 1.15));
    var key = new THREE.DirectionalLight(0xffffff, 1.9); key.position.set(-3.5, 6, 5); scene.add(key);
    var rim = new THREE.DirectionalLight(0xbfd6ee, 0.6); rim.position.set(4, 3, -3); scene.add(rim);

    // ground shadow
    var sc = document.createElement('canvas'); sc.width = sc.height = 256;
    var sg = sc.getContext('2d'), grd = sg.createRadialGradient(128, 128, 20, 128, 128, 128);
    grd.addColorStop(0, 'rgba(0,0,0,0.30)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    sg.fillStyle = grd; sg.fillRect(0, 0, 256, 256);
    var shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; scene.add(shadow);

    var group = new THREE.Group(); scene.add(group);
    var tex = woodTexture(THREE);
    function mats(tint, inner) {
      return [
        new THREE.MeshStandardMaterial({ map: tex, color: tint, roughness: 0.78, metalness: 0, side: THREE.DoubleSide }),
        new THREE.MeshStandardMaterial({ map: tex, color: inner, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }),
        new THREE.MeshStandardMaterial({ map: tex, color: 0xf0d4a8, roughness: 0.8, metalness: 0, side: THREE.DoubleSide })
      ];
    }
    var r = rng(11), staves = {};
    staveList(S.hc).forEach(function (q) {
      var tint;
      if (q.kind) tint = new THREE.Color(0xffe2b8);
      else { var v = 0.82 + r() * 0.2; tint = new THREE.Color(v, v * 0.95, v * 0.9); }
      var m = new THREE.Mesh(staveGeometry(THREE, q.phi, q.h), mats(tint, new THREE.Color(0x9a7556)));
      group.add(m);
      if (q.kind) staves[q.kind] = { mesh: m, q: q };
    });
    // context stave accent edge (thin blue line on its top cap)
    // bottom
    var bottom = new THREE.Mesh(new THREE.CylinderGeometry(R(0) - T, R(0) - T, 0.05, 48), new THREE.MeshStandardMaterial({ color: 0x7a5534, roughness: 0.9 }));
    bottom.position.y = 0.025; group.add(bottom);
    // hoops
    var hoopMat = new THREE.MeshStandardMaterial({ color: 0x4a4f57, metalness: 0.75, roughness: 0.32 });
    [0.22, 0.62, 1.42, 1.82].forEach(function (y) {
      var t = new THREE.Mesh(new THREE.TorusGeometry(R(y) + 0.008, 0.036, 12, 120), hoopMat);
      t.rotation.x = Math.PI / 2; t.position.y = y; t.scale.z = 1.6; group.add(t);
    });
    // water
    var waterMat = new THREE.MeshStandardMaterial({ color: 0x3f8fd8, transparent: true, opacity: 0.55, roughness: 0.15, metalness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    var topMat = new THREE.MeshStandardMaterial({ color: 0x7cbcf0, transparent: true, opacity: 0.82, roughness: 0.1, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide });
    var water = new THREE.Mesh(waterGeometry(THREE, S.hc - 0.03), waterMat); group.add(water);
    var top = new THREE.Mesh(new THREE.CircleGeometry(1, 72), topMat); top.rotation.x = -Math.PI / 2; group.add(top);
    var ringGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 97 }, function (_, i) { var a = i / 96 * Math.PI * 2; return new THREE.Vector3(Math.sin(a), 0, Math.cos(a)); }));
    var ring = new THREE.Line(ringGeo, new THREE.LineBasicMaterial({ color: 0x1f5b92 })); group.add(ring);
    var spillMat = new THREE.MeshStandardMaterial({ color: 0x5aa2e0, transparent: true, opacity: 0.5, roughness: 0.1, depthWrite: false });
    var spill = new THREE.Mesh(new THREE.TubeGeometry(spillCurve(THREE, S.hc), 40, 0.028, 10, false), spillMat); spill.scale.x = 3; group.add(spill);
    var puddle = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), new THREE.MeshStandardMaterial({ color: 0x5aa2e0, transparent: true, opacity: 0.35, depthWrite: false }));
    puddle.rotation.x = -Math.PI / 2; puddle.scale.set(1.4, 0.8, 1); puddle.position.set(0, 0.006, R(0) + 0.38); group.add(puddle);

    function setLevel(hc) {
      var L = hc - 0.03, rl = R(L) - T - 0.006;
      var c = staves.Context; c.mesh.geometry.dispose(); c.mesh.geometry = staveGeometry(THREE, c.q.phi, hc); c.q.h = hc;
      water.geometry.dispose(); water.geometry = waterGeometry(THREE, L);
      top.position.y = L; top.scale.set(rl, rl, 1);
      ring.position.y = L + 0.003; ring.scale.set(rl, 1, rl);
      spill.geometry.dispose(); spill.geometry = new THREE.TubeGeometry(spillCurve(THREE, hc), 40, 0.028, 10, false);
    }
    setLevel(S.hc);

    // HTML label overlays (crisp text, readable from the back of the room)
    var labels = {};
    ['Model', 'Harness', 'Context'].forEach(function (k) {
      var d = document.createElement('div'); d.className = 'blabel' + (k === 'Context' ? ' ctx' : ''); d.textContent = k; wrap.appendChild(d); labels[k] = d;
    });
    var wl = document.createElement('div'); wl.className = 'wlabel'; wl.textContent = 'result quality'; wrap.appendChild(wl);
    var cl = document.createElement('div'); cl.className = 'cline'; wrap.appendChild(cl);
    var v = new THREE.Vector3();
    function place(el, x, y) { el.style.left = x.toFixed(1) + 'px'; el.style.top = y.toFixed(1) + 'px'; }
    function project(vec) { vec.project(camera); return [(vec.x + 1) / 2 * W, (1 - vec.y) / 2 * H]; }
    function updateLabels() {
      group.updateMatrixWorld();
      ['Model', 'Harness', 'Context'].forEach(function (k) {
        var q = staves[k].q, rr = R(q.h), yOff = k === 'Context' ? 0 : 0.1;
        v.set(rr * Math.sin(q.phi), q.h + yOff, rr * Math.cos(q.phi)).applyMatrix4(group.matrixWorld);
        var p = project(v);
        if (k === 'Context') {
          var lx = p[0] - 250; place(labels[k], lx, p[1]);
          cl.style.left = lx.toFixed(1) + 'px'; cl.style.top = p[1].toFixed(1) + 'px'; cl.style.width = (p[0] - lx - 6).toFixed(1) + 'px';
          return;
        }
        place(labels[k], p[0], p[1]);
        var facing = Math.cos(q.phi + group.rotation.y);
        labels[k].style.opacity = facing > -0.15 ? 1 : 0.35;
      });
      var L = S.hc - 0.03;
      v.set(R(L) + 0.02, L, 0); var p = project(v); place(wl, p[0], p[1]);
    }

    var t0 = performance.now();
    function frame(now) {
      if (S.anim) {
        var a = Math.min(1, (now - S.anim.start) / S.anim.dur);
        S.hc = S.anim.from + (S.anim.to - S.anim.from) * ease(a);
        setLevel(S.hc);
        if (a >= 1) S.anim = null;
      }
      group.rotation.y = 0.42 * Math.sin((now - t0) / 1000 * 2 * Math.PI / 22) - 0.05;
      renderer.render(scene, camera);
      updateLabels();
      G.frames = (G.frames || 0) + 1;
      if (S.active) S.raf = requestAnimationFrame(frame); else S.raf = 0;
    }
    G.frame = frame; G.renderer = renderer;
    G.renderOnce = function () { frame(performance.now()); };
    G.renderOnce();
  }

  /* ------------------------------------------------------------ public API */
  function webglAvailable() {
    if (/[?&]nowebgl=1/.test(location.search)) return false;
    if (!window.THREE) return false;
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
    catch (e) { return false; }
  }
  var wrapEl, slideEl, svgHost;
  function drawSVG() { svgHost.innerHTML = svgMarkup(S.hc); }
  function svgAnimFrame(now) {
    if (!S.anim) return;
    var a = Math.min(1, (now - S.anim.start) / S.anim.dur);
    S.hc = S.anim.from + (S.anim.to - S.anim.from) * ease(a); drawSVG();
    if (a < 1) requestAnimationFrame(svgAnimFrame); else S.anim = null;
  }
  window.Barrel = {
    init: function (wrap, slide) {
      wrapEl = wrap; slideEl = slide;
      svgHost = document.createElement('div'); svgHost.className = 'barrel-fallback'; wrap.appendChild(svgHost);
      drawSVG();
      var ok = false;
      if (webglAvailable()) { try { initGL(wrap); ok = true; } catch (e) { console.warn('Barrel: WebGL init failed, using SVG fallback', e); } }
      S.mode = ok ? 'webgl' : 'svg';
      slide.setAttribute('data-barrel', S.mode);
      wrap.classList.add(ok ? 'mode-gl' : 'mode-svg');
      wrap.addEventListener('click', function () { window.Barrel.toggle(); });
    },
    setActive: function (on) {
      S.active = !!on;
      if (S.mode === 'webgl' && S.active && !S.raf) S.raf = requestAnimationFrame(G.frame);
      if (!S.active && S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; }
    },
    toggle: function () {
      var to = S.target === CTX_LOW ? CTX_HIGH : CTX_LOW; S.target = to;
      S.anim = { from: S.hc, to: to, start: performance.now(), dur: 1800 };
      slideEl.classList.toggle('grown', to === CTX_HIGH);
      if (S.mode === 'webgl') { if (!S.raf) S.raf = requestAnimationFrame(G.frame); requestAnimationFrame(function () { drawSVGLater(); }); }
      else requestAnimationFrame(svgAnimFrame);
    },
    state: function () { return { mode: S.mode, active: S.active, running: !!S.raf, hc: +S.hc.toFixed(3), frames: G.frames || 0 }; }
  };
  // keep the (print) SVG in sync with the final WebGL state
  function drawSVGLater() { setTimeout(function () { var keep = S.hc; S.hc = S.target; drawSVG(); S.hc = keep; }, 1900); }
})();
