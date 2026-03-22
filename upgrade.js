/**
 * CRSPY v4.0 — upgrade.js
 * New feature modules:
 *  1.  Text scramble effect on hero headline
 *  2.  Magnetic buttons
 *  3.  Scroll-driven story panels (parallax)
 *  4.  3D Glasses configurator (Three.js)
 *  5.  Configurator interactivity (swatches, editions, engraving)
 *  6.  CRSPY OS simulator
 *  7.  Testimonials carousel
 *  8.  Investor data room (press I)
 *  9.  Sound design (Web Audio API)
 * 10.  Nav link addition helpers
 */
'use strict';

/* ── helpers ──────────────────────────────────── */
const $u  = id => document.getElementById(id);
const $$u = s  => document.querySelectorAll(s);
const lerpU = (a,b,t) => a + (b-a)*t;
const randU = (lo,hi) => lo + Math.random()*(hi-lo);
const debU  = (fn,ms) => { let id; return (...a)=>{ clearTimeout(id); id=setTimeout(()=>fn(...a),ms); }; };

/* ═══════════════════════════════════════════════
   1. TEXT SCRAMBLE — hero headline
═══════════════════════════════════════════════ */
class TextScramble {
  constructor(el) {
    this.el = el;
    this.chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789◈⬡⌬◎⊕';
    this.frame = 0;
    this.queue = [];
    this.frameReq = null;
    this.original = el.textContent;
  }
  setText(newText) {
    const old = this.el.textContent;
    const len = Math.max(old.length, newText.length);
    this.queue = [];
    for (let i = 0; i < len; i++) {
      const from = old[i]  || '';
      const to   = newText[i] || '';
      const start  = Math.floor(randU(0, 6));
      const end    = start + Math.floor(randU(6, 16));
      this.queue.push({ from, to, start, end, char: '' });
    }
    cancelAnimationFrame(this.frameReq);
    this.frame = 0;
    this.tick();
    return new Promise(r => this.resolve = r);
  }
  tick() {
    let out = '';
    let complete = 0;
    this.queue.forEach(item => {
      const { from, to, start, end } = item;
      if (this.frame >= end) {
        complete++;
        out += to;
      } else if (this.frame >= start) {
        if (!item.char || Math.random() < .28) {
          item.char = this.chars[Math.floor(randU(0, this.chars.length))];
        }
        out += `<span style="color:var(--accent);opacity:.4">${item.char}</span>`;
      } else {
        out += from;
      }
    });
    this.el.innerHTML = out;
    if (complete < this.queue.length) {
      this.frame++;
      this.frameReq = requestAnimationFrame(() => this.tick());
    } else if (this.resolve) {
      this.resolve();
    }
  }
}

/* Run scramble on hero words after preloader finishes */
(function initScramble() {
  const words = $$u('.hw');
  if (!words.length) return;
  words.forEach(w => {
    const scrambler = new TextScramble(w);
    const original  = w.textContent.trim();
    let triggered   = false;

    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !triggered) {
        triggered = true;
        setTimeout(() => scrambler.setText(original), 400 + Array.from(words).indexOf(w) * 200);
        io.disconnect();
      }
    }, { threshold: .5 });
    io.observe(w);
  });
})();

