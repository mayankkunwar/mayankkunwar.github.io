import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const CV = window.CV;
const { gsap, ScrollTrigger } = window;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const CAPTURE = new URLSearchParams(location.search).has('capture');   // headless screenshots: timer loop + readable canvas
const STAGES = CV.stages || [];
const N = STAGES.length;
const KIND = { education: 'ringed', work: 'gas', project: 'moon', toolkit: 'station' };
const TYPE_LABEL = { education: 'Education', work: 'Experience', project: 'Research', toolkit: 'Toolkit' };
const PALETTE = ['#3b82f6', '#14b8a6', '#ef4444', '#f97316', '#a855f7', '#64748b', '#eab308'];
const colorOf = (st, i) => st.color || PALETTE[i % PALETTE.length];
const logosOf = (st) => [].concat(st.logo || []);
const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const words = (text, cls = 'w') => esc(text).split(/\s+/).map((w) => `<span class="${cls}"><span>${w}</span></span>`).join(' ');
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const isPortrait = () => innerWidth / innerHeight < 0.84 || innerWidth <= 760;

// ====================================================================
// 1. Content (rendered from data.js so the CV has one source of truth)
// ====================================================================
function render() {
  const c = CV.contact || {};
  $('#nav-name').textContent = CV.name;
  const logoChip = (urls, alt) => urls.length
    ? `<div class="logo-chip">${urls.map((u) => `<img src="${esc(u)}" alt="${esc(alt)} logo">`).join('')}</div>` : '';

  const chapters = STAGES.map((st, i) => {
    const kind = st.type || 'work';
    const role = st.type === 'toolkit' ? '' :
      `<p class="ch-role">${esc(st.title)}<span> · ${esc(st.org)}${st.location ? ' · ' + esc(st.location) : ''}</span></p>`;
    return `
      <section class="chapter" data-i="${i}" style="--c:${colorOf(st, i)}">
        <div class="sticky"><div class="chapter-inner"><div class="ch-content">
          <div class="ch-meta"><span class="idx">${String(i + 1).padStart(2, '0')}</span><span>${TYPE_LABEL[kind] || 'Experience'}</span>${st.period ? `<span>${esc(st.period)}</span>` : ''}</div>
          ${logoChip(logosOf(st), st.org)}
          <h2 class="ch-headline">${words(st.headline || st.org)}</h2>
          ${role}
          ${st.points && st.points.length ? `<ul class="ch-points">${st.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
          ${st.skills && st.skills.length ? `<div class="chips">${st.skills.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>` : ''}
        </div></div></div>
      </section>`;
  }).join('');

  const links = [
    c.email && ['Email me', 'mailto:' + c.email, 'primary'],
    c.linkedin && ['LinkedIn', c.linkedin, 'light'],
    c.github && ['GitHub', c.github, 'light'],
    c.website && ['Website', c.website, 'light'],
  ].filter(Boolean).map(([l, h, k]) => `<a class="btn ${k}" href="${esc(h)}" ${h.startsWith('mailto') ? '' : 'target="_blank" rel="noopener"'}>${esc(l)}</a>`).join('');

  $('#story').innerHTML = `
    <section class="hero" id="top">
      <div class="hero-inner">
        <p class="eyebrow grad-text hero-eyebrow">${esc(CV.title)}</p>
        <h1>${words(CV.name.replace(/(\S+)$/, '$1.'))}</h1>
        <p class="hero-sub">${esc(CV.tagline || '')}</p>
        <div class="hero-cta">
          <a class="btn primary" href="#journey">Start the journey</a>
          <a class="btn ghost" href="cv.html">View CV ›</a>
        </div>
        <div class="scroll-cue">Scroll</div>
      </div>
    </section>

    ${CV.statement ? `<section class="statement" id="about"><p>${esc(CV.statement).split(/\s+/).map((w) => `<span class="sw">${w}</span>`).join(' ')}</p></section>` : ''}

    ${(CV.stats || []).length ? `<section class="stats">${CV.stats.map((s) => `
      <div class="stat glass"><div class="num grad-text"><span class="count" data-to="${s.value}">${s.value}</span>${esc(s.suffix || '')}</div><p>${esc(s.label)}</p></div>`).join('')}</section>` : ''}

    <div id="journey">${chapters}</div>

    ${(CV.highlights || []).length ? `<section class="highlights" id="highlights"><div class="sticky">
      <h2 class="section-title">Get the highlights.</h2>
      <div class="track">${CV.highlights.map((h) => `
        <article class="hl-card glass" style="--c:${esc(h.color || '#22d3ee')}">
          <div class="hl-value">${esc(h.value)}</div>
          <p class="hl-label">${esc(h.label)}</p>
          <div class="hl-foot">${h.logo ? `<span class="logo-chip"><img src="${esc(h.logo)}" alt=""></span>` : ''}<span>${esc(h.org || '')}</span></div>
        </article>`).join('')}</div>
    </div></section>` : ''}

    ${(CV.skillGroups || []).length ? `<section class="skills" id="skills">
      <h2 class="section-title">Skills, <span class="grad-text">sharpened.</span></h2>
      <div class="skill-grid">${CV.skillGroups.map((g) => `
        <div class="skill-card glass" data-reveal><h3>${esc(g.label)}</h3><div class="chips">${g.items.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div></div>`).join('')}</div>
    </section>` : ''}

    <section class="contact" id="contact">
      <h2 data-reveal>Let’s talk.</h2>
      <p data-reveal>${esc(c.location || '')}${CV.rightToWork ? ' · ' + esc(CV.rightToWork) : ''}</p>
      <div class="contact-links" data-reveal>${links}<a class="btn light" href="cv.html">Printable CV</a></div>
    </section>`;

  document.body.insertAdjacentHTML('beforeend', `
    <footer><div class="inner">
      <span>© ${new Date().getFullYear()} ${esc(CV.name)}</span>
      <span><a href="cv.html">Printable CV</a> · <a href="#top">Back to top</a></span>
    </div></footer>`);
}

// ====================================================================
// 2. 3D scene
// ====================================================================
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*snoise(p); p*=2.03; a*=0.5; } return s; }
`;

const PLANET_VS = /* glsl */ `
varying vec3 vPos; varying vec3 vWN; varying vec3 vWP;
void main(){
  vPos = position;
  vWN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const PLANET_FS = /* glsl */ `
uniform vec3 uA; uniform vec3 uB; uniform vec3 uAtmo; uniform vec3 uLight;
uniform float uType; uniform float uSeed; uniform float uTime;
varying vec3 vPos; varying vec3 vWN; varying vec3 vWP;
${NOISE}
void main(){
  vec3 p = normalize(vPos);
  vec3 s = vec3(uSeed);
  vec3 col;
  if (uType < 0.5) {                     // gas giant: turbulent bands + storm
    float n = fbm(p * 2.2 + s + vec3(uTime * 0.01, 0.0, 0.0));
    float lat = p.y + n * 0.16 + fbm(p * 6.0 + s * 1.7) * 0.04;
    float b1 = sin(lat * 19.0) * 0.5 + 0.5, b2 = sin(lat * 7.0 + 1.3) * 0.5 + 0.5;
    col = mix(uA, uB, b1 * 0.6 + b2 * 0.4);
    col = mix(col, uB * 1.15, smoothstep(0.25, 0.7, fbm(p * 4.0 + s * 3.1)) * 0.25);
    float d = distance(p, normalize(vec3(0.55, -0.32, 0.77)));
    float storm = smoothstep(0.24, 0.0, d + fbm(p * 12.0 + s) * 0.05);
    col = mix(col, uA * 0.45, storm * 0.85);
  } else if (uType < 1.5) {              // ringed planet: soft bands + clouds
    float lat = p.y + fbm(p * 1.8 + s) * 0.09;
    col = mix(uA, uB, sin(lat * 11.0) * 0.5 + 0.5);
    col = mix(col, vec3(1.0), smoothstep(0.3, 0.8, fbm(p * 3.2 + s + vec3(uTime * 0.015))) * 0.22);
  } else {                               // moon: rock + craters
    float r = fbm(p * 2.4 + s) * 0.5 + 0.5, d = fbm(p * 9.0 + s) * 0.5 + 0.5;
    col = mix(uA, uB, r) * (0.78 + 0.35 * d);
    float c = smoothstep(0.08, 0.0, abs(snoise(p * 5.0 + s) - 0.45));
    float pit = smoothstep(0.5, 0.75, snoise(p * 5.0 + s));
    col = col * (1.0 - pit * 0.35) + c * 0.12;
  }
  vec3 N = normalize(vWN), L = normalize(uLight), V = normalize(cameraPosition - vWP);
  float wrap = max((dot(N, L) + 0.22) / 1.22, 0.0);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 lit = col * (0.025 + wrap * 1.15) + uAtmo * rim * (0.12 + max(dot(N, L), 0.0)) * 1.1;
  gl_FragColor = vec4(lit, 1.0);
}`;

const ATMO_VS = /* glsl */ `
varying vec3 vN; varying vec3 vV; varying vec3 vWN;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
  vWN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * mv;
}`;
const ATMO_FS = /* glsl */ `
uniform vec3 uColor; uniform vec3 uLight;
varying vec3 vN; varying vec3 vV; varying vec3 vWN;
void main(){
  float f = pow(1.0 - abs(dot(vN, vV)), 2.2);
  float lit = 0.35 + 0.65 * max(dot(-vWN, normalize(uLight)) + 0.3, 0.0);
  float a = smoothstep(0.0, 1.0, f) * 0.9 * lit;
  gl_FragColor = vec4(uColor * a * 1.5, a);
}`;

const RING_VS = /* glsl */ `varying float vR; void main(){ vR = length(position.xy); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const RING_FS = /* glsl */ `
uniform vec3 uA; uniform vec3 uB; uniform float uIn; uniform float uOut;
varying float vR;
void main(){
  float t = (vR - uIn) / (uOut - uIn);
  float b = 0.5 + 0.5 * sin(t * 70.0 + sin(t * 13.0) * 3.0);
  float a = smoothstep(0.0, 0.06, t) * smoothstep(1.0, 0.8, t) * (0.3 + 0.55 * b);
  a *= smoothstep(0.015, 0.04, abs(t - 0.62));
  gl_FragColor = vec4(mix(uA, uB, b) * 0.95, a * 0.85);
}`;

const SUN_FS = /* glsl */ `
uniform float uTime; varying vec3 vPos; varying vec3 vWN; varying vec3 vWP;
${NOISE}
void main(){
  vec3 p = normalize(vPos);
  float n = fbm(p * 3.0 + vec3(uTime * 0.06)) * 0.5 + 0.5;
  float g = fbm(p * 9.0 - vec3(uTime * 0.1)) * 0.5 + 0.5;
  vec3 col = mix(vec3(1.0, 0.42, 0.06), vec3(1.0, 0.92, 0.6), n) * (2.2 + g * 1.4);
  gl_FragColor = vec4(col, 1.0);
}`;

const STAR_VS = /* glsl */ `
attribute float size; attribute vec3 color; attribute float phase;
uniform float uTime; uniform float uPx;
varying vec3 vColor; varying float vTw;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vTw = 0.65 + 0.35 * sin(uTime * 1.6 + phase);
  vColor = color;
  gl_PointSize = size * uPx * (320.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const STAR_FS = /* glsl */ `
varying vec3 vColor; varying float vTw;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vColor * vTw * (a * a * 1.6), a);
}`;

function glowTexture(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function initSpace() {
  const canvas = $('#space');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: CAPTURE });
  } catch (e) {
    document.body.classList.add('no-webgl');
    return null;
  }
  const mobile = innerWidth <= 760;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 4000);
  const LIGHT = new THREE.Vector3(-1, 0.35, 0.75).normalize();
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
  sunLight.position.copy(LIGHT).multiplyScalar(100);
  scene.add(sunLight);

  // Planet layout: a winding path that heads deeper into space
  const centers = [];
  for (let i = 0; i <= N; i++) {
    centers.push(new THREE.Vector3(Math.sin(i * 1.25) * 15, Math.cos(i * 0.85) * 6, -i * 58 - (i === N ? 30 : 0)));
  }
  const bodies = [];
  const uniformsWithTime = [];

  STAGES.forEach((st, i) => {
    const kind = KIND[st.type] || 'gas';
    const base = new THREE.Color(colorOf(st, i));
    const group = new THREE.Group();
    group.position.copy(centers[i]);
    scene.add(group);
    const R = { gas: 3.4, ringed: 2.6, moon: 2.0, station: 2.3 }[kind];
    const body = { group, R, spin: null, kind };

    if (kind === 'station') {
      const metal = new THREE.MeshStandardMaterial({ color: 0xd4dbe6, metalness: 0.55, roughness: 0.35 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.5 });
      const panel = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.3, roughness: 0.25, emissive: 0x1d4ed8, emissiveIntensity: 0.35 });
      const rig = new THREE.Group();
      rig.add(new THREE.Mesh(new THREE.TorusGeometry(R, R * 0.15, 28, 120), metal));
      rig.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.32, 48, 48), metal));
      for (let k = 0; k < 4; k++) {
        const spoke = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.04, R * 0.04, R * 2, 12), dark);
        spoke.rotation.z = (k * Math.PI) / 4;
        rig.add(spoke);
      }
      const accent = new THREE.Mesh(new THREE.TorusGeometry(R, R * 0.155, 8, 120, Math.PI * 2), new THREE.MeshBasicMaterial({ color: base, wireframe: true, transparent: true, opacity: 0.25 }));
      rig.add(accent);
      const lights = new THREE.BufferGeometry();
      const lp = [];
      for (let k = 0; k < 48; k++) { const a = (k / 48) * Math.PI * 2; lp.push(Math.cos(a) * R, Math.sin(a) * R, R * 0.15); }
      lights.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
      rig.add(new THREE.Points(lights, new THREE.PointsMaterial({ color: 0xfde68a, size: 0.16, sizeAttenuation: true })));
      group.add(rig);
      const truss = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.05, R * 0.05, R * 4.4, 12), dark);
      truss.rotation.z = Math.PI / 2;
      group.add(truss);
      [-1, 1].forEach((side) => {
        const p = new THREE.Mesh(new THREE.BoxGeometry(R * 1.1, R * 0.7, R * 0.04), panel);
        p.position.x = side * R * 2.05;
        group.add(p);
      });
      group.rotation.set(0.5, -0.5, 0.2);
      body.spin = rig;
      body.spinAxis = 'z';
    } else {
      const type = kind === 'gas' ? 0 : kind === 'ringed' ? 1 : 2;
      const a = base.clone().offsetHSL(-0.015, 0.05, type === 2 ? -0.05 : -0.14);
      const b = base.clone().offsetHSL(0.03, -0.08, type === 2 ? 0.12 : 0.16);
      const u = {
        uA: { value: a }, uB: { value: b }, uAtmo: { value: base.clone().offsetHSL(0, 0, 0.12) },
        uLight: { value: LIGHT }, uType: { value: type }, uSeed: { value: i * 7.31 + 1.7 }, uTime: { value: 0 },
      };
      uniformsWithTime.push(u);
      const seg = mobile ? 64 : 112;
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(R, seg, seg), new THREE.ShaderMaterial({
        uniforms: u, vertexShader: PLANET_VS, fragmentShader: PLANET_FS,
      }));
      mesh.rotation.z = 0.22;
      group.add(mesh);
      body.spin = mesh;
      body.spinAxis = 'y';
      const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.13, 64, 64), new THREE.ShaderMaterial({
        uniforms: { uColor: { value: base.clone().offsetHSL(0, 0, 0.1) }, uLight: { value: LIGHT } },
        vertexShader: ATMO_VS, fragmentShader: ATMO_FS,
        side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
      }));
      group.add(atmo);
      if (kind === 'ringed') {
        const rIn = R * 1.35, rOut = R * 2.3;
        const ring = new THREE.Mesh(new THREE.RingGeometry(rIn, rOut, 200, 1), new THREE.ShaderMaterial({
          uniforms: { uA: { value: a.clone().offsetHSL(0, -0.1, 0.1) }, uB: { value: b.clone().offsetHSL(0, -0.2, 0.2) }, uIn: { value: rIn }, uOut: { value: rOut } },
          vertexShader: RING_VS, fragmentShader: RING_FS, side: THREE.DoubleSide, transparent: true, depthWrite: false,
        }));
        ring.rotation.set(Math.PI / 2 - 0.42, 0.18, 0);
        group.add(ring);
      }
    }
    bodies.push(body);
  });

  // The sun / contact beacon at the end of the route
  const sunC = centers[N];
  const sunU = { uTime: { value: 0 } };
  const sun = new THREE.Mesh(new THREE.SphereGeometry(6, 96, 96), new THREE.ShaderMaterial({ uniforms: sunU, vertexShader: PLANET_VS, fragmentShader: SUN_FS }));
  sun.position.copy(sunC);
  scene.add(sun);
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture([[0, 'rgba(255,220,150,1)'], [0.2, 'rgba(255,170,60,0.6)'], [0.5, 'rgba(255,120,30,0.15)'], [1, 'rgba(255,100,20,0)']]),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }));
  corona.scale.set(46, 46, 1);
  corona.position.copy(sunC);
  scene.add(corona);

  // Stars: distant shell + dust along the route for parallax
  const pathLen = N * 58 + 60;
  function starField(count, place, sizeRange, pxScale) {
    const pos = [], col = [], size = [], phase = [];
    const tints = [[1, 1, 1], [0.75, 0.85, 1], [1, 0.92, 0.75], [1, 0.8, 0.8]];
    for (let k = 0; k < count; k++) {
      pos.push(...place());
      const t = tints[Math.floor(Math.random() * tints.length)];
      const br = 0.5 + Math.random() * 0.5;
      col.push(t[0] * br, t[1] * br, t[2] * br);
      size.push(sizeRange[0] + Math.random() ** 3 * (sizeRange[1] - sizeRange[0]));
      phase.push(Math.random() * 6.28);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('size', new THREE.Float32BufferAttribute(size, 1));
    g.setAttribute('phase', new THREE.Float32BufferAttribute(phase, 1));
    const u = { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() * pxScale } };
    const pts = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: u, vertexShader: STAR_VS, fragmentShader: STAR_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    scene.add(pts);
    return u;
  }
  const starsU = starField(mobile ? 4000 : 7000, () => {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(500 + Math.random() * 700);
    return [v.x, v.y, v.z - pathLen / 2];
  }, [1.2, 7], 1);
  const dustU = starField(mobile ? 900 : 1600, () => [
    (Math.random() - 0.5) * 140, (Math.random() - 0.5) * 70, 40 - Math.random() * (pathLen + 120),
  ], [0.15, 0.7], 1);

  // Nebulae: soft additive sprites far behind the route
  const nebTex = glowTexture([[0, 'rgba(255,255,255,0.55)'], [0.4, 'rgba(255,255,255,0.18)'], [1, 'rgba(255,255,255,0)']]);
  [[0x7c3aed, -120, 40], [0x2563eb, 160, -40], [0xdb2777, -60, -60], [0x0891b2, 220, 60], [0x4f46e5, -220, 10], [0xf97316, 80, 80]].forEach(([c, x, y], k) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: nebTex, color: c, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.position.set(x, y, -180 - k * (pathLen / 5));
    s.scale.setScalar(420 + k * 40);
    scene.add(s);
  });

  // Post-processing
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.85, 0.65, 0.7);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // --- Camera poses: -1 = wide establishing shot, 0..N-1 = each stage, N = sun
  function pose(t) {
    const portrait = isPortrait();
    if (t <= -1) return { pos: new THREE.Vector3(6, 16, 74), look: new THREE.Vector3(0, -2, -70) };
    if (t >= N) {
      return { pos: sunC.clone().add(new THREE.Vector3(0, -14, portrait ? 120 : 96)), look: sunC.clone().add(new THREE.Vector3(0, -22, 0)) };
    }
    const { R } = bodies[t];
    const c = centers[t];
    const look = portrait ? c.clone().add(new THREE.Vector3(0, -R * 1.25, 0)) : c.clone().add(new THREE.Vector3(-R * 1.4, 0, 0));
    const dist = R * (portrait ? 6.2 : 4.3) * (bodies[t].kind === 'ringed' ? 1.25 : 1);
    return { pos: look.clone().add(new THREE.Vector3(R * 0.15, R * 0.3, dist)), look };
  }
  const ease = (f) => f * f * (3 - 2 * f);
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  function solve(t) {
    const a = Math.floor(t), f = t - a;
    const A = pose(a), B = pose(Math.min(a + 1, N));
    const e = ease(f);
    const pos = A.pos.clone().lerp(B.pos, e);
    const look = A.look.clone().lerp(B.look, e);
    const arc = Math.sin(Math.PI * f);
    pos.y += arc * 7;
    pos.x += arc * (a % 2 ? -6 : 6);
    return { pos, look };
  }

  let camT = -1, targetT = -1;
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; });

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
    composer.setSize(innerWidth, innerHeight);
  }
  addEventListener('resize', resize);

  let last = performance.now(), first = true;
  const schedule = CAPTURE ? (f) => setTimeout(() => f(performance.now()), 16) : requestAnimationFrame;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const time = now / 1000;
    camT += (targetT - camT) * (1 - Math.exp(-dt * (REDUCED ? 10 : 3.2)));
    mouse.sx += (mouse.x - mouse.sx) * (1 - Math.exp(-dt * 3));
    mouse.sy += (mouse.y - mouse.sy) * (1 - Math.exp(-dt * 3));
    const { pos, look } = solve(Math.max(-1, Math.min(N, camT)));
    camPos.copy(pos).add(new THREE.Vector3(mouse.sx * 1.6, -mouse.sy * 1.0, 0));
    camLook.copy(look);
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    uniformsWithTime.forEach((u) => (u.uTime.value = time));
    sunU.uTime.value = time;
    starsU.uTime.value = time;
    dustU.uTime.value = time;
    bodies.forEach((b, k) => { if (b.spin) b.spin.rotation[b.spinAxis] += dt * (b.kind === 'station' ? 0.12 : 0.05) * (k % 2 ? 1 : -1); });
    corona.material.rotation += dt * 0.02;

    composer.render();
    if (first) { first = false; canvas.classList.add('ready'); }
    schedule(frame);
  }
  schedule(frame);

  return { setTarget: (t) => (targetT = t), N };
}

// ====================================================================
// 3. Scroll choreography
// ====================================================================
function initScroll(space) {
  const haveGsap = gsap && ScrollTrigger;
  if (haveGsap) gsap.registerPlugin(ScrollTrigger);
  if (CAPTURE && haveGsap) gsap.ticker.lagSmoothing(0);   // slow software-rendered frames must not stall the timelines

  // Smooth scrolling (skipped for reduced motion and headless capture)
  let lenis = null;
  if (!REDUCED && !CAPTURE && window.Lenis && haveGsap) {
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const target = $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(target, { duration: 1.8 }) : target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
  }));

  // Highlights: vertical scroll drives a horizontal track
  const hl = $('.highlights'), track = $('.track');
  const hlDistance = () => (track ? Math.max(0, track.scrollWidth - innerWidth) : 0);
  const sizeHighlights = () => { if (hl) hl.style.height = innerHeight + hlDistance() + 'px'; };
  sizeHighlights();

  // Camera anchors: scroll position -> camera parameter, holding on each planet while its chapter is pinned
  let anchors = [];
  const top = (el) => el.getBoundingClientRect().top + scrollY;
  function computeAnchors() {
    sizeHighlights();
    const vh = innerHeight;
    const a = [[0, -1]];
    const firstCh = $('.chapter');
    const statement = $('.statement') || $('.stats') || firstCh;
    if (statement) a.push([top(statement) - vh * 0.2, -1]);
    $$('.chapter').forEach((ch, i) => {
      a.push([top(ch), i]);
      a.push([top(ch) + ch.offsetHeight - vh * 1.15, i]);
    });
    const finale = $('#contact');
    if (finale) a.push([top(finale) - vh * 0.1, N]);
    a.push([document.documentElement.scrollHeight, N]);
    anchors = a.sort((p, q) => p[0] - q[0]);
  }
  function camFromScroll(y) {
    for (let k = 1; k < anchors.length; k++) {
      const [y0, t0] = anchors[k - 1], [y1, t1] = anchors[k];
      if (y <= y1) return y1 === y0 ? t1 : t0 + ((y - y0) / (y1 - y0)) * (t1 - t0);
    }
    return anchors.length ? anchors[anchors.length - 1][1] : -1;
  }
  const progress = $('#progress');
  function onScroll() {
    const y = lenis ? lenis.scroll : scrollY;
    if (space) space.setTarget(Math.max(-1, Math.min(N, camFromScroll(y))));
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  }
  computeAnchors();
  addEventListener('scroll', onScroll, { passive: true });
  if (lenis) lenis.on('scroll', onScroll);
  addEventListener('resize', () => { computeAnchors(); onScroll(); });
  onScroll();

  if (!haveGsap) return;
  ScrollTrigger.addEventListener('refresh', () => { computeAnchors(); onScroll(); });

  // Active nav link
  [['#journey', 'Journey'], ['#highlights', 'Highlights'], ['#skills', 'Skills'], ['#contact', 'Contact']].forEach(([sel]) => {
    const el = $(sel), link = $(`.nav-links a[href="${sel}"]`);
    if (el && link) ScrollTrigger.create({ trigger: el, start: 'top 55%', end: 'bottom 55%', toggleClass: { targets: link, className: 'active' } });
  });

  if (REDUCED) return;   // content stays fully visible, no scroll-scrubbed motion

  // Hero entrance + exit
  gsap.from('.hero h1 .w > span', { yPercent: 110, duration: 1.5, ease: 'expo.out', stagger: 0.09, delay: 0.25 });
  gsap.from(['.hero-eyebrow', '.hero-sub', '.hero-cta', '.scroll-cue'], { y: 24, autoAlpha: 0, duration: 1.2, ease: 'power3.out', stagger: 0.12, delay: 0.7 });
  gsap.to('.hero-inner', {
    scale: 0.88, autoAlpha: 0, y: -80, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 35%', scrub: true },
  });

  // Statement: words light up as you read
  const sw = $$('.statement .sw');
  if (sw.length) {
    gsap.fromTo(sw, { opacity: 0.14 }, {
      opacity: 1, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: '.statement', start: 'top 72%', end: 'bottom 62%', scrub: true },
    });
  }

  // Stats: rise in and count up
  gsap.from('.stat', { y: 70, autoAlpha: 0, duration: 1.1, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: '.stats', start: 'top 82%' } });
  $$('.count').forEach((el) => {
    const to = +el.dataset.to, obj = { v: 0 };
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => gsap.to(obj, { v: to, duration: 1.8, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(obj.v)) }),
    });
  });

  // Chapters: pinned (CSS sticky) while content builds, scrolls if tall, then exits
  $$('.chapter').forEach((ch) => {
    const inner = $('.chapter-inner', ch), content = $('.ch-content', ch);
    const overflow = () => {
      const avail = isPortrait() ? innerHeight * 0.54 : innerHeight - 140;
      return -Math.max(0, content.offsetHeight - avail);
    };
    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      scrollTrigger: { trigger: ch, start: 'top top', end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true },
    });
    // fromTo with explicit end states: invalidateOnRefresh would make plain from() tweens re-read
    // their end values from the hidden start state. Not every chapter has a logo, role or points.
    const step = (sel, from, to, pos) => { const els = $$(sel, ch); if (els.length) tl.fromTo(els, from, to, pos); };
    const shown = { y: 0, autoAlpha: 1, scale: 1 };
    step('.ch-meta', { y: 30, autoAlpha: 0 }, { ...shown, duration: 0.5 });
    step('.logo-chip', { y: 30, autoAlpha: 0, scale: 0.9 }, { ...shown, duration: 0.5 }, '<0.1');
    step('.ch-headline .w > span', { yPercent: 115 }, { yPercent: 0, duration: 0.9, stagger: 0.08 }, '<0.05');
    step('.ch-role', { y: 24, autoAlpha: 0 }, { ...shown, duration: 0.5 }, '<0.3');
    step('.ch-points li', { y: 26, autoAlpha: 0 }, { ...shown, duration: 0.5, stagger: 0.14 }, '<0.15');
    step('.chip', { y: 14, autoAlpha: 0, scale: 0.9 }, { ...shown, duration: 0.3, stagger: 0.03 }, '<0.2');
    tl.fromTo(content, { y: 0 }, { y: overflow, ease: 'none', duration: 1.6 })
      .to({}, { duration: 0.6 })
      .fromTo(inner, { y: 0, autoAlpha: 1 }, { y: -70, autoAlpha: 0, duration: 0.7, ease: 'power2.in' });
  });

  // Highlights: horizontal scrub + cards tilt in
  if (hl && track) {
    gsap.to(track, {
      x: () => -hlDistance(), ease: 'none',
      scrollTrigger: { trigger: hl, start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true },
    });
    gsap.from('.highlights .section-title', { y: 50, autoAlpha: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: hl, start: 'top 70%' } });
    gsap.from('.hl-card', { y: 90, rotate: 2, autoAlpha: 0, duration: 1.1, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: hl, start: 'top 55%' } });
  }

  // Generic reveal for everything else
  gsap.set('[data-reveal]', { autoAlpha: 0 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 86%',
    onEnter: (els) => gsap.fromTo(els, { y: 50, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, ease: 'power3.out', stagger: 0.09, overwrite: true }),
  });
  gsap.from('.contact h2', { scale: 0.8, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'center center', scrub: true } });

  // Fonts can change heights: recompute everything once they're ready
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
}

render();
const space = initSpace();
initScroll(space);
