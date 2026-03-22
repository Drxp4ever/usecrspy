/**
 * CRSPY v3.0 — script.js
 * "Worth $8M" edition
 *
 * Sections:
 *  1. Constants & Palettes
 *  2. State
 *  3. Three.js scene handles
 *  4. Utilities
 *  5. Preloader
 *  6. Custom cursor
 *  7. Nav + drawer
 *  8. Scroll reveals + counters
 *  9. Smooth anchor scroll
 * 10. Hero canvas (grid + particles)
 * 11. Hero parallax
 * 12. Live HUD chip data (simulated)
 * 13. Biometric dashboard (HR chart, SpO2, stress, steps)
 * 14. Three.js demo scene
 * 15. Demo controls (sliders, toggles, palette, geometry)
 * 16. AR Mirror (webcam + canvas overlays)
 * 17. CTA canvas (particle burst)
 * 18. Palette switcher
 * 19. Keyboard shortcuts
 * 20. Toast system
 * 21. Nav clock
 * 22. Reserve button easter egg
 * 23. Init
 */
'use strict';

/* ═══════════════════════════════════════════════
   1. CONSTANTS & PALETTES
═══════════════════════════════════════════════ */
const PALETTES = {
  cyan:   { hex:0x00f0ff, css:'#00f0ff', rgb:[0,240,255] },
  violet: { hex:0xc47bff, css:'#c47bff', rgb:[196,123,255] },
  ember:  { hex:0xff5f2e, css:'#ff5f2e', rgb:[255,95,46] },
  lime:   { hex:0x39ff14, css:'#39ff14', rgb:[57,255,20] },
  gold:   { hex:0xffc107, css:'#ffc107', rgb:[255,193,7] },
  rose:   { hex:0xff4488, css:'#ff4488', rgb:[255,68,136] },
};

const APP_NAMES = [
  'Navigation','Health','Messages','Translate','Calendar','Music',
  'Weather','Camera','Notes','Finance','Fitness','AI Assistant',
  'Gallery','Workspace','Maps','Timer','Social','AR Plus','Search','Alarm',
  'Contacts','News','Podcast','Payments','Scanner'
];

const GEO_MODES = { mix:0, cubes:1, spheres:2, rings:3 };

/* ═══════════════════════════════════════════════
   2. STATE
═══════════════════════════════════════════════ */
const S = {
  palette:   'cyan',
  geoMode:   'mix',
  demoOn:    false,
  demoBuilt: false,
  mirrorOn:  false,

  /* scene params */
  objCount:  8,
  speed:     10,
  glow:      60,
  radius:    4,
  particles: 200,
  fog:       4,
  labels:    true,
  wire:      false,
  orbit:     true,
  bloom:     true,
  gridFloor: true,
  pulse:     true,

  /* cursor */
  mx:0, my:0, rx:0, ry:0,

  /* three interaction */
  ndx:0, ndy:0,
  hovered:null, selected:null,
  orbitA:0, orbitY:0,
  demoTime:0,

  /* drag orbit */
  dragging:false, dragX:0, dragY:0,
  camPhi:1.1, camTheta:0,

  /* scroll zoom */
  camDist:10, camDistTarget:10,

  /* device tilt */
  devBeta:0, devGamma:0,

  /* frame stats */
  fps:0, frames:0, lastFpsT:0,

  /* mirror */
  mirrorLens: 'none',
};

/* ═══════════════════════════════════════════════
   3. THREE SCENE
═══════════════════════════════════════════════ */
const T = {
  renderer:null, scene:null, camera:null,
  clock:null, raycaster:null, ptr:null,
  cubes:[], particles:null, orb:null,
  rimLight:null, gridHelper:null,
  animId:null,
};

/* ═══════════════════════════════════════════════
   4. UTILITIES
═══════════════════════════════════════════════ */
const lerp = (a,b,t) => a + (b-a)*t;
const clamp = (v,lo,hi) => Math.min(Math.max(v,lo),hi);
const rand = (lo,hi) => lo + Math.random()*(hi-lo);
const randInt = (lo,hi) => Math.floor(rand(lo,hi+1));
const debounce = (fn,ms) => { let id; return (...a) => { clearTimeout(id); id=setTimeout(()=>fn(...a),ms); }; };
const $ = id => document.getElementById(id);
const pal = () => PALETTES[S.palette];

/* ═══════════════════════════════════════════════
   5. PRELOADER
═══════════════════════════════════════════════ */
(function preloader() {
  const el    = $('preloader');
  const pct   = $('prePct');
  const bar   = $('preBar');
  const fill  = document.querySelector('.pre-fill');
  if (!el) return;

  document.body.classList.add('loading');
  let progress = 0;

  const circ = 2 * Math.PI * 42; // stroke-dasharray
  const tick = () => {
    progress += rand(4, 11);
    if (progress > 100) progress = 100;

    const pf = Math.round(progress);
    if (pct) pct.textContent = pf + '%';
    if (bar) bar.style.width = pf + '%';
    if (fill) fill.style.strokeDashoffset = circ * (1 - progress/100);

    if (progress < 100) {
      setTimeout(tick, rand(80, 200));
    } else {
      setTimeout(() => {
        if (el) el.classList.add('done');
        document.body.classList.remove('loading');
      }, 300);
    }
  };
  setTimeout(tick, 200);
})();

/* ═══════════════════════════════════════════════
   6. CUSTOM CURSOR
═══════════════════════════════════════════════ */
(function initCursor() {
  const dot  = $('cur-dot');
  const ring = $('cur-ring');
  if (!dot || !ring) return;
  if (!window.matchMedia('(hover:hover)').matches) return;

  document.addEventListener('mousemove', e => { S.mx = e.clientX; S.my = e.clientY; }, { passive:true });

  document.addEventListener('mouseover', e => {
    const big = !!e.target.closest('a,button,[tabindex="0"],.vc,.ac,.app-card');
    dot.classList.toggle('big', big);
    ring.classList.toggle('big', big);
  });

  (function tick() {
    dot.style.left  = S.mx + 'px';
    dot.style.top   = S.my + 'px';
    S.rx = lerp(S.rx, S.mx, 0.11);
    S.ry = lerp(S.ry, S.my, 0.11);
    ring.style.left = S.rx + 'px';
    ring.style.top  = S.ry + 'px';
    requestAnimationFrame(tick);
  })();
})();