/* ═══════════════════════════════════════════════
   2. MAGNETIC BUTTONS
═══════════════════════════════════════════════ */
(function initMagneticButtons() {
  if (!window.matchMedia('(hover:hover)').matches) return;

  $$u('.btn-primary, .btn-ghost, .btn-nav-cta').forEach(btn => {
    btn.classList.add('magnetic');
    let bx = 0, by = 0;

    btn.addEventListener('mousemove', e => {
      const r  = btn.getBoundingClientRect();
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height / 2;
      const dx = (e.clientX - cx) * .28;
      const dy = (e.clientY - cy) * .28;
      bx = lerpU(bx, dx, .25);
      by = lerpU(by, dy, .25);
      btn.style.transform = `translate(${bx}px,${by}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      bx = by = 0;
      btn.style.transform = '';
    });
  });
})();

/* ═══════════════════════════════════════════════
   3. SCROLL-DRIVEN STORY PARALLAX
═══════════════════════════════════════════════ */
(function initStoryParallax() {
  const panels = $$u('.story-panel');
  if (!panels.length) return;

  const onScroll = () => {
    panels.forEach(panel => {
      const rect  = panel.getBoundingClientRect();
      const wh    = window.innerHeight;
      const prog  = 1 - (rect.top + rect.height) / (wh + rect.height);
      const clamp = Math.min(Math.max(prog, 0), 1);

      // Parallax the background blob
      const bg = panel.querySelector('.sp-bg');
      if (bg) {
        const depth = parseFloat(bg.dataset.depth || .05);
        bg.style.transform = `translateY(${clamp * depth * 200}px)`;
      }

      // Parallax visual element
      const vis = panel.querySelector('.sp-glasses-float, .sp-os-preview');
      if (vis) {
        vis.style.transform = `translateY(${(clamp - .5) * -30}px)`;
      }
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ═══════════════════════════════════════════════
   4. 3D GLASSES CONFIGURATOR
═══════════════════════════════════════════════ */
(function initConfigurator() {
  const vp  = $u('cfgVp');
  const cvs = $u('cfg-canvas');
  if (!vp || !cvs || typeof THREE === 'undefined') {
    if (vp) vp.style.display = 'flex';
    return;
  }

  const W = () => vp.clientWidth  || 600;
  const H = () => vp.clientHeight || 440;

  /* Renderer */
  const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;

  /* Scene */
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, W()/H(), .1, 100);
  camera.position.set(0, .5, 6);
  camera.lookAt(0, 0, 0);

  /* Lights */
  scene.add(new THREE.AmbientLight(0x0a1828, .8));
  const key = new THREE.DirectionalLight(0xffeedd, 1.1);
  key.position.set(4, 6, 5); key.castShadow = true;
  scene.add(key);
  const fill = new THREE.PointLight(0x0088ff, .8, 20);
  fill.position.set(-5, 3, -3); scene.add(fill);
  const rimL = new THREE.PointLight(0x00f0ff, 1.5, 15);
  rimL.position.set(0, -2, 4); scene.add(rimL);

  /* Frame colours per material */
  const FRAME_COLORS = {
    titanium: { frame:0xb8bfc8, arm:0xa0a8b4 },
    carbon:   { frame:0x1a1a1a, arm:0x2a2a2a },
    gold:     { frame:0xd4a843, arm:0xc09030 },
    ceramic:  { frame:0xe8eaec, arm:0xd8dadc },
  };

  /* Lens tint colours */
  const LENS_COLORS = {
    clear:  { color:0x00f0ff, opacity:.12 },
    smoke:  { color:0x1a2030, opacity:.6  },
    amber:  { color:0xffaa22, opacity:.35 },
    mirror: { color:0x88bbdd, opacity:.45 },
  };

  /* Build glasses group */
  const glassesGroup = new THREE.Group();
  scene.add(glassesGroup);

  // Create a lens
  function makeLens(x, tintKey) {
    const g = new THREE.Group();
    const lensGeo = new THREE.CylinderGeometry(.95, .95, .08, 40);
    lensGeo.rotateX(Math.PI/2);
    const tc = LENS_COLORS[tintKey || 'clear'];
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: tc.color, transparent: true, opacity: tc.opacity,
      metalness: .1, roughness: .05, transmission: .9,
      thickness: .1,
    });
    lensMat.name = 'lensMat';
    const lens = new THREE.Mesh(lensGeo, lensMat);

    // Rim ring
    const rimGeo = new THREE.TorusGeometry(.96, .06, 12, 48);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xb8bfc8, metalness:.8, roughness:.2 });
    rimMat.name = 'rimMat';
    const rim = new THREE.Mesh(rimGeo, rimMat);

    g.add(lens, rim);
    g.position.x = x;
    return { group:g, lensMat, rimMat };
  }

  const lensL = makeLens(-1.3, 'clear');
  const lensR = makeLens( 1.3, 'clear');
  glassesGroup.add(lensL.group, lensR.group);

  // Bridge
  const bridgeGeo = new THREE.BoxGeometry(.6, .08, .08);
  const frameMat  = new THREE.MeshStandardMaterial({ color:0xb8bfc8, metalness:.75, roughness:.25 });
  frameMat.name   = 'frameMat';
  const bridge    = new THREE.Mesh(bridgeGeo, frameMat);
  glassesGroup.add(bridge);

  // Arms
  function makeArm(x) {
    const geo = new THREE.BoxGeometry(1.6, .06, .06);
    const arm = new THREE.Mesh(geo, frameMat.clone());
    arm.position.set(x * 1.9, 0, -.6);
    arm.rotation.y = x > 0 ? -.3 : .3;
    arm.material.name = 'armMat';
    return arm;
  }
  const armL = makeArm(-1), armR = makeArm(1);
  glassesGroup.add(armL, armR);

  // Nose pads
  [-1, 1].forEach(s => {
    const g = new THREE.SphereGeometry(.05, 8, 8);
    const m = new THREE.MeshStandardMaterial({ color:0x888888, metalness:.5, roughness:.4 });
    const p = new THREE.Mesh(g, m);
    p.position.set(s*.3, -.15, .1);
    glassesGroup.add(p);
  });

  // Glow point inside each lens
  [-1.3, 1.3].forEach(x => {
    const light = new THREE.PointLight(0x00f0ff, .6, 2);
    light.position.set(x, 0, .2);
    light.name = 'lensGlow';
    glassesGroup.add(light);
  });

  renderer.setSize(W(), H());
  vp.classList.add('lit');

  /* Resize */
  window.addEventListener('resize', debU(() => {
    renderer.setSize(W(), H());
    camera.aspect = W()/H();
    camera.updateProjectionMatrix();
  }, 200));

  /* Drag to orbit */
  let theta = .4, phi = .3, isDragging = false, lastX = 0, lastY = 0;
  let tTheta = .4, tPhi = .3, dist = 6, tDist = 6;

  vp.addEventListener('mousedown', e => { isDragging=true; lastX=e.clientX; lastY=e.clientY; });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    tTheta += (e.clientX - lastX) * .008;
    tPhi   = Math.max(-.6, Math.min(.8, tPhi + (e.clientY - lastY)*.006));
    lastX=e.clientX; lastY=e.clientY;
  });
  window.addEventListener('mouseup', () => isDragging = false);
  vp.addEventListener('wheel', e => { e.preventDefault(); tDist = Math.max(3, Math.min(10, tDist+e.deltaY*.01)); }, {passive:false});

  /* Touch */
  vp.addEventListener('touchstart', e => { if(e.touches.length) { isDragging=true; lastX=e.touches[0].clientX; lastY=e.touches[0].clientY; } },{passive:true});
  vp.addEventListener('touchmove',  e => { if(!isDragging||!e.touches.length) return; tTheta+=(e.touches[0].clientX-lastX)*.01; lastX=e.touches[0].clientX; },{passive:true});
  vp.addEventListener('touchend',   () => isDragging=false);

  /* Animate */
  const clock = new THREE.Clock();
  (function render() {
    requestAnimationFrame(render);
    const dt = clock.getDelta();
    const et = clock.getElapsedTime();

    // Auto slow-rotate when not dragging
    if (!isDragging) tTheta += dt * .18;

    theta = lerpU(theta, tTheta, .08);
    phi   = lerpU(phi,   tPhi,   .08);
    dist  = lerpU(dist,  tDist,  .06);

    camera.position.x = dist * Math.sin(theta) * Math.cos(phi);
    camera.position.y = dist * Math.sin(phi);
    camera.position.z = dist * Math.cos(theta) * Math.cos(phi);
    camera.lookAt(0, 0, 0);

    // Lens glow pulse
    glassesGroup.traverse(o => {
      if (o.isLight && o.name === 'lensGlow') {
        o.intensity = .5 + Math.sin(et * 2.5) * .3;
      }
    });

    renderer.render(scene, camera);
  })();

  /* ── Config interactivity ─────────────────── */

  // Frame material swatches
  $$u('#frameMat .csw').forEach(btn => {
    btn.addEventListener('click', () => {
      $$u('#frameMat .csw').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const mat = btn.dataset.mat;
      const c = FRAME_COLORS[mat];
      if (!c) return;
      [frameMat, armL.material, armR.material].forEach(m => {
        m.color.setHex(c.frame);
        m.metalness = mat === 'ceramic' ? .1 : mat === 'carbon' ? .2 : .75;
        m.roughness  = mat === 'ceramic' ? .3 : mat === 'carbon' ? .5 : .25;
      });
      [lensL.rimMat, lensR.rimMat].forEach(m => m.color.setHex(c.arm));
      soundUI('click');
    });
  });

  // Lens tint swatches
  $$u('#lensTint .csw').forEach(btn => {
    btn.addEventListener('click', () => {
      $$u('#lensTint .csw').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const tint = btn.dataset.tint;
      const tc = LENS_COLORS[tint];
      if (!tc) return;
      [lensL.lensMat, lensR.lensMat].forEach(m => {
        m.color.setHex(tc.color);
        m.opacity = tc.opacity;
      });
      soundUI('click');
    });
  });

  // HUD accent swatches (sync with main palette)
  $$u('#hudAccent .csw').forEach(btn => {
    btn.addEventListener('click', () => {
      $$u('#hudAccent .csw').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const pal = btn.dataset.hud;
      // Trigger main palette switcher
      document.querySelector(`.cp-pal[data-pal="${pal}"]`)?.click();
      // Update lens glow colour
      const PCOLORS = {cyan:0x00f0ff,violet:0xc47bff,ember:0xff5f2e,gold:0xffc107};
      const hex = PCOLORS[pal] || 0x00f0ff;
      glassesGroup.traverse(o => {
        if (o.isLight && o.name === 'lensGlow') o.color.setHex(hex);
      });
      rimL.color.setHex(hex);
      soundUI('click');
    });
  });

  // Edition selection
  const EDITION_PRICES = { standard:'$1,299', pro:'$1,799', obsidian:'$2,499' };
  $$u('.cfg-ed').forEach(ed => {
    ed.addEventListener('click', () => {
      $$u('.cfg-ed').forEach(e=>e.classList.remove('active'));
      ed.classList.add('active');
      const price = EDITION_PRICES[ed.dataset.ed];
      const el = $u('cfgPrice');
      if (el && price) {
        el.style.transform = 'scale(1.2)';
        el.textContent = price;
        setTimeout(()=>el.style.transform='', 300);
      }
      soundUI('select');
    });
  });

  // Engraving preview
  const engInput = $u('cfgEngrave');
  const engPrev  = $u('cfgEngravePreview');
  if (engInput && engPrev) {
    engInput.addEventListener('input', () => {
      const val = engInput.value.trim();
      engPrev.textContent = val ? `Preview: "${val}"` : 'Preview: —';
      engPrev.style.color = val ? 'var(--accent)' : '';
    });
  }

  // Buy button
  $u('cfgBuy')?.addEventListener('click', () => {
    const ed = document.querySelector('.cfg-ed.active')?.dataset.ed || 'standard';
    const price = EDITION_PRICES[ed];
    if (window.CRSPY?.toast) CRSPY.toast(`✓ ${ed.charAt(0).toUpperCase()+ed.slice(1)} edition reserved — ${price}`, 's', 5000);
    soundUI('success');
  });
})();

/* ═══════════════════════════════════════════════
   5. CRSPY OS SIMULATOR
═══════════════════════════════════════════════ */
(function initOSSimulator() {
  const osVp      = $u('osVp');
  const osLaunch  = $u('osLaunch');
  const osIface   = $u('osInterface');
  const osBgCvs   = $u('osBgCanvas');
  if (!osVp) return;

  let osRunning = false;
  let osBgCtx, osT = 0;
  let notifTimer, hrTimer, timeTimer;

  // OS background particle field
  function initOsBg() {
    if (!osBgCvs) return;
    osBgCtx = osBgCvs.getContext('2d');
    const stars = Array.from({length:80},()=>({
      x:Math.random()*100, y:Math.random()*100,
      r:randU(.3,1.2), a:Math.random(), phase:Math.random()*Math.PI*2,
    }));
    (function draw() {
      if (!osRunning) return;
      requestAnimationFrame(draw);
      const W=osBgCvs.offsetWidth||800, H=osBgCvs.offsetHeight||600;
      osBgCvs.width=W; osBgCvs.height=H;
      osBgCtx.clearRect(0,0,W,H);
      osT+=.006;
      stars.forEach(s=>{
        const x=s.x/100*W, y=s.y/100*H;
        const alpha=s.a*(.2+.8*(.5+.5*Math.sin(osT*40*s.phase*.01+s.phase)));
        osBgCtx.beginPath(); osBgCtx.arc(x,y,s.r,0,Math.PI*2);
        osBgCtx.fillStyle=`rgba(0,240,255,${alpha})`; osBgCtx.fill();
      });
      // Grid lines
      osBgCtx.strokeStyle='rgba(0,240,255,0.025)'; osBgCtx.lineWidth=1;
      for(let x=0;x<W;x+=50){osBgCtx.beginPath();osBgCtx.moveTo(x,0);osBgCtx.lineTo(x,H);osBgCtx.stroke();}
      for(let y=0;y<H;y+=50){osBgCtx.beginPath();osBgCtx.moveTo(0,y);osBgCtx.lineTo(W,y);osBgCtx.stroke();}
    })();
  }

  // Launch OS
  function launchOS() {
    if (osRunning) return;
    osRunning = true;
    osVp.classList.add('active');
    if (osLaunch)  osLaunch.classList.add('gone');
    if (osIface)  { osIface.style.display = ''; }
    initOsBg();
    startOSClock();
    startNotifications();
    soundUI('boot');
  }

  osVp.addEventListener('click', e => {
    if (!osRunning) launchOS();
  });

  // OS clock
  function startOSClock() {
    const el = $u('osTime');
    const osHrEl = $u('osHr');
    timeTimer = setInterval(()=>{
      if (!osRunning) { clearInterval(timeTimer); return; }
      if (el) el.textContent = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
      if (osHrEl) osHrEl.textContent = Math.round(68+Math.sin(Date.now()*.001)*6);
    },1000);
    if (el) el.textContent = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  }

  // Notification stream
  const NOTIFS = [
    { ico:'📍', title:'Navigation', body:'Turn left in 200m onto Oak Street' },
    { ico:'❤️', title:'Health',     body:'Heart rate elevated — 94 bpm. Consider slowing down.' },
    { ico:'💬', title:'Alex Chen',  body:'Are we still on for tonight?' },
    { ico:'🌡', title:'Weather',    body:'Rain expected in 45 minutes. Carry an umbrella.' },
    { ico:'⚡', title:'Battery',    body:'Battery at 20%. Find a charger soon.' },
    { ico:'🧠', title:'AI Assistant',body:'Your 3pm meeting has 3 unread docs attached.' },
    { ico:'📷', title:'Capture',    body:'Spatial photo saved to your gallery.' },
    { ico:'🎵', title:'Sound',      body:'Now playing: Tycho — Awake' },
  ];
  let notifIdx = 0;

  function pushNotif() {
    if (!osRunning) { clearTimeout(notifTimer); return; }
    const container = $u('osNotifs'); if (!container) return;
    const n = NOTIFS[notifIdx++ % NOTIFS.length];
    const el = document.createElement('div');
    el.className = 'os-notif';
    el.innerHTML = `<span class="os-notif-ico">${n.ico}</span><div class="os-notif-body"><strong>${n.title}</strong>${n.body}</div>`;
    container.appendChild(el);
    requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('show')));
    setTimeout(()=>{
      el.classList.remove('show'); el.classList.add('hide');
      setTimeout(()=>el.remove(), 500);
    }, 4500);
    soundUI('notif');
    notifTimer = setTimeout(pushNotif, randU(4000,8000));
  }
  function startNotifications() {
    notifTimer = setTimeout(pushNotif, 2000);
  }

  // App panels
  const APP_CONTENT = {
    nav:      '<div style="color:var(--txt-2);font-size:.85rem;line-height:1.8"><strong style="color:var(--accent)">Current Route</strong><br/>Oak St → Main Ave → Destination<br/><br/><strong style="color:var(--accent)">ETA</strong><br/>12 minutes — 1.4 km</div>',
    health:   '<div style="color:var(--txt-2);font-size:.85rem;line-height:1.8"><strong style="color:var(--accent)">Heart Rate:</strong> 72 bpm — Normal<br/><strong style="color:var(--accent)">SpO₂:</strong> 98% — Optimal<br/><strong style="color:var(--accent)">Steps:</strong> 7,241 of 10,000<br/><strong style="color:var(--accent)">Stress:</strong> Low</div>',
    msg:      '<div style="color:var(--txt-2);font-size:.85rem;line-height:1.8"><strong style="color:var(--accent)">Alex Chen:</strong> Are we still on for tonight?<br/><br/><strong style="color:var(--accent)">Jordan Lee:</strong> The design files are ready.<br/><br/><strong style="color:var(--accent)">Team:</strong> Sprint planning moved to 3pm.</div>',
    ai:       '<div style="color:var(--txt-2);font-size:.85rem;line-height:1.8"><em style="color:var(--txt-3)">On-device · Private · Zero cloud</em><br/><br/>Your next meeting is at 3pm with 3 unread docs. The weather suggests taking a taxi. Your heart rate has been elevated for 20 minutes.</div>',
    cam:      '<div style="color:var(--txt-2);font-size:.85rem;line-height:1.8"><strong style="color:var(--accent)">Last Capture:</strong> 8K RAW · 2 min ago<br/><strong style="color:var(--accent)">Storage:</strong> 47 GB free<br/><strong style="color:var(--accent)">Mode:</strong> Spatial · Auto-HDR on<br/><br/>Blink twice to capture.</div>',
    music:    '<div style="color:var(--txt-2);font-size:.85rem;line-height:1.8"><strong style="color:var(--accent)">Now Playing</strong><br/>Tycho — Awake<br/><br/>Spatial audio · Dolby Atmos<br/>Next: Boards of Canada — Roygbiv</div>',
    weather:  '<div style="color:var(--txt-2);font-size:.85rem;line-height:1.8"><strong style="color:var(--accent)">Now:</strong> 18°C · Clear<br/><strong style="color:var(--accent)">Later:</strong> Rain from 4pm<br/><strong style="color:var(--accent)">Tomorrow:</strong> 21°C · Partly cloudy<br/><br/>UV Index: Low</div>',
    settings: '<div style="color:var(--txt-2);font-size:.85rem;line-height:1.8"><strong style="color:var(--accent)">CRSPY OS 3.0.1</strong><br/>HUD Brightness: 80%<br/>Gaze sensitivity: High<br/>Gesture control: Enabled<br/>Privacy mode: On</div>',
  };

  const APP_TITLES = {
    nav:'Navigation',health:'Health',msg:'Messages',ai:'AI Assistant',
    cam:'Capture',music:'Sound',weather:'Weather',settings:'Settings',
  };

  $$u('.os-app').forEach(app => {
    app.addEventListener('click', e => {
      e.stopPropagation();
      if (!osRunning) return;
      const id    = app.dataset.app;
      const panel = $u('osPanel');
      const title = $u('osPanelTitle');
      const body  = $u('osPanelBody');
      if (!panel || !title || !body) return;
      title.textContent = APP_TITLES[id] || id;
      body.innerHTML    = APP_CONTENT[id] || '<p style="color:var(--txt-2)">App content loading…</p>';
      panel.style.display = '';
      soundUI('open');
    });
  });

  $u('osPanelClose')?.addEventListener('click', e => {
    e.stopPropagation();
    const p = $u('osPanel'); if (p) p.style.display = 'none';
    soundUI('close');
  });

  $u('osDockExit')?.addEventListener('click', e => {
    e.stopPropagation();
    osRunning = false;
    clearTimeout(notifTimer); clearInterval(timeTimer);
    if (osLaunch) osLaunch.classList.remove('gone');
    if (osIface)  osIface.style.display = 'none';
    osVp.classList.remove('active');
    const container = $u('osNotifs'); if (container) container.innerHTML = '';
    const panel = $u('osPanel'); if (panel) panel.style.display = 'none';
  });

  $u('osDockHome')?.addEventListener('click', e => {
    e.stopPropagation();
    const p = $u('osPanel'); if (p) p.style.display = 'none';
  });

  // Move reticle with mouse inside OS
  osVp.addEventListener('mousemove', e => {
    if (!osRunning) return;
    const r   = $u('osReticle'); if (!r) return;
    const rect = osVp.getBoundingClientRect();
    const x    = e.clientX - rect.left;
    const y    = e.clientY - rect.top;
    r.style.left = (x - 30) + 'px';
    r.style.top  = (y - 30) + 'px';
  });
})();

/* ═══════════════════════════════════════════════
   6. TESTIMONIALS CAROUSEL
═══════════════════════════════════════════════ */
(function initTestiCarousel() {
  const inner = $u('testiInner');
  const prev  = $u('testiPrev');
  const next  = $u('testiNext');
  const dots  = $u('testiDots');
  if (!inner) return;

  const cards  = Array.from(inner.querySelectorAll('.tc'));
  let current  = 0;
  let autoTimer;

  // Build dots
  cards.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'tdot' + (i===0?' active':'');
    d.setAttribute('role','button');
    d.setAttribute('aria-label',`Review ${i+1}`);
    d.setAttribute('tabindex','0');
    d.addEventListener('click', () => goTo(i));
    d.addEventListener('keydown', e => { if(e.key==='Enter') goTo(i); });
    if (dots) dots.appendChild(d);
  });

  function goTo(i, dir) {
    current = ((i % cards.length) + cards.length) % cards.length;
    const cw = inner.parentElement.clientWidth || 420;
    inner.style.transform = `translateX(-${current * (cw + 24)}px)`;
    $$u('.tdot').forEach((d,j) => d.classList.toggle('active', j===current));
    soundUI('swipe');
    clearTimeout(autoTimer);
    autoTimer = setTimeout(autoAdvance, 5000);
  }

  function autoAdvance() { goTo(current + 1); }

  prev?.addEventListener('click', () => goTo(current - 1));
  next?.addEventListener('click', () => goTo(current + 1));

  // Touch swipe
  let tx = 0;
  inner.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, {passive:true});
  inner.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) goTo(dx < 0 ? current+1 : current-1);
  }, {passive:true});

  autoTimer = setTimeout(autoAdvance, 5000);
  window.addEventListener('resize', debU(() => goTo(current), 300));
})();

/* ═══════════════════════════════════════════════
   7. INVESTOR DATA ROOM
═══════════════════════════════════════════════ */
(function initDataRoom() {
  const dr = $u('dataroom');
  if (!dr) return;

  function openDR() {
    dr.classList.add('open');
    dr.removeAttribute('aria-hidden');
    drawDRChart();
    // Animate DR metrics
    dr.querySelectorAll('.drm-val[data-target]').forEach(el => {
      const end = parseFloat(el.dataset.target);
      const dur = 1200, t0 = performance.now();
      const tick = now => {
        const p = Math.min((now-t0)/dur,1);
        el.textContent = Math.round(end*(1-Math.pow(1-p,3)));
        if(p<1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    soundUI('open');
  }
  function closeDR() {
    dr.classList.remove('open');
    dr.setAttribute('aria-hidden','true');
  }

  document.addEventListener('keydown', e => {
    if (['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (e.key==='i'||e.key==='I') { dr.classList.contains('open') ? closeDR() : openDR(); }
    if (e.key==='Escape' && dr.classList.contains('open')) closeDR();
  });
  $u('drClose')?.addEventListener('click', closeDR);
  $u('drBackdrop')?.addEventListener('click', closeDR);

  // Revenue projection chart
  function drawDRChart() {
    const cvs = $u('drChart'); if(!cvs) return;
    const ctx = cvs.getContext('2d');
    const W   = cvs.offsetWidth||600;
    cvs.width = W; cvs.height = 180;
    const H   = 180;
    const data = [0, 2.1, 8.4, 22, 48, 95];  // ARR $M years 0-5
    const maxV = Math.max(...data) * 1.15;
    const padL = 40, padR = 20, padT = 15, padB = 30;
    const cW = W - padL - padR;
    const cH = H - padT - padB;
    const toX = i => padL + (i/(data.length-1))*cW;
    const toY = v => padT + cH - (v/maxV)*cH;

    ctx.clearRect(0,0,W,H);

    // Grid
    [0,.25,.5,.75,1].forEach(t => {
      const y = padT + cH*(1-t);
      ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(W-padR,y);
      ctx.strokeStyle='rgba(255,255,255,.05)'; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle='rgba(107,138,171,.5)';
      ctx.font='10px JetBrains Mono,monospace';
      ctx.fillText(`$${Math.round(maxV*t)}M`, 2, y+4);
    });

    // Year labels
    data.forEach((_,i) => {
      ctx.fillStyle='rgba(107,138,171,.5)';
      ctx.font='10px JetBrains Mono,monospace';
      ctx.textAlign='center';
      ctx.fillText('Y'+i, toX(i), H-8);
    });

    // Gradient fill
    const grad = ctx.createLinearGradient(0,padT,0,padT+cH);
    grad.addColorStop(0, 'rgba(0,240,255,.25)');
    grad.addColorStop(1, 'rgba(0,240,255,.01)');
    ctx.beginPath();
    data.forEach((v,i)=>{ i===0?ctx.moveTo(toX(i),toY(v)):ctx.lineTo(toX(i),toY(v)); });
    ctx.lineTo(toX(data.length-1), padT+cH);
    ctx.lineTo(toX(0), padT+cH);
    ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.beginPath();
    data.forEach((v,i)=>{ i===0?ctx.moveTo(toX(i),toY(v)):ctx.lineTo(toX(i),toY(v)); });
    ctx.strokeStyle='#00f0ff'; ctx.lineWidth=2;
    ctx.shadowBlur=8; ctx.shadowColor='#00f0ff';
    ctx.stroke(); ctx.shadowBlur=0;

    // Dots
    data.forEach((v,i)=>{
      ctx.beginPath(); ctx.arc(toX(i),toY(v),4,0,Math.PI*2);
      ctx.fillStyle='#00f0ff'; ctx.fill();
    });
  }

  // Add key hint to page
  const hint = document.createElement('div');
  hint.className = 'investor-hint';
  hint.innerHTML = `<kbd>I</kbd> Investor view`;
  document.body.appendChild(hint);
})();

/* ═══════════════════════════════════════════════
   8. SOUND DESIGN (Web Audio API)
═══════════════════════════════════════════════ */
let audioCtx = null;
let soundOn  = false;

function getAudioCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext||window.webkitAudioContext)(); } catch(_){}
  }
  return audioCtx;
}

function soundUI(type) {
  if (!soundOn) return;
  const ctx = getAudioCtx(); if (!ctx) return;
  const now = ctx.currentTime;

  const play = (freq, dur, type='sine', gain=.06, detune=0) => {
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 4000;
      o.connect(f); f.connect(g); g.connect(ctx.destination);
      o.type = type; o.frequency.value = freq;
      o.detune.value = detune;
      g.gain.setValueAtTime(gain, now);
      g.gain.exponentialRampToValueAtTime(.0001, now+dur);
      o.start(now); o.stop(now+dur);
    } catch(_){}
  };

  switch(type) {
    case 'click':   play(880, .05, 'sine', .04); break;
    case 'select':  play(660, .08, 'sine', .05); play(880, .06, 'sine', .03, 1200); break;
    case 'open':    play(440, .12, 'sine', .05); play(660, .1, 'sine', .03, 700); break;
    case 'close':   play(330, .1,  'sine', .04); break;
    case 'success': play(523, .1,'sine',.05); play(659,.1,'sine',.04,0); play(784,.15,'sine',.05,0); break;
    case 'notif':   play(1047,.06,'sine',.035); play(1318,.05,'sine',.02,0); break;
    case 'swipe':   play(300,.08,'sine',.03); break;
    case 'boot':
      [261.6,329.6,392,523.3].forEach((f,i)=>{
        setTimeout(()=>play(f,.15,'sine',.05),i*80);
      });
      break;
  }
}

// Sound toggle button
(function initSoundToggle() {
  const btn = document.createElement('button');
  btn.className = 'sound-toggle';
  btn.setAttribute('aria-label','Toggle UI sounds');
  btn.title = 'Toggle sounds (click to enable)';
  btn.innerHTML = '🔇';
  btn.addEventListener('click', () => {
    soundOn = !soundOn;
    btn.innerHTML = soundOn ? '🔊' : '🔇';
    btn.classList.toggle('on', soundOn);
    if (soundOn) {
      // Unlock AudioContext on first user gesture
      const ctx = getAudioCtx();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      soundUI('select');
    }
  });
  document.body.appendChild(btn);

  // Wire sounds to interactive elements
  setTimeout(() => {
    $$u('.os-app, .ac, .vc').forEach(el => {
      el.addEventListener('mouseenter', ()=>soundUI('click'));
    });
    $$u('.btn-primary, .btn-ghost').forEach(el => {
      el.addEventListener('click', ()=>soundUI('select'));
    });
  }, 2000);
})();

/* ═══════════════════════════════════════════════
   9. SCROLL PROGRESS BAR
═══════════════════════════════════════════════ */
(function initScrollProgress() {
  const bar = document.createElement('div');
  bar.style.cssText = `
    position:fixed;top:0;left:0;height:2px;z-index:9999;
    background:var(--accent);box-shadow:0 0 8px var(--accent-glow);
    width:0;transition:width .1s linear;pointer-events:none;
  `;
  document.body.appendChild(bar);
  window.addEventListener('scroll', () => {
    const s = document.documentElement;
    const p = (s.scrollTop || document.body.scrollTop) / (s.scrollHeight - s.clientHeight);
    bar.style.width = (p*100) + '%';
  }, {passive:true});
})();

/* ═══════════════════════════════════════════════
   10. SECTION ENTRANCE SOUND
═══════════════════════════════════════════════ */
(function initSectionSounds() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        soundUI('notif');
        io.unobserve(e.target);
      }
    });
  }, { threshold: .3 });
  $$u('.config-section, .os-section, .testi-section').forEach(s => io.observe(s));
})();
