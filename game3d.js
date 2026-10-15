// "Fly it yourself": a free-flight 3D mode that reuses the story page's scene, planets and renderer.
// The story owns the camera; this module returns a camera pose plus a blend factor so entering and
// leaving the game is one continuous camera move.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const TAU = Math.PI * 2;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const IDLE = 3, CRUISE = 13, BOOST = 34;
const SHIP_SCALE = 0.2;

const EXHAUST_VS = /* glsl */ `varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const EXHAUST_FS = /* glsl */ `
uniform float uPower; uniform float uTime; varying float vY;
void main(){
  float t = clamp(0.5 - vY * 0.5, 0.0, 1.0);          // 1 at the nozzle, 0 at the tip
  float flick = 0.85 + 0.15 * sin(uTime * 60.0 + vY * 9.0);
  float a = pow(t, 1.6) * uPower * flick;
  vec3 col = mix(vec3(0.25, 0.7, 1.6), vec3(1.6, 1.8, 2.2), pow(t, 4.0));
  gl_FragColor = vec4(col * a, a);
}`;

export function createGame(o) {
  const { scene, camera, renderer, bodies, centers, sunC, sunR, LIGHT, CV, STAGES, colorOf, logosOf, typeLabel, reduced, hooks } = o;
  const N = STAGES.length;
  const isTouch = matchMedia('(pointer: coarse)').matches;

  let built = false, active = false, blend = 0, blendTarget = 0;
  let mode = 'fly';                  // fly | landed
  let yaw = 0, pitch = 0, speed = 0, bank = 0, autopilot = false;
  let landed = -1, quiet = -1;       // `quiet`: zone just taken off from, no prompt until the ship leaves it
  let promptFor = -2, hintTimer = 0, time = 0;
  let landView = null;
  const ship = new THREE.Group(), model = new THREE.Group();
  ship.add(model);
  const parts = {};
  const crystals = [], bursts = [];
  const keys = {};
  const pointer = { down: false, x: 0, y: 0, sx: 0, sy: 0, touch: false };
  const touchBoost = { on: false };
  const visited = new Set(), got = new Set();
  const camPos = V(), camLook = V(), camOffset = V();
  let fov = 52;
  let streaks, streakData;
  const ui = {};

  // ------------------------------------------------------------------ build
  function buildShip() {
    const env = (m) => { m.envMapIntensity = 0.75; return m; };
    const white = env(new THREE.MeshPhysicalMaterial({ color: 0xf1f3f7, metalness: 0.5, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }));
    const graphite = env(new THREE.MeshPhysicalMaterial({ color: 0x232833, metalness: 0.75, roughness: 0.32, clearcoat: 0.6, side: THREE.DoubleSide }));
    const glass = env(new THREE.MeshPhysicalMaterial({ color: 0x07121f, metalness: 0.9, roughness: 0.04, clearcoat: 1, emissive: 0x0c4a6e, emissiveIntensity: 0.45 }));
    const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.75, 1.1) });

    // Fuselage: lathe profile, nose toward -z (forward)
    const prof = [[0, -2.5], [0.22, -2.3], [0.46, -1.7], [0.6, -0.7], [0.6, 0.6], [0.52, 1.4], [0.44, 1.85], [0, 1.9]];
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 64), white);
    body.rotation.x = Math.PI / 2;
    model.add(body);

    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.42, 40, 20), glass);
    canopy.scale.set(0.82, 0.62, 1.7);
    canopy.position.set(0, 0.36, -0.75);
    model.add(canopy);

    // Swept wings (extruded), mirrored
    const ws = new THREE.Shape();
    ws.moveTo(0, -0.2); ws.lineTo(2.25, 0.95); ws.lineTo(2.4, 1.4); ws.lineTo(0, 1.3); ws.closePath();
    const wingGeo = new THREE.ExtrudeGeometry(ws, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.05, bevelSegments: 3 });
    [-1, 1].forEach((side) => {
      const w = new THREE.Mesh(wingGeo, graphite);
      w.rotation.x = Math.PI / 2;
      w.scale.x = side;
      w.position.set(side * 0.35, 0.02, -0.2);
      model.add(w);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: side < 0 ? 0xff3b30 : 0x34c759 }));
      tip.position.set(side * 2.72, 0.05, 1.1);
      model.add(tip);
      (parts.tips ||= []).push(tip);
      // Engines
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.2, 32), white);
      eng.rotation.x = Math.PI / 2;
      eng.position.set(side * 0.62, -0.05, 1.3);
      model.add(eng);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 12, 40), glow);
      ring.position.set(side * 0.62, -0.05, 1.92);
      model.add(ring);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.12, 32), glow);
      disc.position.set(side * 0.62, -0.05, 1.93);
      model.add(disc);
      const ex = new THREE.Mesh(new THREE.ConeGeometry(0.19, 2, 32, 1, true), new THREE.ShaderMaterial({
        uniforms: { uPower: { value: 0.3 }, uTime: { value: 0 } }, vertexShader: EXHAUST_VS, fragmentShader: EXHAUST_FS,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      }));
      ex.rotation.x = Math.PI / 2;      // cone tip (+y) turned to point backward (+z)
      ex.position.set(side * 0.62, -0.05, 1.93 + 1);
      model.add(ex);
      (parts.exhaust ||= []).push(ex);
    });

    // Tail fin
    const fs = new THREE.Shape();
    fs.moveTo(0, 0); fs.lineTo(0.9, 0); fs.lineTo(1.25, 0.85); fs.lineTo(0.85, 0.85); fs.closePath();
    const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(fs, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 2 }), graphite);
    fin.rotation.y = -Math.PI / 2;
    fin.position.set(0.03, 0.35, 0.65);
    model.add(fin);
    // Accent stripe
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 2.4), glow);
    stripe.position.set(0, 0.6, 0.15);
    model.add(stripe);

    ship.scale.setScalar(SHIP_SCALE);
    ship.visible = false;
    scene.add(ship);
  }

  function buildCrystals() {
    const geo = new THREE.OctahedronGeometry(0.34, 0);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffd27a, metalness: 0.35, roughness: 0.12, clearcoat: 1, emissive: 0xff9f0a, emissiveIntensity: 1.1, flatShading: true,
    });
    STAGES.forEach((st, i) => {
      const skills = st.skills || [];
      const b = bodies[i];
      const tilt = (i % 2 ? 1 : -1) * 0.28;
      skills.forEach((name, k) => {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        scene.add(mesh);
        const label = document.createElement('div');
        label.className = 'fly-label crystal';
        label.textContent = name;
        ui.labels.appendChild(label);
        crystals.push({
          mesh, name, i, label, tilt, got: false,
          ring: b.R * 2.2 + (k % 2) * b.R * 0.55,
          a: (k / skills.length) * TAU, w: (i % 2 ? 1 : -1) * 0.13, bob: Math.random() * TAU,
        });
      });
    });
  }

  function buildStreaks() {
    const S = 200;
    const pos = new Float32Array(S * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    streaks = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      color: 0xc8ecff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    streaks.frustumCulled = false;
    streakData = Array.from({ length: S }, () => spawnStreak({}, true));
    if (!camera.parent) scene.add(camera);
    camera.add(streaks);
  }
  function spawnStreak(s, anywhere) {
    const a = Math.random() * TAU, r = 1.5 + Math.random() * 8;
    s.x = Math.cos(a) * r; s.y = Math.sin(a) * r;
    s.z = anywhere ? -Math.random() * 70 : -60 - Math.random() * 15;
    return s;
  }

  function buildUI() {
    const root = document.createElement('div');
    root.id = 'fly';
    root.innerHTML = `
      <div class="fly-top">
        <div class="fly-stats"><span><b id="fly-planets">0/${N}</b> planets</span><span><b id="fly-skills">0/0</b> skills</span></div>
        <div class="fly-actions">
          <button class="fly-btn" id="fly-auto" type="button"><span class="dot"></span>Autopilot</button>
          <button class="fly-btn icon" id="fly-exit" type="button" aria-label="Back to the story">✕</button>
        </div>
      </div>
      <div class="fly-labels" id="fly-labels"></div>
      <div class="fly-guide" id="fly-guide"><span class="arrow">➜</span><span class="txt"></span></div>
      <button class="fly-prompt" id="fly-prompt" type="button"></button>
      <div class="fly-toasts" id="fly-toasts"></div>
      <aside class="fly-card" id="fly-card" aria-live="polite"><div class="fly-card-body"></div><div class="fly-card-actions"></div></aside>
      <div class="fly-hint" id="fly-hint">${isTouch
        ? 'Drag to steer and fly · <b>Boost</b> for warp speed · tap the prompt to land'
        : '<b>Hold the mouse</b> to fly toward the cursor · <b>Arrows</b> steer · <b>W</b> thrust · <b>Shift</b> boost · <b>E</b> land · <b>P</b> autopilot'}</div>
      ${isTouch ? '<button class="fly-boost" id="fly-boost" type="button">Boost</button>' : ''}`;
    document.body.appendChild(root);
    Object.assign(ui, {
      root, labels: root.querySelector('#fly-labels'), guide: root.querySelector('#fly-guide'), prompt: root.querySelector('#fly-prompt'),
      toasts: root.querySelector('#fly-toasts'), card: root.querySelector('#fly-card'), hint: root.querySelector('#fly-hint'),
      planets: root.querySelector('#fly-planets'), skills: root.querySelector('#fly-skills'), auto: root.querySelector('#fly-auto'),
    });
    ui.planetLabels = STAGES.map((st) => {
      const el = document.createElement('div');
      el.className = 'fly-label planet';
      const logos = logosOf(st);
      el.innerHTML = logos.length
        ? `<span class="logo-chip">${logos.map((u) => `<img src="${esc(u)}" alt="">`).join('')}</span><span class="when">${esc(st.period || '')}</span>`
        : `<span class="name">${esc(st.org)}</span><span class="when">${esc(st.period || '')}</span>`;
      ui.labels.appendChild(el);
      return el;
    });
    const sunLabel = document.createElement('div');
    sunLabel.className = 'fly-label planet sun';
    sunLabel.innerHTML = `<span class="name">Let’s talk</span><span class="when">Contact</span>`;
    ui.labels.appendChild(sunLabel);
    ui.planetLabels.push(sunLabel);

    root.querySelector('#fly-exit').onclick = () => exit();
    ui.auto.onclick = () => { autopilot = !autopilot; syncAuto(); ui.auto.blur(); };
    ui.prompt.onclick = () => { if (promptFor > -2) land(promptFor); };
    const boost = root.querySelector('#fly-boost');
    if (boost) {
      boost.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); touchBoost.on = true; boost.classList.add('on'); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => boost.addEventListener(ev, () => { touchBoost.on = false; boost.classList.remove('on'); }));
    }
  }

  function bindInput() {
    addEventListener('keydown', (e) => {
      if (!active) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      keys[e.code] = true;
      if (e.code === 'Escape') { mode === 'landed' ? takeOff() : exit(); return; }
      if (mode === 'landed' && (e.code === 'KeyE' || e.code === 'Enter')) { takeOff(); return; }
      if ((e.code === 'KeyE' || e.code === 'Enter') && promptFor > -2) land(promptFor);
      if (e.code === 'KeyP') { autopilot = !autopilot; syncAuto(); }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'ShiftLeft', 'ShiftRight'].includes(e.code)) { autopilot = false; syncAuto(); }
    });
    addEventListener('keyup', (e) => { keys[e.code] = false; });
    const isUI = (t) => t.closest && t.closest('button, a, .fly-card, .fly-top');
    addEventListener('pointerdown', (e) => {
      if (!active || mode !== 'fly' || isUI(e.target)) return;
      pointer.down = true; pointer.touch = e.pointerType === 'touch';
      pointer.sx = e.clientX; pointer.sy = e.clientY;
      setPointer(e);
      autopilot = false; syncAuto();
    });
    addEventListener('pointermove', (e) => { if (active) setPointer(e); });
    ['pointerup', 'pointercancel'].forEach((ev) => addEventListener(ev, () => { pointer.down = false; }));
  }
  function setPointer(e) {
    if (pointer.touch) {           // touch: virtual joystick around where the finger landed
      pointer.x = clamp((e.clientX - pointer.sx) / 70, -1, 1);
      pointer.y = clamp((e.clientY - pointer.sy) / 70, -1, 1);
    } else {                       // mouse: steer toward the cursor
      pointer.x = clamp((e.clientX / innerWidth - 0.5) * 2.2, -1, 1);
      pointer.y = clamp((e.clientY / innerHeight - 0.5) * 2.2, -1, 1);
    }
  }

  function build() {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
    buildUI();
    buildShip();
    buildCrystals();
    if (!reduced) buildStreaks();
    bindInput();
    ui.skills.textContent = `0/${crystals.length}`;
    built = true;
  }

  // ------------------------------------------------------------------ helpers
  const zoneOf = (i) => (i === N ? sunR * 2.8 : bodies[i].R * 3.4);
  const posOf = (i) => (i === N ? sunC : centers[i]);
  const nextTarget = () => { for (let i = 0; i < N; i++) if (!visited.has(i)) return i; return N; };
  const syncAuto = () => ui.auto && ui.auto.classList.toggle('on', autopilot);
  const shipFwd = () => V(0, 0, -1).applyQuaternion(ship.quaternion);

  function toast(text) {
    const t = document.createElement('div');
    t.className = 'fly-toast';
    t.innerHTML = `<span class="gem"></span>${esc(text)}`;
    ui.toasts.appendChild(t);
    while (ui.toasts.children.length > 3) ui.toasts.firstChild.remove();
    setTimeout(() => t.classList.add('out'), 1500);
    setTimeout(() => t.remove(), 2100);
  }

  function burst(p) {
    const n = 34, arr = new Float32Array(n * 3), vel = [];
    for (let k = 0; k < n; k++) {
      arr.set([p.x, p.y, p.z], k * 3);
      vel.push(V().randomDirection().multiplyScalar(2 + Math.random() * 5));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffd27a, size: 0.28, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(pts);
    bursts.push({ pts, vel, life: 0 });
  }

  function refreshStats() {
    ui.planets.textContent = `${visited.size}/${N}`;
    ui.skills.textContent = `${got.size === 0 ? 0 : crystals.filter((c) => c.got).length}/${crystals.length}`;
  }

  // ------------------------------------------------------------------ landing + cards
  function land(i) {
    if (mode === 'landed') return;
    mode = 'landed'; landed = i; autopilot = false; syncAuto();
    pointer.down = false;
    if (i < N) visited.add(i);
    refreshStats();
    const c = posOf(i), R = i === N ? sunR : bodies[i].R;
    const toShip = ship.position.clone().sub(c).normalize();
    const off = LIGHT.clone().multiplyScalar(1.4).add(toShip).setY(0.25).normalize();   // mostly sunlit, a little toward where we came from
    const viewDir = off.clone().negate();
    const right = V().crossVectors(viewDir, V(0, 1, 0)).normalize();
    const portrait = innerWidth / innerHeight < 0.84 || innerWidth <= 760;
    const look = portrait ? c.clone().add(V(0, -R * 1.15, 0)) : c.clone().add(right.multiplyScalar(R * (i === N ? 1.2 : 1.45)));
    const dist = R * (i === N ? 6.5 : portrait ? 6 : 4.4);
    landView = { pos: look.clone().add(off.multiplyScalar(dist)).add(V(0, R * 0.35, 0)), look };
    showCard(i);
    ui.prompt.classList.remove('show');
    promptFor = -2;
  }

  function takeOff() {
    if (mode !== 'landed') return;
    hideCard();
    mode = 'fly'; quiet = landed; landed = -1; landView = null;
    const t = posOf(nextTarget());
    const d = t.clone().sub(ship.position).normalize();
    yaw = Math.atan2(-d.x, -d.z);
    pitch = clamp(Math.asin(clamp(d.y, -1, 1)), -0.6, 0.6);
    speed = CRUISE;
  }

  function showCard(i) {
    const body = ui.card.querySelector('.fly-card-body'), actions = ui.card.querySelector('.fly-card-actions');
    if (i === N) {
      const c = CV.contact || {};
      const links = [
        c.email && ['Email me', 'mailto:' + c.email, 'primary'], c.linkedin && ['LinkedIn', c.linkedin, ''], c.github && ['GitHub', c.github, ''],
      ].filter(Boolean).map(([l, h, k]) => `<a class="fly-btn ${k}" href="${esc(h)}" ${h.startsWith('mailto') ? '' : 'target="_blank" rel="noopener"'}>${esc(l)}</a>`).join('');
      ui.card.style.setProperty('--c', '#fbbf24');
      body.innerHTML = `
        <p class="fc-meta">Mission complete</p>
        <h3 class="fc-head">Let’s talk.</h3>
        <p class="fc-text">You visited <b>${visited.size}</b> of ${N} planets and collected <b>${crystals.filter((x) => x.got).length}</b> of ${crystals.length} skills.</p>
        <p class="fc-text">${esc(c.location || '')}${CV.rightToWork ? ' · ' + esc(CV.rightToWork) : ''}</p>
        <div class="fc-links">${links}<a class="fly-btn" href="cv.html">Printable CV</a></div>`;
      actions.innerHTML = '';
      addAction(actions, 'Fly again', () => { reset(); });
      addAction(actions, 'Back to the story', () => exit(), 'primary');
    } else {
      const st = STAGES[i];
      const logos = logosOf(st);
      ui.card.style.setProperty('--c', colorOf(st, i));
      body.innerHTML = `
        <p class="fc-meta"><span class="idx">${String(i + 1).padStart(2, '0')}</span>${esc(typeLabel(st))}${st.period ? ' · ' + esc(st.period) : ''}</p>
        ${logos.length ? `<span class="logo-chip">${logos.map((u) => `<img src="${esc(u)}" alt="${esc(st.org)} logo">`).join('')}</span>` : ''}
        <h3 class="fc-head">${esc(st.headline || st.org)}</h3>
        ${st.type === 'toolkit' ? '' : `<p class="fc-role">${esc(st.title)} <span>· ${esc(st.org)}${st.location ? ' · ' + esc(st.location) : ''}</span></p>`}
        ${st.points && st.points.length ? `<ul>${st.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
        ${st.type === 'toolkit' ? (CV.skillGroups || []).map((g) => `<p class="fc-text"><b>${esc(g.label)}:</b> ${g.items.map(esc).join(', ')}</p>`).join('') : ''}
        ${(st.skills || []).length ? `<div class="fc-chips">${st.skills.map((s) => {
          const has = crystals.some((c) => c.i === i && c.name === s && c.got);
          return `<span class="chip ${has ? 'got' : ''}">${has ? '✓ ' : ''}${esc(s)}</span>`;
        }).join('')}</div>` : ''}`;
      actions.innerHTML = '';
      const nt = nextTarget();
      addAction(actions, 'Take off', () => takeOff(), nt === N || nt === i ? 'primary' : '');
      if (nt !== i) addAction(actions, `Autopilot to ${nt === N ? 'the finale' : STAGES[nt].org} ›`, () => { takeOff(); autopilot = true; syncAuto(); }, 'primary');
    }
    ui.card.scrollTop = 0;
    ui.card.classList.add('show');
  }
  function addAction(box, label, fn, cls = '') {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'fly-btn ' + cls; b.textContent = label;
    b.onclick = fn;
    box.appendChild(b);
  }
  function hideCard() { ui.card.classList.remove('show'); }

  function reset() {
    hideCard();
    mode = 'fly'; landed = -1; landView = null; quiet = -1;
    const c = centers[0];
    ship.position.copy(c).add(V(-6, 4, 30));
    const d = c.clone().sub(ship.position).normalize();
    yaw = Math.atan2(-d.x, -d.z); pitch = Math.asin(d.y);
    speed = CRUISE;
  }

  // ------------------------------------------------------------------ enter / exit
  function enter() {
    if (!built) build();
    if (active) return;
    active = true; blendTarget = 1; mode = 'fly'; landView = null; autopilot = false; syncAuto();
    const dir = V();
    camera.getWorldDirection(dir);
    ship.position.copy(camera.position).addScaledVector(dir, 4.5);
    yaw = Math.atan2(-dir.x, -dir.z);
    pitch = clamp(Math.asin(clamp(dir.y, -1, 1)), -0.6, 0.6);
    ship.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
    speed = CRUISE * 0.6;
    camPos.copy(camera.position);
    camOffset.copy(camera.position).sub(ship.position);
    camLook.copy(ship.position);
    fov = camera.fov;
    ship.visible = true;
    crystals.forEach((c) => (c.mesh.visible = !c.got));
    ui.root.classList.add('on');
    document.body.classList.add('flying');
    ui.hint.classList.add('show');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => ui.hint.classList.remove('show'), 8000);
    hooks.onEnter && hooks.onEnter();
    if (location.hash !== '#fly') history.replaceState(null, '', '#fly');
  }

  function exit() {
    if (!active) return;
    active = false; blendTarget = 0; autopilot = false;
    hideCard();
    ui.prompt.classList.remove('show');
    ui.root.classList.remove('on');
    document.body.classList.remove('flying');
    Object.keys(keys).forEach((k) => (keys[k] = false));
    pointer.down = false;
    hooks.onExit && hooks.onExit();
    if (location.hash === '#fly') history.replaceState(null, '', location.pathname + location.search);
  }

  // ------------------------------------------------------------------ per frame
  function flight(dt) {
    let sx = 0, sy = 0, thrust = false;
    if (keys.ArrowLeft || keys.KeyA) sx -= 1;
    if (keys.ArrowRight || keys.KeyD) sx += 1;
    if (keys.ArrowUp) sy -= 1;
    if (keys.ArrowDown) sy += 1;
    if (pointer.down) {
      const shape = (v) => Math.sign(v) * Math.max(0, Math.abs(v) - 0.08) / 0.92;
      sx += shape(pointer.x); sy += shape(pointer.y);
      thrust = true;
    }
    if (keys.KeyW || keys.Space) thrust = true;
    const boost = keys.ShiftLeft || keys.ShiftRight || touchBoost.on;
    let yawRate, pitchRate, target;

    if (autopilot) {
      const ti = nextTarget(), tp = posOf(ti);
      const to = tp.clone().sub(ship.position);
      const dist = to.length();
      to.normalize();
      const dy = Math.atan2(-to.x, -to.z), dp = Math.asin(clamp(to.y, -1, 1));
      yawRate = clamp(angleDiff(dy, yaw) * 2.2, -1.5, 1.5);
      pitchRate = clamp((dp - pitch) * 2.2, -1.1, 1.1);
      const aligned = Math.abs(angleDiff(dy, yaw)) < 0.35;
      target = dist > 60 && aligned ? BOOST : dist > zoneOf(ti) * 1.5 ? CRUISE : 6;
      if (dist < zoneOf(ti) * 0.9) { land(ti); return; }
    } else {
      yawRate = -sx * 1.7;
      pitchRate = -sy * 1.25;
      target = keys.KeyS ? 0 : boost ? BOOST : thrust ? CRUISE : IDLE;
    }
    yaw += yawRate * dt;
    pitch = clamp(pitch + pitchRate * dt, -1.25, 1.25);
    ship.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
    speed += (target - speed) * damp(target > speed ? 1.5 : 2.6, dt);
    ship.position.addScaledVector(shipFwd(), speed * dt);
    bank += (yawRate * 0.42 - bank) * damp(4, dt);
    model.rotation.z = bank;
    model.rotation.x = pitchRate * 0.06;

    // Don't fly through planets or the sun
    for (let i = 0; i <= N; i++) {
      const c = posOf(i), minD = (i === N ? sunR : bodies[i].R) * 1.22;
      const d = ship.position.distanceTo(c);
      if (d < minD) { ship.position.sub(c).setLength(minD).add(c); speed *= 0.6; }
    }
    // Wandered off into deep space: autopilot brings the ship back
    const nearest = Math.min(...centers.map((c) => c.distanceTo(ship.position)), sunC.distanceTo(ship.position));
    if (nearest > 240 && !autopilot) { autopilot = true; syncAuto(); toast('Too far out. Autopilot engaged'); }

    // Landing prompt
    let near = -2;
    for (let i = 0; i <= N; i++) {
      const d = ship.position.distanceTo(posOf(i));
      if (i === quiet) { if (d > zoneOf(i) * 1.15) quiet = -1; continue; }
      if (d < zoneOf(i)) { near = i; break; }
    }
    if (near !== promptFor) {
      promptFor = near;
      if (near > -2) {
        const name = near === N ? 'Make contact' : `Land on ${STAGES[near].org}`;
        ui.prompt.innerHTML = `${esc(name)}<kbd>${isTouch ? 'Tap' : 'E'}</kbd>`;
        ui.prompt.classList.add('show');
      } else {
        ui.prompt.classList.remove('show');
      }
    }
  }

  function update(dt, t) {
    if (!built) return null;
    time = t;
    blend += (blendTarget - blend) * damp(blendTarget ? 1.9 : 2.4, dt);
    if (Math.abs(blend - blendTarget) < 0.002) blend = blendTarget;
    if (!active && blend === 0) {
      if (ship.visible) { ship.visible = false; crystals.forEach((c) => (c.mesh.visible = false)); }
      return null;
    }

    if (active && mode === 'fly') flight(dt);
    else {
      speed += (0 - speed) * damp(3, dt);
      ship.position.addScaledVector(shipFwd(), speed * dt);
      bank += (0 - bank) * damp(3, dt);
      model.rotation.z = bank;
    }

    // Engines + lights
    const power = clamp(0.12 + (speed / BOOST) * 1.25, 0, 1.4);
    parts.exhaust.forEach((ex) => {
      ex.material.uniforms.uPower.value = power;
      ex.material.uniforms.uTime.value = t;
      ex.scale.y = 0.35 + (speed / BOOST) * 1.8 + Math.sin(t * 40) * 0.03;
      ex.position.z = 1.93 + ex.scale.y;
    });
    const blink = Math.sin(t * 5) > 0.6 ? 1 : 0.25;
    parts.tips.forEach((tip) => (tip.material.opacity = blink, tip.material.transparent = true));

    // Crystals orbit; collect on contact
    for (const c of crystals) {
      if (c.got) continue;
      c.a += c.w * dt;
      const ctr = centers[c.i];
      c.mesh.position.set(
        ctr.x + Math.cos(c.a) * c.ring,
        ctr.y + Math.sin(c.a) * c.ring * Math.sin(c.tilt) + Math.sin(t * 1.5 + c.bob) * 0.25,
        ctr.z + Math.sin(c.a) * c.ring * Math.cos(c.tilt),
      );
      c.mesh.rotation.y += dt * 1.6;
      c.mesh.rotation.x = Math.sin(t + c.bob) * 0.3;
      if (active && mode === 'fly' && c.mesh.position.distanceTo(ship.position) < 1.35) {
        c.got = true; got.add(c.name);
        c.mesh.visible = false;
        burst(c.mesh.position);
        toast(c.name);
        refreshStats();
      }
    }
    for (let k = bursts.length - 1; k >= 0; k--) {
      const b = bursts[k];
      b.life += dt;
      const arr = b.pts.geometry.attributes.position.array;
      b.vel.forEach((v, j) => { arr[j * 3] += v.x * dt; arr[j * 3 + 1] += v.y * dt; arr[j * 3 + 2] += v.z * dt; v.multiplyScalar(0.95); });
      b.pts.geometry.attributes.position.needsUpdate = true;
      b.pts.material.opacity = Math.max(0, 1 - b.life / 0.9);
      if (b.life > 0.9) { scene.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); bursts.splice(k, 1); }
    }

    // Warp streaks
    if (streaks) {
      const f = clamp((speed - CRUISE) / (BOOST - CRUISE), 0, 1) * blend;
      streaks.material.opacity = f * 0.75;
      if (f > 0.01) {
        const arr = streaks.geometry.attributes.position.array, len = 0.5 + speed * 0.22 * f;
        streakData.forEach((s, k) => {
          s.z += speed * dt * 1.6;
          if (s.z > -1) spawnStreak(s);
          arr.set([s.x, s.y, s.z, s.x, s.y, s.z - len], k * 6);
        });
        streaks.geometry.attributes.position.needsUpdate = true;
      }
    }

    // Camera: chase cam while flying, cinematic orbit shot while landed
    // Chase cam smooths the *offset* behind the ship, so it never falls behind at warp speed
    let look;
    if (mode === 'landed' && landView) {
      camPos.lerp(landView.pos, damp(1.8, dt));
      camOffset.copy(camPos).sub(ship.position);
      look = landView.look;
      camLook.lerp(look, damp(1.8, dt));
    } else {
      const flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch * 0.6, yaw, 0, 'YXZ'));
      const want = V(0, 0.62, 2.7).applyQuaternion(flat);
      camOffset.lerp(want, damp(3.2, dt));
      camPos.copy(ship.position).add(camOffset);
      look = ship.position.clone().add(shipFwd().multiplyScalar(4)).add(V(0, 0.25, 0));
      camLook.lerp(look, damp(8, dt));
    }
    const wantFov = reduced ? 52 : 52 + clamp((speed - CRUISE) / (BOOST - CRUISE), 0, 1) * 20;
    fov += (wantFov - fov) * damp(3, dt);

    return { pos: camPos, look: camLook, fov, blend: easeInOut(blend) };
  }

  // DOM overlays that track 3D positions (run after the story has placed the camera)
  const tmp = V();
  function place(el, worldPos, maxDist) {
    const d = worldPos.distanceTo(camera.position);
    tmp.copy(worldPos).project(camera);
    const vis = tmp.z < 1 && d < maxDist && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05;
    el.classList.toggle('show', vis);
    if (vis) {
      el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * innerWidth}px, ${(-tmp.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`;
      el.style.opacity = clamp(1.4 - d / maxDist, 0, 1);
    }
  }
  function afterCamera() {
    if (!built || !active) return;
    const landedNow = mode === 'landed';
    ui.planetLabels.forEach((el, i) => {
      if (landedNow) { el.classList.remove('show'); return; }
      const R = i === N ? sunR : bodies[i].R;
      place(el, tmp.copy(posOf(i)).add(V(0, R * 1.45, 0)).clone(), i === nextTarget() ? 170 : 90);
    });
    crystals.forEach((c) => {
      if (c.got || landedNow) { c.label.classList.remove('show'); return; }
      place(c.label, c.mesh.position.clone().add(V(0, 0.6, 0)), 24);
    });
    // Guide to the next destination
    const ti = nextTarget();
    if (landedNow) { ui.guide.classList.remove('show'); return; }
    const wp = posOf(ti).clone();
    const d = wp.distanceTo(ship.position);
    tmp.copy(wp).project(camera);
    const behind = tmp.z > 1;
    let x = tmp.x, y = tmp.y;
    if (behind) { x = -x; y = -y; }
    const onScreen = !behind && Math.abs(x) < 0.85 && Math.abs(y) < 0.8;
    if (onScreen && d < 140) { ui.guide.classList.remove('show'); return; }
    const m = Math.max(Math.abs(x) / 0.86, Math.abs(y) / 0.78, onScreen ? 0 : 1);
    if (!onScreen) { x /= m; y /= m; }
    ui.guide.classList.add('show');
    ui.guide.style.transform = `translate(${(x * 0.5 + 0.5) * innerWidth}px, ${(-y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -50%)`;
    ui.guide.querySelector('.arrow').style.transform = `rotate(${Math.atan2(-y, x)}rad)`;
    ui.guide.querySelector('.txt').textContent = `${ti === N ? 'Finale' : STAGES[ti].org} · ${Math.round(d * 10)} km`;
  }

  return { enter, exit, update, afterCamera, get active() { return active; } };
}