/* ═══════════════════════════════════════════════
   7. NAV + DRAWER
═══════════════════════════════════════════════ */
(function initNav() {
  const nav    = $('nav');
  const burger = $('burger');
  const drawer = $('drawer');

  window.addEventListener('scroll', () => {
    if (nav) nav.classList.toggle('stuck', window.scrollY > 60);
    // Active link
    const secs = document.querySelectorAll('section[id]');
    let cur = '';
    secs.forEach(s => { if (s.offsetTop - 130 <= window.scrollY) cur = s.id; });
    document.querySelectorAll('.nl').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + cur);
    });
  }, { passive:true });

  if (burger && drawer) {
    burger.addEventListener('click', () => {
      const open = drawer.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
    });
    drawer.querySelectorAll('.dl').forEach(l => {
      l.addEventListener('click', () => {
        drawer.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }
})();

/* ═══════════════════════════════════════════════
   8. SCROLL REVEALS + COUNTERS
═══════════════════════════════════════════════ */
(function initReveal() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } });
  }, { threshold:0.1, rootMargin:'0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
})();

(function initCounters() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el  = e.target;
      const end = parseFloat(el.dataset.target);
      const dur = 1500;
      const t0  = performance.now();
      const isInt = Number.isInteger(end);
      const tick = now => {
        const p = Math.min((now-t0)/dur, 1);
        const v = end * (1 - Math.pow(1-p, 3));
        el.textContent = isInt ? Math.round(v) : v.toFixed(1);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold:0.5 });
  document.querySelectorAll('[data-target]').forEach(el => io.observe(el));
})();

/* ═══════════════════════════════════════════════
   9. SMOOTH ANCHOR SCROLL
═══════════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    const off = ($('nav')?.offsetHeight || 70) + 10;
    window.scrollTo({ top: t.getBoundingClientRect().top + scrollY - off, behavior:'smooth' });
  });
});

/* ═══════════════════════════════════════════════
   10. HERO CANVAS — grid + particle field
═══════════════════════════════════════════════ */
(function heroCanvas() {
  // Grid canvas
  const gc  = $('c-grid');
  const gx  = gc?.getContext('2d');
  // Particle canvas
  const pc  = $('c-particles');
  const px  = pc?.getContext('2d');
  if (!gc || !pc || !gx || !px) return;

  let W, H;
  let stars = [], connections = [];

  function resize() {
    W = gc.width  = pc.width  = window.innerWidth;
    H = gc.height = pc.height = window.innerHeight;
    stars = Array.from({ length:120 }, () => ({
      x: Math.random()*W, y: Math.random()*H,
      vx: rand(-.12,.12), vy: rand(-.08,.08),
      r: rand(.3,1.6), a: Math.random(),
      phase: Math.random()*Math.PI*2,
    }));
  }
  window.addEventListener('resize', debounce(resize, 250));
  resize();

  let t = 0;
  function drawGrid() {
    gx.clearRect(0,0,W,H);
    const cellW = 60, cellH = 60;
    gx.strokeStyle = 'rgba(0,240,255,0.03)';
    gx.lineWidth = 1;
    // Vertical lines with mouse influence
    const offX = (S.mx / W - .5) * 20;
    const offY = (S.my / H - .5) * 20;
    for (let x = offX % cellW; x < W; x += cellW) {
      gx.beginPath(); gx.moveTo(x,0); gx.lineTo(x,H); gx.stroke();
    }
    for (let y = offY % cellH; y < H; y += cellH) {
      gx.beginPath(); gx.moveTo(0,y); gx.lineTo(W,y); gx.stroke();
    }
    // Radial glow at cursor
    const rg = gx.createRadialGradient(S.mx,S.my,0,S.mx,S.my,300);
    rg.addColorStop(0, `rgba(${pal().rgb.join(',')},0.04)`);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    gx.fillStyle = rg;
    gx.fillRect(0,0,W,H);
  }

  function drawParticles() {
    px.clearRect(0,0,W,H);
    t += .007;
    const ac = `rgba(${pal().rgb.join(',')},`;

    stars.forEach(s => {
      s.x += s.vx; s.y += s.vy;
      if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
      if (s.y < 0) s.y = H; if (s.y > H) s.y = 0;
      const alpha = s.a * (.3 + .7*(.5+.5*Math.sin(t*40*s.phase*.02 + s.phase)));
      px.beginPath(); px.arc(s.x, s.y, s.r, 0, Math.PI*2);
      px.fillStyle = `rgba(200,225,255,${alpha})`; px.fill();
    });

    // Connect nearby stars
    for (let i = 0; i < stars.length; i++) {
      for (let j = i+1; j < stars.length; j++) {
        const dx = stars[i].x - stars[j].x, dy = stars[i].y - stars[j].y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < 100) {
          px.beginPath();
          px.moveTo(stars[i].x, stars[i].y);
          px.lineTo(stars[j].x, stars[j].y);
          px.strokeStyle = ac + (1-d/100)*.06 + ')';
          px.lineWidth = .5;
          px.stroke();
        }
      }
    }

    // Horizontal scan line
    const sl = ((t*18) % (H+60)) - 30;
    const slg = px.createLinearGradient(0, sl-25, 0, sl+25);
    slg.addColorStop(0, 'rgba(0,240,255,0)');
    slg.addColorStop(.5, `rgba(${pal().rgb.join(',')},0.03)`);
    slg.addColorStop(1, 'rgba(0,240,255,0)');
    px.fillStyle = slg; px.fillRect(0, sl-25, W, 50);
  }

  (function loop() {
    requestAnimationFrame(loop);
    drawGrid(); drawParticles();
  })();
})();

/* ═══════════════════════════════════════════════
   11. HERO PARALLAX (mouse tilt)
═══════════════════════════════════════════════ */
(function initParallax() {
  const layer = document.querySelector('.parallax-layer');
  if (!layer) return;
  let tx=0, ty=0;
  (function tick() {
    requestAnimationFrame(tick);
    const dx = (S.mx/window.innerWidth  - .5) * 30;
    const dy = (S.my/window.innerHeight - .5) * 20;
    tx = lerp(tx, dx, .05); ty = lerp(ty, dy, .05);
    layer.style.transform = `translate(${tx}px, ${ty}px)`;
  })();
})();

/* ═══════════════════════════════════════════════
   12. LIVE HUD CHIP DATA
═══════════════════════════════════════════════ */
(function liveChips() {
  let hr = 72;
  setInterval(() => {
    hr = clamp(hr + rand(-1.5, 1.5), 58, 96);
    const hrEl = $('chipHr');
    if (hrEl) hrEl.textContent = Math.round(hr) + ' bpm';
    // Also update bio dashboard
    const bioHr = $('bioHr');
    if (bioHr) bioHr.childNodes[0].textContent = Math.round(hr) + ' ';
  }, 1800);

  let bat = 94;
  setInterval(() => {
    bat = Math.max(1, bat - .05);
    const el = $('chipBat');
    if (el) el.textContent = Math.round(bat) + '%';
  }, 4000);
})();

/* ═══════════════════════════════════════════════
   13. BIOMETRIC DASHBOARD
═══════════════════════════════════════════════ */
(function initBio() {
  /* ── HR Chart (Canvas 2D line) ── */
  const hrCvs = $('hrChart');
  if (hrCvs) {
    const ctx = hrCvs.getContext('2d');
    let hrData = Array.from({length:60}, () => rand(64,82));
    let hrT = 0;

    function drawHr() {
      const W = hrCvs.offsetWidth;
      if (W === 0) return;
      hrCvs.width  = W;
      hrCvs.height = 80;
      const H = 80;
      ctx.clearRect(0,0,W,H);

      // Gradient fill
      const grad = ctx.createLinearGradient(0,0,0,H);
      grad.addColorStop(0, `rgba(${PALETTES[S.palette].rgb.join(',')},0.3)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      const step = W / (hrData.length-1);
      const min = 50, max = 100;
      const toY = v => H - ((v-min)/(max-min)) * (H*.85) - H*.05;

      ctx.beginPath();
      hrData.forEach((v,i) => { i===0 ? ctx.moveTo(0,toY(v)) : ctx.lineTo(i*step,toY(v)); });
      ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();

      ctx.beginPath();
      hrData.forEach((v,i) => { i===0 ? ctx.moveTo(0,toY(v)) : ctx.lineTo(i*step,toY(v)); });
      ctx.strokeStyle = PALETTES[S.palette].css;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 6; ctx.shadowColor = PALETTES[S.palette].css;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    setInterval(() => {
      hrT++;
      hrData.push(rand(62, 88));
      if (hrData.length > 60) hrData.shift();
      drawHr();
    }, 500);
    setTimeout(drawHr, 200);
  }

  /* ── SpO2 ring ── */
  let spo = 98;
  function updateSpo() {
    spo = clamp(spo + rand(-.3,.3), 95, 100);
    const v = Math.round(spo*10)/10;
    const el = $('spo2Pct');  if (el) el.textContent = Math.round(v);
    const bio = $('bioSpo'); if (bio) bio.childNodes[0].textContent = Math.round(v) + ' ';
    const arc = $('spo2Arc');
    if (arc) {
      const circ = 2*Math.PI*48;
      arc.style.strokeDashoffset = circ * (1 - v/100);
    }
  }
  setInterval(updateSpo, 2200);
  setTimeout(updateSpo, 300);

  /* ── Stress bars ── */
  function randStress() {
    const update = (id, valId, base) => {
      const v = clamp(base + rand(-3,3), 10, 75);
      const el = $(id);   if (el) el.style.width = v + '%';
      const vl = $(valId); if (vl) vl.textContent = Math.round(v);
    };
    update('sbMental',   'sbMentalV',   22);
    update('sbPhysical', 'sbPhysicalV', 35);
    update('sbOverall',  'sbOverallV',  28);
  }
  setInterval(randStress, 2500);

  /* ── Steps progress ── */
  let steps = 7241;
  function updateSteps() {
    steps = Math.min(10000, steps + randInt(0, 12));
    const pct = Math.round(steps/10000*100);
    const el  = $('bioSteps');  if (el) el.textContent = steps.toLocaleString();
    const sp  = $('stepsPct');  if (sp) sp.textContent = pct;
    const arc = $('stepsArc');
    if (arc) {
      const total = 157;
      arc.style.strokeDashoffset = total * (1 - pct/100);
    }
  }
  setInterval(updateSteps, 3000);
  setTimeout(updateSteps, 400);
})();

/* ═══════════════════════════════════════════════
   14. THREE.JS DEMO SCENE
═══════════════════════════════════════════════ */
function buildScene() {
  if (typeof THREE === 'undefined') {
    toast('WebGL / Three.js unavailable in this browser', 'w', 6000);
    return false;
  }
  const vp  = $('arVp');
  const cvs = $('ar-canvas');
  if (!vp || !cvs) return false;

  const W = vp.clientWidth  || 800;
  const H = vp.clientHeight || 520;

  /* Renderer */
  T.renderer = new THREE.WebGLRenderer({ canvas:cvs, antialias:true, alpha:true });
  T.renderer.setSize(W, H);
  T.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  T.renderer.shadowMap.enabled = true;
  T.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  T.renderer.setClearColor(0x000000, 0);
  T.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  /* Scene */
  T.scene = new THREE.Scene();
  T.scene.fog = new THREE.FogExp2(0x010408, S.fog / 100);

  /* Camera */
  T.camera = new THREE.PerspectiveCamera(60, W/H, .1, 200);
  T.camera.position.set(0, 1.5, S.camDist);

  /* Raycaster */
  T.raycaster = new THREE.Raycaster();
  T.ptr = new THREE.Vector2();

  /* Clock */
  T.clock = new THREE.Clock();

  /* Lights */
  T.scene.add(new THREE.AmbientLight(0x0a1830, .7));
  const key = new THREE.DirectionalLight(0xffeedd, .9);
  key.position.set(6,10,6); key.castShadow = true; key.shadow.mapSize.set(1024,1024);
  T.scene.add(key);
  T.rimLight = new THREE.PointLight(pal().hex, 2.5, 30);
  T.rimLight.position.set(-6,4,-4); T.rimLight.name = 'rim'; T.scene.add(T.rimLight);
  T.scene.add(Object.assign(new THREE.PointLight(0x1a2a40,1.1,38), {position:{x:8,y:-3,z:8}}));
  T.scene.add(new THREE.HemisphereLight(0x0d1f38, 0x050a14, .5));

  /* Grid */
  T.gridHelper = new THREE.GridHelper(50, 50, 0x0a1a28, 0x0a1a28);
  T.gridHelper.position.y = -4;
  T.scene.add(T.gridHelper);

  /* Central orb */
  const orbG = new THREE.SphereGeometry(.42, 32, 32);
  const orbM = new THREE.MeshStandardMaterial({
    color: pal().hex, emissive: pal().hex,
    emissiveIntensity: 1.6, metalness:.2, roughness:.1,
    transparent:true, opacity:.9,
  });
  orbM.name = 'orbMat';
  T.orb = new THREE.Mesh(orbG, orbM); T.orb.name = 'orb'; T.scene.add(T.orb);

  /* Particles */
  buildParticles();

  /* Objects */
  buildObjects();

  /* Pointer */
  bindPointer(vp);

  /* Resize */
  window.addEventListener('resize', debounce(() => {
    if (!T.renderer || !vp) return;
    const w = vp.clientWidth, h = vp.clientHeight;
    T.renderer.setSize(w, h);
    T.camera.aspect = w/h; T.camera.updateProjectionMatrix();
  }, 200));

  return true;
}

/* ─── Particles ─────────────────────────────── */
function buildParticles() {
  if (!T.scene) return;
  if (T.particles) { T.scene.remove(T.particles); T.particles.geometry.dispose(); T.particles.material.dispose(); }
  const n = Math.round(S.particles);
  const pos = new Float32Array(n*3);
  for (let i = 0; i < n*3; i++) pos[i] = (Math.random()-.5)*34;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  const m = new THREE.PointsMaterial({ color:pal().hex, size:.07, transparent:true, opacity:.4, sizeAttenuation:true });
  m.name = 'pMat';
  T.particles = new THREE.Points(g,m); T.particles.name = 'pts'; T.scene.add(T.particles);
}

/* ─── Objects ───────────────────────────────── */
function buildObjects() {
  if (!T.scene) return;
  // Tear down
  T.cubes.forEach(({mesh,label}) => {
    T.scene.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) mesh.material.dispose();
    if (label?.parentNode) label.remove();
  });
  T.cubes = []; S.hovered = null; S.selected = null;
  hideSelPanel();

  const n = Math.round(S.objCount);
  for (let i = 0; i < n; i++) {
    const sz   = rand(.45,.95);
    const geo  = makeGeo(i, sz);
    const hue  = i/n;
    const col  = new THREE.Color().setHSL(hue, .82, .55);
    const mat  = new THREE.MeshStandardMaterial({
      color:col, emissive:col,
      emissiveIntensity: .2 + S.glow*.018,
      metalness:.55, roughness:.3,
      transparent:true, opacity:.9,
      wireframe:S.wire,
    });
    const mesh = new THREE.Mesh(geo, mat);

    // Spherical scatter
    const theta = (i/n)*Math.PI*2;
    const phi   = rand(.25,.9)*Math.PI;
    const r     = S.radius * rand(.7,1.3);
    const bx = r*Math.sin(phi)*Math.cos(theta);
    const by = r*Math.cos(phi)*rand(-.6,.8);
    const bz = r*Math.sin(phi)*Math.sin(theta);
    mesh.position.set(bx,by,bz);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData = { name:APP_NAMES[i % APP_NAMES.length], type:getTypeName(i) };

    const spd = { x:rand(-.8,.8), y:rand(-.8,.8), z:rand(-.3,.3) };
    const label = makeLabel(APP_NAMES[i % APP_NAMES.length]);
    T.cubes.push({ mesh, label, base:{x:bx,y:by,z:bz}, spd, phase:rand(0,Math.PI*2), idx:i });
    T.scene.add(mesh);
  }

  // HUD
  const vo = $('vpObjs');  if (vo) vo.textContent = n + ' objects';
  updateRendererStats();
}

function makeGeo(i, sz) {
  const m = S.geoMode;
  if (m === 'cubes')   return new THREE.BoxGeometry(sz,sz,sz);
  if (m === 'spheres') return new THREE.SphereGeometry(sz*.6, 20, 20);
  if (m === 'rings')   return new THREE.TorusGeometry(sz*.5, sz*.18, 12, 32);
  // mix
  const t = i%6;
  if (t===0) return new THREE.BoxGeometry(sz,sz,sz);
  if (t===1) return new THREE.OctahedronGeometry(sz*.7);
  if (t===2) return new THREE.TetrahedronGeometry(sz*.75);
  if (t===3) return new THREE.IcosahedronGeometry(sz*.62);
  if (t===4) return new THREE.TorusGeometry(sz*.48, sz*.16, 10, 28);
  return new THREE.DodecahedronGeometry(sz*.62);
}

function getTypeName(i) {
  const types = ['Hologram','Data Node','AR Anchor','Interface','Widget','Overlay'];
  return types[i % types.length];
}

function makeLabel(name) {
  const el = document.createElement('div');
  el.className = 'ar-lbl';
  el.textContent = name;
  el.style.display = S.labels ? 'block' : 'none';
  $('arVp')?.appendChild(el);
  return el;
}

function updateRendererStats() {
  if (!T.renderer) return;
  const info = T.renderer.info;
  const d = $('stDraws'); if (d) d.textContent = info.render?.calls ?? '—';
  const r = $('stTris');  if (r) r.textContent = (info.render?.triangles ?? 0).toLocaleString();
  const g = $('stGeo');   if (g) g.textContent = info.memory?.geometries ?? '—';
}

/* ─── Palette apply ─────────────────────────── */
function applyPalette3D() {
  const p = pal();
  if (T.rimLight) T.rimLight.color.setHex(p.hex);
  if (T.orb?.material) { T.orb.material.color.setHex(p.hex); T.orb.material.emissive.setHex(p.hex); }
  if (T.particles?.material) T.particles.material.color.setHex(p.hex);
}

/* ─── Pointer ───────────────────────────────── */
function bindPointer(vp) {
  const toNDC = (cx,cy) => {
    const r = vp.getBoundingClientRect();
    T.ptr.x = ((cx-r.left)/r.width)  *  2 - 1;
    T.ptr.y = ((cy-r.top) /r.height) * -2 + 1;
  };

  vp.addEventListener('mousemove', e => { toNDC(e.clientX, e.clientY); }, { passive:true });
  vp.addEventListener('touchmove', e => {
    if (e.touches.length) toNDC(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive:true });

  // Drag orbit
  vp.addEventListener('mousedown', e => { S.dragging=true; S.dragX=e.clientX; S.dragY=e.clientY; });
  window.addEventListener('mousemove', e => {
    if (!S.dragging) return;
    const dx = e.clientX - S.dragX;
    const dy = e.clientY - S.dragY;
    S.dragX = e.clientX; S.dragY = e.clientY;
    S.camTheta += dx * .006;
    S.camPhi   = clamp(S.camPhi + dy * .004, .2, Math.PI-.2);
    if (S.orbit) S.orbit = false; // pause auto-orbit while dragging
  });
  window.addEventListener('mouseup', () => {
    if (S.dragging) {
      S.dragging = false;
      S.orbit = $('tOrb')?.checked ?? true; // restore
    }
  });

  // Scroll zoom
  vp.addEventListener('wheel', e => {
    e.preventDefault();
    S.camDistTarget = clamp(S.camDistTarget + e.deltaY * .02, 3, 22);
  }, { passive:false });

  // Click select
  vp.addEventListener('click', e => {
    if (Math.abs(e.clientX - S.dragX) < 3 && S.hovered) onSelect(S.hovered);
  });
}

/* ─── Raycast ───────────────────────────────── */
function doRaycast() {
  if (!T.raycaster || !T.camera || !T.cubes.length) return;
  T.raycaster.setFromCamera(T.ptr, T.camera);
  const hits = T.raycaster.intersectObjects(T.cubes.map(c=>c.mesh));
  const tip  = $('objTooltip');

  if (hits.length) {
    const data = T.cubes.find(c => c.mesh === hits[0].object);
    if (data !== S.hovered) {
      if (S.hovered) endHover(S.hovered);
      S.hovered = data;
      if (data) startHover(data);
    }
    if (tip && data) {
      const vp = $('arVp');
      const pos = new THREE.Vector3(); data.mesh.getWorldPosition(pos); pos.project(T.camera);
      tip.style.left = ((pos.x*.5+.5)*vp.clientWidth)+'px';
      tip.style.top  = ((-pos.y*.5+.5)*vp.clientHeight - 32)+'px';
      tip.textContent = data.mesh.userData.name;
      tip.classList.add('show');
    }
  } else {
    if (S.hovered) { endHover(S.hovered); S.hovered = null; }
    if (tip) tip.classList.remove('show');
  }
}

function startHover(d) {
  if (d.mesh?.material) d.mesh.material.emissiveIntensity = 2.8;
  if (d.label) d.label.classList.add('hi');
  const vp = $('arVp'); if (vp) vp.style.cursor = 'pointer';
}
function endHover(d) {
  if (d.mesh?.material) d.mesh.material.emissiveIntensity = .2 + S.glow*.018;
  if (d.label) d.label.classList.remove('hi');
  const vp = $('arVp'); if (vp) vp.style.cursor = 'crosshair';
}
function onSelect(d) {
  if (S.selected && S.selected !== d) S.selected.mesh.scale.setScalar(1);
  S.selected = d;
  d.mesh.scale.setScalar(1.55);
  // Show panel
  const panel = $('selPanel');
  if (panel) {
    panel.classList.add('show');
    const n = $('selName'); if (n) n.textContent = d.mesh.userData.name;
    const ty= $('selType'); if (ty) ty.textContent = d.mesh.userData.type;
    const p = d.mesh.position;
    const po= $('selPos');  if (po) po.textContent = `${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`;
  }
  toast(`Selected: ${d.mesh.userData.name}`, 'i', 2000);
}
function hideSelPanel() {
  const p = $('selPanel'); if (p) p.classList.remove('show');
  if (S.selected) { S.selected.mesh.scale.setScalar(1); S.selected = null; }
}

/* ─── Label projection ──────────────────────── */
function projectLabels() {
  if (!T.camera || !T.renderer) return;
  const vp = $('arVp'); if (!vp) return;
  const W = vp.clientWidth, H = vp.clientHeight;
  T.cubes.forEach(({mesh,label}) => {
    if (!label || label.style.display === 'none') return;
    const pos = new THREE.Vector3(); mesh.getWorldPosition(pos);
    pos.y += .65; pos.project(T.camera);
    if (pos.z < 1) {
      label.style.opacity = '1';
      label.style.left = (pos.x*.5+.5)*W + 'px';
      label.style.top  = (-pos.y*.5+.5)*H + 'px';
    } else { label.style.opacity = '0'; }
  });
  // Update sel panel rotation
  if (S.selected) {
    const r = S.selected.mesh.rotation;
    const sr = $('selRot');
    if (sr) sr.textContent = `${r.x.toFixed(1)}, ${r.y.toFixed(1)}, ${r.z.toFixed(1)}`;
  }
}

/* ─── HUD update ────────────────────────────── */
let _fc=0, _lt=0;
function updateHud(now) {
  _fc++;
  if (now - _lt >= 1000) {
    const f = $('vpFps'); if (f) f.textContent = _fc + ' fps';
    _fc=0; _lt=now;
    updateRendererStats();
  }
  const p = T.camera?.position;
  if (p) {
    const c = $('vpCoord');
    if (c) c.textContent = `CAM x:${p.x.toFixed(1)} y:${p.y.toFixed(1)} z:${p.z.toFixed(1)}`;
  }
  S.demoTime += .016;
  const mins = Math.floor(S.demoTime/60).toString().padStart(2,'0');
  const secs = Math.floor(S.demoTime%60).toString().padStart(2,'0');
  const vt = $('vpTime'); if (vt) vt.textContent = mins+':'+secs;
}

/* ─── Render loop ───────────────────────────── */
function renderLoop() {
  T.animId = requestAnimationFrame(renderLoop);
  if (!T.renderer || !T.scene || !T.camera) return;
  const dt  = T.clock.getDelta();
  const et  = T.clock.getElapsedTime();
  const now = performance.now();

  // Zoom lerp
  S.camDist = lerp(S.camDist, S.camDistTarget, .08);

  // Camera orbit
  if (S.orbit && !S.dragging) {
    S.camTheta += dt * .11;
    S.camPhi = lerp(S.camPhi, 1.1 + Math.sin(et*.18)*.08, .02);
  }
  const sin = Math.sin(S.camTheta), cos = Math.cos(S.camTheta);
  const sinP = Math.sin(S.camPhi), cosP = Math.cos(S.camPhi);
  T.camera.position.set(
    S.camDist * sinP * sin + S.devGamma*.05,
    S.camDist * cosP + S.devBeta*.04,
    S.camDist * sinP * cos
  );
  T.camera.lookAt(0,0,0);

  // Orb
  if (T.orb) {
    T.orb.rotation.y += dt*.9; T.orb.rotation.x += dt*.3;
    if (S.pulse && T.orb.material) {
      const p = 1 + Math.sin(et*2.5)*.09;
      T.orb.scale.setScalar(p);
      T.orb.material.emissiveIntensity = 1.4 + Math.sin(et*2.5)*.6;
    }
  }

  // Particles
  if (T.particles) T.particles.rotation.y += dt*.03;

  // Cubes
  const sm = (S.speed/10)*.7;
  T.cubes.forEach(({mesh,spd,base,phase}) => {
    mesh.rotation.x += dt*spd.x*sm;
    mesh.rotation.y += dt*spd.y*sm;
    mesh.rotation.z += dt*spd.z*sm*.35;
    mesh.position.y = base.y + Math.sin(et*.55+phase)*.3;
    mesh.position.x = base.x + Math.sin(et*.35+phase*1.2)*.14;
    if (S.selected?.mesh === mesh) {
      mesh.scale.setScalar(1.45 + Math.sin(et*4)*.08);
    }
  });

  // Rim light
  if (T.rimLight && S.pulse) {
    T.rimLight.intensity = (1+S.glow*.04)*(1+Math.sin(et*1.5)*.2);
  }

  // Grid
  if (T.gridHelper) T.gridHelper.visible = S.gridFloor;

  // Raycast every 2nd frame
  if (Math.round(et*60)%2===0) doRaycast();

  projectLabels();
  updateHud(now);
  T.renderer.render(T.scene, T.camera);
}

/* ═══════════════════════════════════════════════
   15. DEMO CONTROLS
═══════════════════════════════════════════════ */
function bindSlider(id, valId, fmt, key, live) {
  const sl = $(id), vl = $(valId);
  if (!sl) return;
  sl.addEventListener('input', () => {
    const v = parseFloat(sl.value);
    S[key] = v;
    if (vl) vl.textContent = fmt(v);
    if (S.demoOn && live) live(v);
  });
  // Init display
  if (vl) vl.textContent = fmt(parseFloat(sl.value));
}

bindSlider('sObj',  'vObj',  v=>Math.round(v),           'objCount',  null);
bindSlider('sSpd',  'vSpd',  v=>(v/10).toFixed(1)+'×',  'speed',     null);
bindSlider('sGlw',  'vGlw',  v=>Math.round(v)+'%',      'glow',      v=>{
  T.cubes.forEach(c=>{ if (c.mesh?.material) c.mesh.material.emissiveIntensity=.2+v*.018; });
  if (T.rimLight) T.rimLight.intensity = 1+v*.04;
});
bindSlider('sRad',  'vRad',  v=>v.toFixed(1),            'radius',    null);
bindSlider('sPart', 'vPart', v=>Math.round(v),           'particles', null);
bindSlider('sFog',  'vFog',  v=>(v/100).toFixed(2),      'fog',       v=>{
  if (T.scene?.fog) T.scene.fog.density = v/100;
});

// Toggles
const bindTog = (id, key, cb) => {
  const el = $(id); if (!el) return;
  el.addEventListener('change', () => { S[key]=el.checked; if(cb) cb(el.checked); });
};
bindTog('tLbl',  'labels',    v => T.cubes.forEach(c=>{ if(c.label) c.label.style.display=v?'block':'none'; }));
bindTog('tWire', 'wire',      v => T.cubes.forEach(c=>{ if(c.mesh?.material) c.mesh.material.wireframe=v; }));
bindTog('tOrb',  'orbit',     null);
bindTog('tBlm',  'bloom',     null);
bindTog('tGrid', 'gridFloor', v => { if(T.gridHelper) T.gridHelper.visible=v; });
bindTog('tPls',  'pulse',     null);

// Geometry buttons
document.querySelectorAll('.cp-geo').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cp-geo').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    S.geoMode = btn.dataset.geo;
    if (S.demoOn) { buildObjects(); toast('Geometry: '+S.geoMode,'i',2000); }
  });
});

// Apply + Reset
$('applyBtn')?.addEventListener('click', () => {
  if (!S.demoOn) { toast('Start the demo first','w',2500); return; }
  buildObjects(); buildParticles();
  toast(`Scene updated — ${Math.round(S.objCount)} objects`,'s',2500);
});
$('resetBtn')?.addEventListener('click', stopDemo);
$('selClose')?.addEventListener('click', hideSelPanel);

/* ═══════════════════════════════════════════════
   16. START / STOP DEMO
═══════════════════════════════════════════════ */
function startDemo() {
  if (S.demoOn) return;
  if (!S.demoBuilt) {
    if (!buildScene()) return;
    S.demoBuilt = true;
  }
  S.demoOn = true;
  S.demoTime = 0;

  $('vpIdle')?.classList.add('gone');
  $('arVp')?.classList.add('live');
  $('arVp').style.cursor = 'crosshair';

  const badge = $('vpBadge');
  if (badge) { badge.textContent = 'ACTIVE'; badge.classList.add('on'); }
  const mode = $('vpMode'); if (mode) mode.textContent = 'AR SCENE';
  const dot  = $('cpLiveDot'); if (dot) dot.classList.add('on');

  T.clock.start();
  renderLoop();
  toast('AR Scene activated — Three.js running','s');
}

function stopDemo() {
  if (T.animId) { cancelAnimationFrame(T.animId); T.animId = null; }
  T.cubes.forEach(({label})=>{ if(label?.parentNode) label.remove(); });
  T.cubes = [];
  if (T.scene) {
    T.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
  if (T.renderer) {
    T.renderer.dispose();
  }
  T.renderer=T.scene=T.camera=T.orb=T.rimLight=T.gridHelper=T.particles=null;
  S.demoOn=S.demoBuilt=false;
  S.selected=S.hovered=null;
  S.orbitA=0; S.demoTime=0;
  S.camDist=S.camDistTarget=10;
  S.camTheta=0; S.camPhi=1.1;

  $('vpIdle')?.classList.remove('gone');
  $('arVp')?.classList.remove('live');
  hideSelPanel();

  const badge=$('vpBadge'); if(badge){badge.textContent='INACTIVE';badge.classList.remove('on');}
  const mode=$('vpMode'); if(mode) mode.textContent='STANDBY';
  const dot=$('cpLiveDot'); if(dot) dot.classList.remove('on');
  const fps=$('vpFps'); if(fps) fps.textContent='— fps';
  const co=$('vpCoord'); if(co) co.textContent='CAM x:0.0 y:0.0 z:0.0';
  const vt=$('vpTime'); if(vt) vt.textContent='00:00';

  toast('Scene reset','i',2000);
}

// Start buttons
$('heroStart')?.addEventListener('click', () => {
  document.getElementById('demo')?.scrollIntoView({ behavior:'smooth' });
  setTimeout(startDemo, 700);
});
$('startBtn')?.addEventListener('click', startDemo);

/* ═══════════════════════════════════════════════
   17. AR MIRROR (webcam + canvas overlay)
═══════════════════════════════════════════════ */
(function initMirror() {
  const idle    = $('mirrorIdle');
  const video   = $('mirrorVideo');
  const canvas  = $('mirrorCanvas');
  const hud     = $('mirrorHud');
  const vp      = $('mirrorVp');
  const startBtn= $('mirrorStart');
  if (!startBtn) return;

  let ctx, animRunning = false, stream = null;

  startBtn.addEventListener('click', async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast('Camera not available','w'); return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:'user', width:{ideal:1280}, height:{ideal:720} },
        audio: false,
      });
      video.srcObject = stream;
      S.mirrorOn = true;
      if (idle) idle.classList.add('gone');
      if (hud)  hud.style.display = '';
      ctx = canvas?.getContext('2d');
      toast('AR Mirror activated — camera live','s');
      if (!animRunning) runMirrorLoop();
    } catch(e) {
      console.warn('[CRSPY Mirror]', e.message);
      toast('Camera access denied. Check browser permissions.','w');
    }
  });

  // HUD toggles
  const toggleHudEl = (id, show) => {
    const el = $(id); if (el) el.style.visibility = show ? '' : 'hidden';
  };
  $('mHr')?.addEventListener('change', e => toggleHudEl('mhHr', e.target.checked));
  $('mNav')?.addEventListener('change', e => {
    document.querySelectorAll('.mh-tr .mh-stat:last-child').forEach(el => el.style.visibility = e.target.checked ? '' : 'hidden');
  });
  $('mTime')?.addEventListener('change', e => toggleHudEl('mhTime', e.target.checked));
  $('mTemp')?.addEventListener('change', e => toggleHudEl('mhTemp', e.target.checked));
  $('mRet')?.addEventListener('change', e => {
    document.querySelector('.mh-reticle').style.display = e.target.checked ? '' : 'none';
  });
  $('mScan')?.addEventListener('change', e => {
    if (vp) vp.classList.toggle('scanlines', e.target.checked);
  });

  // Lens style
  document.querySelectorAll('.ms-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ms-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      S.mirrorLens = btn.dataset.style;
      if (vp) {
        vp.className = 'mirror-vp' + (S.mirrorLens !== 'none' ? ` lens-${S.mirrorLens}` : '');
        if ($('mScan')?.checked) vp.classList.add('scanlines');
      }
    });
  });

  // Mirror canvas scanline animation
  function runMirrorLoop() {
    animRunning = true;
    let t = 0;
    (function draw() {
      if (!S.mirrorOn) { animRunning=false; return; }
      requestAnimationFrame(draw);
      if (!ctx || !canvas) return;
      t += .03;
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      canvas.width = W; canvas.height = H;
      ctx.clearRect(0,0,W,H);

      // Corner reticle glow flicker
      const alpha = .15 + Math.sin(t*2)*.08;
      const ac = `rgba(${PALETTES[S.palette].rgb.join(',')},${alpha})`;
      ctx.strokeStyle = ac; ctx.lineWidth = 1.5;
      // Draw corner brackets on canvas layer
      const cx=W/2, cy=H/2, rw=80, rh=60, rs=18;
      [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([sx,sy]) => {
        const x=cx+sx*rw, y=cy+sy*rh;
        ctx.beginPath();
        ctx.moveTo(x, y + sy*rs); ctx.lineTo(x,y); ctx.lineTo(x + sx*rs, y);
        ctx.stroke();
      });

      // HR pulse ring
      const r = 22 + Math.sin(t*3)*.5;
      ctx.beginPath();
      ctx.arc(W*.82, H*.18, r, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(61,255,160,${.2+Math.sin(t*3)*.12})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Update live stats
      const mhHr = $('mhHr');
      if (mhHr) { mhHr.textContent = '♥ ' + (Math.round(69+Math.sin(t)*4)) + ' bpm'; }
      const mhTm = $('mhTime');
      if (mhTm) {
        const now = new Date();
        mhTm.textContent = now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
      }
    })();
  }
})();

/* ═══════════════════════════════════════════════
   18. CTA CANVAS (particle burst / vortex)
═══════════════════════════════════════════════ */
(function ctaCanvas() {
  const c = $('c-cta'); if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, pts = [];

  function resize() {
    W = c.width  = c.offsetWidth  || 1;
    H = c.height = c.offsetHeight || 1;
    pts = Array.from({length:80}, (_, i) => {
      const angle  = (i/80)*Math.PI*2;
      const radius = rand(100,300);
      return { angle, radius, speed:rand(.003,.009), r:rand(.4,1.4), a:rand(.1,.5) };
    });
  }
  window.addEventListener('resize', debounce(resize,300));
  setTimeout(resize, 100);

  let t = 0;
  const io = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      (function loop() {
        requestAnimationFrame(loop);
        if (!W||!H) return;
        ctx.clearRect(0,0,W,H);
        t += .008;
        // Radial gradient
        const rg = ctx.createRadialGradient(W*.5,H*.5,0,W*.5,H*.5,Math.min(W,H)*.6);
        rg.addColorStop(0, `rgba(${pal().rgb.join(',')},0.07)`);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg; ctx.fillRect(0,0,W,H);
        // Orbit particles
        pts.forEach(p => {
          p.angle += p.speed;
          const x = W*.5 + Math.cos(p.angle)*p.radius*(1+Math.sin(t+p.angle)*.1);
          const y = H*.5 + Math.sin(p.angle)*p.radius*.4*(1+Math.cos(t+p.angle)*.1);
          const alpha = p.a*(1+Math.sin(t*2+p.angle)*.4);
          ctx.beginPath(); ctx.arc(x,y,p.r,0,Math.PI*2);
          ctx.fillStyle = `rgba(${pal().rgb.join(',')},${alpha})`; ctx.fill();
        });
      })();
    }
  }, {threshold:.1});
  io.observe(c);
})();

/* ═══════════════════════════════════════════════
   19. PALETTE SWITCHER
═══════════════════════════════════════════════ */
document.querySelectorAll('.cp-pal').forEach(btn => {
  btn.addEventListener('click', () => {
    const p = btn.dataset.pal; if (!p || p===S.palette) return;
    document.querySelectorAll('.cp-pal').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    Object.keys(PALETTES).forEach(k => document.body.classList.remove('pal-'+k));
    document.body.classList.add('pal-'+p);
    S.palette = p;
    if (S.demoOn) applyPalette3D();
    toast('Theme: '+p.charAt(0).toUpperCase()+p.slice(1),'i',1800);
  });
});

/* ═══════════════════════════════════════════════
   20. TOAST
═══════════════════════════════════════════════ */
function toast(msg, type='i', dur=3500) {
  const c = $('toasts'); if (!c) return;
  const icons = {s:'✓',i:'◈',w:'!'};
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div class="t-ico ${type}">${icons[type]||'◈'}</div><span class="t-msg">${msg}</span><span class="t-x" title="close">✕</span>`;
  el.querySelector('.t-x').addEventListener('click', () => killToast(el));
  c.appendChild(el);
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('in')));
  if (dur>0) setTimeout(()=>killToast(el), dur);
}
function killToast(el) {
  if (!el?.parentNode) return;
  el.classList.remove('in'); el.classList.add('out');
  el.addEventListener('transitionend', ()=>el.remove(), {once:true});
}

/* ═══════════════════════════════════════════════
   21. NAV CLOCK
═══════════════════════════════════════════════ */
(function navClock() {
  const el = $('navTime'); if (!el) return;
  (function tick() {
    el.textContent = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    setTimeout(tick, 1000);
  })();
})();

/* ═══════════════════════════════════════════════
   22. DEVICE ORIENTATION
═══════════════════════════════════════════════ */
window.addEventListener('deviceorientation', e => {
  S.devBeta  = e.beta  || 0;
  S.devGamma = e.gamma || 0;
}, { passive:true });

/* ═══════════════════════════════════════════════
   23. KEYBOARD SHORTCUTS
═══════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return;
  if (e.key===' ')      { e.preventDefault(); S.demoOn ? stopDemo() : startDemo(); }
  if (e.key==='r'||e.key==='R') { if(S.demoOn) stopDemo(); }
  if (e.key==='Escape') {
    hideSelPanel();
    $('drawer')?.classList.remove('open');
    $('burger')?.setAttribute('aria-expanded','false');
  }
  if (e.key==='p'||e.key==='P') {
    // cycle palette
    const keys = Object.keys(PALETTES);
    const next = keys[(keys.indexOf(S.palette)+1)%keys.length];
    document.querySelector(`.cp-pal[data-pal="${next}"]`)?.click();
  }
});

/* ═══════════════════════════════════════════════
   24. RESERVE BUTTON
═══════════════════════════════════════════════ */
$('reserveBtn')?.addEventListener('click', () => {
  // Confetti burst — CSS class pulse
  const btn = $('reserveBtn');
  btn.style.transform = 'scale(.96)';
  setTimeout(()=>btn.style.transform='', 150);
  toast('🎉 You\'re on the list! CRSPY ships Q3 2025.','s',5000);
});

/* ═══════════════════════════════════════════════
   25. INIT SEQUENCE
═══════════════════════════════════════════════ */
document.body.classList.add('preload');
window.addEventListener('load', () => {
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    document.body.classList.remove('preload');
  }));
  setTimeout(()=>toast('Welcome to CRSPY — press <kbd>SPACE</kbd> to start the demo','i',5500), 2800);
});

/* Expose globally for console / expansion */
window.CRSPY = { startDemo, stopDemo, S, T, toast, PALETTES };
