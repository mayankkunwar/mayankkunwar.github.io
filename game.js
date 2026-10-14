(() => {
  'use strict';

  const CV = window.CV;
  const W = 1280, H = 720;                       // minimum visible world area
  const SPACING = 1100, MARGIN = 700, WORLD_H = 2000;
  const SPEED = 340, BOOST = 1.75;
  const TAU = Math.PI * 2;
  const FONT = 'Orbitron, "Inter", sans-serif';
  const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const ZOOM0 = Math.min((innerWidth * DPR) / W, (innerHeight * DPR) / H);
  const S = Math.min(3, Math.max(2, Math.ceil(ZOOM0)));   // texture supersampling
  const TEXT_RES = Math.min(3, Math.max(1, Math.ceil(ZOOM0)));
  const TYPES = {
    education: { icon: '🎓', label: 'Education', kind: 'ringed' },
    work: { icon: '💼', label: 'Experience', kind: 'gas' },
    project: { icon: '🔬', label: 'Research', kind: 'moon' },
    toolkit: { icon: '🧰', label: 'Toolkit', kind: 'station' },
  };
  const PALETTE = ['#3b82f6', '#14b8a6', '#ef4444', '#f97316', '#a855f7', '#64748b', '#eab308'];
  const typeOf = (st) => TYPES[st.type] || TYPES.work;

  const $ = (s) => document.querySelector(s);
  const esc = (s = '') =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const font = (size, color = '#f8fafc') => ({
    fontFamily: FONT, fontSize: size + 'px', fontStyle: '700', color, align: 'center',
    stroke: '#020617', strokeThickness: Math.max(3, Math.round(size / 5)), resolution: TEXT_RES,
    shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 8, fill: true },
  });

  const touch = { up: false, boost: false, action: false };
  const progress = { visited: new Set(), coins: 0, totalCoins: 0, skills: new Set() };
  let scene = null;

  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rr = (a, b) => a + rnd() * (b - a);

  // ------------------------------------------------------------------
  // Procedural textures (drawn on canvas at S× for crisp scaling)
  // ------------------------------------------------------------------
  const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (hex, amt, a = 1) => {
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    const [r, g, b] = rgb(hex).map((v) => Math.round(v + (t - v) * p));
    return `rgba(${r},${g},${b},${a})`;
  };
  const hexNum = (hex) => parseInt(hex.slice(1), 16);

  function canvasTex(sc, key, w, h, draw, scale = S) {
    const t = sc.textures.createCanvas(key, Math.ceil(w * scale), Math.ceil(h * scale));
    const ctx = t.getContext();
    ctx.scale(scale, scale);
    draw(ctx, w, h);
    t.refresh();
  }
  const radial = (ctx, x, y, r0, r1, stops) => {
    const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    return g;
  };
  const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); };

  function planetTextures(sc, key, r, color, kind) {
    const size = Math.ceil(r * (kind === 'ringed' ? 4 : 3.2)), c = size / 2;
    const ring = (ctx, front) => {
      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(-0.38);
      for (let k = 0; k < 6; k++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, r * (1.42 + k * 0.09), r * (0.34 + k * 0.024), 0, front ? 0 : Math.PI, front ? Math.PI : TAU);
        ctx.lineWidth = r * 0.075;
        ctx.strokeStyle = mix(color, 0.55 - k * 0.1, 0.6 - k * 0.07);
        ctx.stroke();
      }
      ctx.restore();
    };

    canvasTex(sc, key + '_base', size, size, (ctx) => {
      ctx.fillStyle = radial(ctx, c, c, r * 0.8, r * 1.55, [[0, mix(color, 0.35, 0.55)], [0.4, mix(color, 0.2, 0.18)], [1, mix(color, 0, 0)]]);
      circle(ctx, c, c, r * 1.55); ctx.fill();
      if (kind === 'ringed') ring(ctx, false);
      ctx.save();
      circle(ctx, c, c, r); ctx.clip();
      ctx.fillStyle = kind === 'moon' ? mix(color, 0.15) : color;
      ctx.fillRect(c - r, c - r, 2 * r, 2 * r);
      if (kind === 'moon') {
        for (let k = 0; k < 9; k++) {
          ctx.fillStyle = mix(color, rr(-0.2, 0.25), 0.35);
          ctx.beginPath(); ctx.ellipse(c + rr(-r, r), c + rr(-r, r), rr(r * 0.2, r * 0.5), rr(r * 0.15, r * 0.35), rr(0, 3), 0, TAU); ctx.fill();
        }
        for (let k = 0; k < 22; k++) {
          const x = c + rr(-r, r), y = c + rr(-r, r), cr = rr(r * 0.04, r * 0.17);
          ctx.fillStyle = mix(color, -0.35, 0.55); circle(ctx, x, y, cr); ctx.fill();
          ctx.fillStyle = mix(color, -0.55, 0.45); circle(ctx, x + cr * 0.15, y + cr * 0.15, cr * 0.75); ctx.fill();
          ctx.strokeStyle = mix(color, 0.5, 0.45); ctx.lineWidth = cr * 0.18;
          ctx.beginPath(); ctx.arc(x, y, cr, Math.PI * 0.9, Math.PI * 1.6); ctx.stroke();
        }
      } else {
        const bands = kind === 'gas' ? 20 : 14;
        for (let i = 0; i < bands; i++) {
          const y = c - r + (i * 2 * r) / bands + rr(-4, 4), h = ((2 * r) / bands) * rr(0.6, 1.7);
          const f = rr(0.015, 0.04), ph = rr(0, TAU), amp = rr(1.5, kind === 'gas' ? 7 : 3);
          ctx.fillStyle = mix(color, rr(-0.38, 0.38), kind === 'gas' ? 0.55 : 0.35);
          ctx.beginPath(); ctx.moveTo(c - r, y);
          for (let x = -r; x <= r; x += 5) ctx.lineTo(c + x, y + Math.sin(x * f + ph) * amp);
          for (let x = r; x >= -r; x -= 5) ctx.lineTo(c + x, y + h + Math.sin(x * f + ph + 0.7) * amp);
          ctx.closePath(); ctx.fill();
        }
        if (kind === 'gas') {
          const sx = c + r * 0.28, sy = c + r * 0.32;
          ctx.fillStyle = mix(color, -0.4, 0.85); ctx.beginPath(); ctx.ellipse(sx, sy, r * 0.24, r * 0.12, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = mix(color, 0.3, 0.7); ctx.beginPath(); ctx.ellipse(sx, sy, r * 0.13, r * 0.06, 0, 0, TAU); ctx.fill();
        }
      }
      ctx.restore();
    });

    if (kind !== 'moon') {
      canvasTex(sc, key + '_clouds', size, size, (ctx) => {
        ctx.save(); circle(ctx, c, c, r); ctx.clip();
        for (let k = 0; k < 26; k++) {
          ctx.fillStyle = `rgba(255,255,255,${rr(0.05, 0.16)})`;
          ctx.beginPath(); ctx.ellipse(c + rr(-r, r), c + rr(-r, r), rr(r * 0.15, r * 0.5), rr(r * 0.04, r * 0.12), rr(-0.3, 0.3), 0, TAU); ctx.fill();
        }
        ctx.restore();
      });
    }

    canvasTex(sc, key + '_shade', size, size, (ctx) => {
      ctx.save(); circle(ctx, c, c, r); ctx.clip();
      ctx.fillStyle = radial(ctx, c - r * 0.45, c - r * 0.45, 0, r * 1.1, [[0, 'rgba(255,255,255,0.32)'], [1, 'rgba(255,255,255,0)']]);
      ctx.fillRect(c - r, c - r, 2 * r, 2 * r);
      ctx.fillStyle = radial(ctx, c - r * 0.32, c - r * 0.36, r * 0.45, r * 1.8,
        [[0, 'rgba(2,6,23,0)'], [0.5, 'rgba(2,6,23,0.3)'], [0.8, 'rgba(2,6,23,0.85)'], [1, 'rgba(2,6,23,0.95)']]);
      ctx.fillRect(c - r, c - r, 2 * r, 2 * r);
      ctx.restore();
      ctx.strokeStyle = mix(color, 0.65, 0.75); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(c, c, r - 1.2, Math.PI * 0.92, Math.PI * 1.72); ctx.stroke();
      if (kind === 'ringed') ring(ctx, true);
    });
    return size;
  }

  function stationTexture(sc, key, color) {
    const size = 300, c = size / 2;
    canvasTex(sc, key, size, size, (ctx) => {
      ctx.fillStyle = radial(ctx, c, c, 40, 150, [[0, mix(color, 0.3, 0.35)], [1, mix(color, 0, 0)]]);
      circle(ctx, c, c, 150); ctx.fill();
      // truss + solar panels
      ctx.fillStyle = '#64748b'; ctx.fillRect(c - 140, c - 4, 280, 8);
      [-1, 1].forEach((side) => {
        const x0 = side < 0 ? c - 142 : c + 82;
        const g = ctx.createLinearGradient(x0, c - 30, x0 + 60, c + 30);
        g.addColorStop(0, '#1e3a8a'); g.addColorStop(0.5, '#2563eb'); g.addColorStop(1, '#172554');
        ctx.fillStyle = g; ctx.fillRect(x0, c - 30, 60, 60);
        ctx.strokeStyle = 'rgba(147,197,253,0.6)'; ctx.lineWidth = 1;
        for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x0 + k * 15, c - 30); ctx.lineTo(x0 + k * 15, c + 30); ctx.stroke(); }
        for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x0, c - 30 + k * 15); ctx.lineTo(x0 + 60, c - 30 + k * 15); ctx.stroke(); }
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.strokeRect(x0, c - 30, 60, 60);
      });
      // spokes
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 4;
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + Math.PI / 4;
        ctx.beginPath(); ctx.moveTo(c, c); ctx.lineTo(c + Math.cos(a) * 66, c + Math.sin(a) * 66); ctx.stroke();
      }
      // habitat ring
      const rg = ctx.createLinearGradient(c - 70, c - 70, c + 70, c + 70);
      rg.addColorStop(0, '#f1f5f9'); rg.addColorStop(0.5, '#94a3b8'); rg.addColorStop(1, '#334155');
      ctx.strokeStyle = rg; ctx.lineWidth = 20; circle(ctx, c, c, 68); ctx.stroke();
      ctx.strokeStyle = mix(color, 0.1, 0.9); ctx.lineWidth = 3; circle(ctx, c, c, 68); ctx.stroke();
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * TAU;
        ctx.fillStyle = k % 3 ? '#fde68a' : '#67e8f9';
        circle(ctx, c + Math.cos(a) * 68, c + Math.sin(a) * 68, 2.2); ctx.fill();
      }
      // hub
      ctx.fillStyle = radial(ctx, c - 9, c - 9, 2, 32, [[0, '#ffffff'], [0.35, '#cbd5e1'], [1, '#334155']]);
      circle(ctx, c, c, 30); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 4; circle(ctx, c, c, 20); ctx.stroke();
    });
  }

  function makeTextures(sc) {
    canvasTex(sc, 'ship', 64, 40, (ctx) => {
      const wing = (dir) => {
        const g = ctx.createLinearGradient(0, 20, 0, 20 + dir * 18);
        g.addColorStop(0, '#1d4ed8'); g.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(34, 20); ctx.lineTo(8, 20 + dir * 19); ctx.lineTo(19, 20 + dir * 19); ctx.lineTo(44, 20 + dir * 4); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(14, 20 + dir * 17); ctx.lineTo(30, 20 + dir * 8); ctx.stroke();
      };
      wing(-1); wing(1);
      const hull = ctx.createLinearGradient(0, 11, 0, 29);
      hull.addColorStop(0, '#ffffff'); hull.addColorStop(0.55, '#cbd5e1'); hull.addColorStop(1, '#475569');
      ctx.fillStyle = hull;
      ctx.beginPath(); ctx.moveTo(63, 20); ctx.quadraticCurveTo(52, 10, 26, 12); ctx.lineTo(12, 15); ctx.lineTo(12, 25);
      ctx.lineTo(26, 28); ctx.quadraticCurveTo(52, 30, 63, 20); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(18, 20); ctx.lineTo(36, 20); ctx.stroke();
      const glass = ctx.createLinearGradient(40, 15, 40, 25);
      glass.addColorStop(0, '#a5f3fc'); glass.addColorStop(1, '#0e7490');
      ctx.fillStyle = glass; ctx.beginPath(); ctx.ellipse(45, 20, 8.5, 4.6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(46.5, 18, 3.2, 1.3, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#334155'; ctx.fillRect(8, 15.5, 6, 9);
      ctx.fillStyle = '#fde68a'; ctx.fillRect(7, 17.5, 2, 5);
    });
    canvasTex(sc, 'flame', 70, 24, (ctx) => {
      const g = ctx.createLinearGradient(70, 0, 0, 0);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.15, 'rgba(253,230,138,0.95)');
      g.addColorStop(0.45, 'rgba(249,115,22,0.7)'); g.addColorStop(1, 'rgba(239,68,68,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(35, 12, 35, 7, 0, 0, TAU); ctx.fill();
    });
    canvasTex(sc, 'crystal', 48, 48, (ctx) => {
      ctx.fillStyle = radial(ctx, 24, 24, 2, 24, [[0, 'rgba(103,232,249,0.55)'], [1, 'rgba(103,232,249,0)']]);
      circle(ctx, 24, 24, 24); ctx.fill();
      const g = ctx.createLinearGradient(14, 8, 34, 40);
      g.addColorStop(0, '#fef9c3'); g.addColorStop(0.5, '#facc15'); g.addColorStop(1, '#b45309');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(24, 7); ctx.lineTo(35, 22); ctx.lineTo(24, 41); ctx.lineTo(13, 22); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(13, 22); ctx.lineTo(35, 22); ctx.moveTo(24, 7); ctx.lineTo(20, 22); ctx.lineTo(24, 41); ctx.stroke();
    });
    canvasTex(sc, 'dot', 16, 16, (ctx) => {
      ctx.fillStyle = radial(ctx, 8, 8, 0, 8, [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);
      ctx.fillRect(0, 0, 16, 16);
    });
    canvasTex(sc, 'streak', 220, 6, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 220, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.95)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(110, 3, 110, 1.6, 0, 0, TAU); ctx.fill();
    });
    canvasTex(sc, 'sun', 320, 320, (ctx) => {
      ctx.fillStyle = radial(ctx, 160, 160, 0, 160, [[0, '#ffffff'], [0.18, '#fef9c3'], [0.32, '#fbbf24'], [0.45, 'rgba(245,158,11,0.55)'], [1, 'rgba(245,158,11,0)']]);
      ctx.fillRect(0, 0, 320, 320);
    });
    canvasTex(sc, 'rays', 400, 400, (ctx) => {
      ctx.translate(200, 200);
      for (let k = 0; k < 28; k++) {
        ctx.rotate(TAU / 28);
        const len = k % 2 ? 190 : 140;
        const g = ctx.createLinearGradient(0, 0, len, 0);
        g.addColorStop(0, 'rgba(253,230,138,0.6)'); g.addColorStop(1, 'rgba(253,230,138,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(len, 0); ctx.lineTo(0, 5); ctx.fill();
      }
    });
    for (let k = 0; k < 4; k++) {
      canvasTex(sc, 'rock' + k, 56, 56, (ctx) => {
        ctx.beginPath();
        const n = 11;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU, d = rr(17, 26);
          i ? ctx.lineTo(28 + Math.cos(a) * d, 28 + Math.sin(a) * d) : ctx.moveTo(28 + Math.cos(a) * d, 28 + Math.sin(a) * d);
        }
        ctx.closePath();
        ctx.fillStyle = radial(ctx, 20, 20, 2, 34, [[0, '#a8a29e'], [0.6, '#57534e'], [1, '#1c1917']]);
        ctx.fill();
        ctx.save(); ctx.clip();
        for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(28,25,23,0.55)'; circle(ctx, rr(14, 42), rr(14, 42), rr(2, 5)); ctx.fill(); }
        ctx.restore();
      });
    }
    // Star layers (1×, tiled)
    [[260, 0.5, 1.1], [130, 0.8, 1.6], [45, 1.2, 2.3]].forEach(([count, rMin, rMax], L) => {
      canvasTex(sc, 'stars' + L, 512, 512, (ctx) => {
        for (let k = 0; k < count; k++) {
          const x = rr(0, 512), y = rr(0, 512), r = rr(rMin, rMax);
          const col = ['255,255,255', '191,219,254', '254,240,138', '252,165,165'][Math.floor(rr(0, 4))];
          if (L) { ctx.fillStyle = radial(ctx, x, y, 0, r * 3, [[0, `rgba(${col},0.35)`], [1, `rgba(${col},0)`]]); circle(ctx, x, y, r * 3); ctx.fill(); }
          ctx.fillStyle = `rgba(${col},${rr(0.5, 1)})`; circle(ctx, x, y, r); ctx.fill();
        }
      }, 1);
    });
    canvasTex(sc, 'nebula', 256, 256, (ctx) => {
      for (let k = 0; k < 7; k++) {   // blobs stay inside the square so the scaled image has no hard edges
        const x = rr(98, 158), y = rr(98, 158), r = rr(45, 92);
        ctx.fillStyle = radial(ctx, x, y, 0, r, [[0, 'rgba(255,255,255,0.4)'], [0.5, 'rgba(255,255,255,0.15)'], [1, 'rgba(255,255,255,0)']]);
        ctx.fillRect(0, 0, 256, 256);
      }
    }, 1);
  }

  // ------------------------------------------------------------------
  // Scene
  // ------------------------------------------------------------------
  class Space extends Phaser.Scene {
    constructor() { super('space'); }

    create() {
      scene = this;
      makeTextures(this);
      const stages = CV.stages || [], n = stages.length;
      this.worldW = MARGIN * 2 + n * SPACING;
      const cam = this.cameras.main;
      this.physics.world.setBounds(0, 0, this.worldW, WORLD_H);
      cam.setBounds(0, 0, this.worldW, WORLD_H);
      this.fit();
      this.scale.on('resize', () => this.fit());

      const yAt = (i) => WORLD_H / 2 + Math.sin(i * 1.3 + 0.6) * 420;
      this.start = new Phaser.Math.Vector2(MARGIN - 420, WORLD_H / 2);
      this.drawSpace();

      this.coins = [];
      this.buildings = stages.map((st, i) => this.buildPlanet(st, i, MARGIN + i * SPACING, yAt(i)));
      this.buildGoal(MARGIN + n * SPACING, yAt(n));
      this.drawRoute();
      this.scatterAsteroids();

      this.add.text(this.start.x + 40, this.start.y - 170, `${CV.name}`, font(30, '#fde68a')).setOrigin(0.5).setDepth(6);
      this.add.text(this.start.x + 40, this.start.y - 125, `${CV.title}\nFollow the route  >>>`, font(15, '#a5f3fc'))
        .setOrigin(0.5).setLineSpacing(8).setDepth(6);

      // Ship
      this.ship = this.physics.add.image(this.start.x, this.start.y, 'ship').setScale(1 / S).setDepth(10);
      this.ship.setCollideWorldBounds(true);
      this.vel = new Phaser.Math.Vector2();
      this.flame = this.add.image(0, 0, 'flame').setOrigin(1, 0.5).setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
      this.trail = this.add.particles(0, 0, 'dot', {
        lifespan: 650, speed: { min: 20, max: 70 }, frequency: 14,
        angle: { onEmit: () => Phaser.Math.RadToDeg(this.ship.rotation) + 180 + Phaser.Math.Between(-14, 14) },
        scale: { start: 0.9 / S * 2, end: 0 }, alpha: { start: 0.8, end: 0 },
        tint: [0xfbbf24, 0xf97316, 0x60a5fa], blendMode: 'ADD', emitting: false,
      }).setDepth(8);
      cam.startFollow(this.ship, false, 0.08, 0.08);

      this.burst = this.add.particles(0, 0, 'dot', {
        lifespan: 800, speed: { min: 80, max: 280 }, scale: { start: 1.2, end: 0 }, alpha: { start: 1, end: 0 },
        tint: [0xfacc15, 0x67e8f9, 0xffffff], blendMode: 'ADD', emitting: false,
      }).setDepth(11);
      this.fireworks = this.add.particles(0, 0, 'dot', {
        lifespan: 1500, speed: { min: 120, max: 460 }, gravityY: 90, scale: { start: 1.4, end: 0 }, alpha: { start: 1, end: 0 },
        tint: [0xfacc15, 0xf472b6, 0x22d3ee, 0xa78bfa, 0x4ade80], blendMode: 'ADD', emitting: false,
      }).setDepth(11);

      this.prompt = this.add.text(0, 0, '', font(15, '#fde68a')).setOrigin(0.5).setDepth(12).setVisible(false);
      this.tweens.add({ targets: this.prompt, alpha: 0.55, duration: 550, yoyo: true, repeat: -1 });

      this.time.addEvent({ delay: 2200, loop: true, callback: () => Math.random() < 0.6 && this.shootingStar() });

      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys('W,A,S,D,E,ENTER,SHIFT');
      this.cooldown = 0;

      progress.totalCoins = this.coins.length;
      this.locked = true;
      this.physics.pause();
      UI.init(this);
    }

    fit() {
      const cam = this.cameras.main, w = this.scale.width, h = this.scale.height;
      cam.setSize(w, h);
      cam.setZoom(Math.min(w / (h > w ? 760 : W), h / H));   // portrait phones: show a narrower slice, closer up
      (this.starLayers || []).forEach(({ ts }) => ts.setPosition(w / 2, h / 2).setSize(w / cam.zoom + 8, h / cam.zoom + 8));
    }

    drawSpace() {
      // Screen-sized star layers scrolled by hand: world-sized tile sprites exceed GPU texture limits
      this.starLayers = [0.1, 0.3, 0.6].map((f, L) => ({
        f, ts: this.add.tileSprite(0, 0, 8, 8, 'stars' + L).setScrollFactor(0).setDepth(-10 + L),
      }));
      this.fit();
      const tints = [0x7c3aed, 0x2563eb, 0xdb2777, 0x0891b2, 0x4f46e5];
      for (let k = 0; k < 10; k++) {
        this.add.image(rr(-400, this.worldW * 0.2 + 1200), rr(-200, WORLD_H * 0.2 + 700), 'nebula')
          .setScrollFactor(0.2).setDepth(-11).setScale(rr(5, 10)).setRotation(rr(0, TAU))
          .setTint(tints[k % tints.length]).setAlpha(rr(0.14, 0.24)).setBlendMode(Phaser.BlendModes.ADD);
      }
      for (let k = 0; k < 70; k++) {
        const s = this.add.image(rr(-300, this.worldW * 0.6 + 1500), rr(-300, WORLD_H * 0.6 + 900), 'dot')
          .setScrollFactor(0.6).setDepth(-7).setScale(rr(0.25, 0.6)).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: s, alpha: 0.15, duration: rr(700, 2200), yoyo: true, repeat: -1, delay: rr(0, 2000) });
      }
    }

    buildPlanet(st, i, x, y) {
      const meta = typeOf(st), color = st.color || PALETTE[i % PALETTE.length], kind = meta.kind;
      let r, top, landR, orbitR;
      if (kind === 'station') {
        stationTexture(this, 'p' + i, color);
        const img = this.add.image(x, y, 'p' + i).setScale(1 / S).setDepth(3);
        this.tweens.add({ targets: img, angle: 360, duration: 70000, repeat: -1 });
        r = 90; top = 120; landR = 170; orbitR = 230;
      } else {
        r = { gas: 125, ringed: 95, moon: 78 }[kind];
        planetTextures(this, 'p' + i, r, color, kind);
        this.add.image(x, y, 'p' + i + '_base').setScale(1 / S).setDepth(2);
        if (kind !== 'moon') {
          const clouds = this.add.image(x, y, 'p' + i + '_clouds').setScale(1 / S).setDepth(3);
          this.tweens.add({ targets: clouds, angle: i % 2 ? 360 : -360, duration: 90000, repeat: -1 });
        }
        this.add.image(x, y, 'p' + i + '_shade').setScale(1 / S).setDepth(4);
        top = r + 22;
        landR = (kind === 'ringed' ? r * 1.6 : r) + 70;
        orbitR = (kind === 'ringed' ? r * 1.85 : r) + 85;
      }

      const halo = this.add.circle(x, y, landR, 0x22d3ee, 0.04).setStrokeStyle(2, 0x67e8f9, 0.7).setDepth(1).setAlpha(0);
      this.tweens.add({ targets: halo, scale: 1.04, duration: 900, yoyo: true, repeat: -1 });
      this.add.text(x, y - top - (st.period ? 22 : 0), st.org, { ...font(22), wordWrap: { width: 420 } }).setOrigin(0.5, 1).setDepth(6);
      if (st.period) this.add.text(x, y - top, st.period, font(14, '#67e8f9')).setOrigin(0.5, 1).setDepth(6);

      const skills = st.skills || [];
      const two = skills.length > 6;
      const g = this.add.graphics().setDepth(1);
      g.lineStyle(1.5, 0x67e8f9, 0.16).strokeCircle(x, y, orbitR);
      if (two) g.strokeCircle(x, y, orbitR + 60);
      const dir = i % 2 ? 1 : -1;
      skills.forEach((name, k) => {
        const img = this.add.image(x, y, 'crystal').setScale(1 / S).setDepth(5);
        this.tweens.add({ targets: img, scale: 1.25 / S, duration: 650, yoyo: true, repeat: -1, delay: k * 90 });
        const label = this.add.text(x, y, name, font(12, '#e0f2fe')).setOrigin(0.5, 1).setDepth(5);
        this.coins.push({ img, label, name, cx: x, cy: y, rad: orbitR + (two && k % 2 ? 60 : 0), a: (k / skills.length) * TAU, w: dir * 0.16, taken: false });
      });
      return { x, y, r, landR, idx: i, halo };
    }

    buildGoal(x, y) {
      const rays = this.add.image(x, y, 'rays').setScale(1.3 / S).setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: rays, angle: 360, duration: 40000, repeat: -1 });
      const sun = this.add.image(x, y, 'sun').setScale(1 / S).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: sun, scale: 1.12 / S, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.add.text(x, y - 170, "LET'S TALK!", font(28, '#fde68a')).setOrigin(0.5, 1).setDepth(6);
      this.add.text(x, y + 170, 'Contact beacon', font(15, '#67e8f9')).setOrigin(0.5, 0).setDepth(6);
      const halo = this.add.circle(x, y, 200, 0xfbbf24, 0.04).setStrokeStyle(2, 0xfde68a, 0.7).setDepth(1).setAlpha(0);
      this.goal = { x, y, landR: 200, halo };
    }

    drawRoute() {
      const pts = [this.start, ...this.buildings.map((b) => new Phaser.Math.Vector2(b.x, b.y)), new Phaser.Math.Vector2(this.goal.x, this.goal.y)];
      const curve = new Phaser.Curves.Spline(pts);
      const g = this.add.graphics().setDepth(0);
      const dots = curve.getSpacedPoints(Math.floor(curve.getLength() / 26));
      dots.forEach((p, k) => g.fillStyle(0x67e8f9, k % 4 ? 0.22 : 0.5).fillCircle(p.x, p.y, k % 4 ? 2 : 3));
    }

    scatterAsteroids() {
      const avoid = [...this.buildings, this.goal, { x: this.start.x, y: this.start.y }];
      for (let k = 0, placed = 0; k < 400 && placed < 46; k++) {
        const x = rr(150, this.worldW - 150), y = rr(120, WORLD_H - 120);
        if (avoid.some((b) => Phaser.Math.Distance.Between(x, y, b.x, b.y) < 420)) continue;
        const a = this.add.image(x, y, 'rock' + (placed % 4)).setScale(rr(0.5, 1.5) / S).setDepth(1).setRotation(rr(0, TAU));
        this.tweens.add({ targets: a, angle: a.angle + (placed % 2 ? 360 : -360), duration: rr(20000, 60000), repeat: -1 });
        this.tweens.add({ targets: a, y: y + rr(-30, 30), x: x + rr(-30, 30), duration: rr(4000, 9000), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        placed++;
      }
    }

    shootingStar() {
      const v = this.cameras.main.worldView;
      const s = this.add.image(v.x + rr(0, v.width), v.y + rr(0, v.height * 0.5), 'streak')
        .setScale(1 / S).setRotation(0.45).setDepth(-5).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: s, x: s.x + 520, y: s.y + 250, alpha: 0, duration: 750, onComplete: () => s.destroy() });
    }

    readInput() {
      const JD = Phaser.Input.Keyboard.JustDown, c = this.cursors, k = this.keys;
      const act = [k.E, k.ENTER].map(JD).includes(true) || touch.action;
      touch.action = false;
      return {
        left: c.left.isDown || k.A.isDown, right: c.right.isDown || k.D.isDown,
        up: c.up.isDown || k.W.isDown, down: c.down.isDown || k.S.isDown,
        boost: k.SHIFT.isDown || c.space.isDown || touch.boost, act,
      };
    }

    update(time, delta) {
      const input = this.readInput(); // always read so presses during a dialog don't leak out afterwards
      const cam0 = this.cameras.main;
      this.starLayers.forEach(({ f, ts }) => ts.setTilePosition(cam0.scrollX * f, cam0.scrollY * f));
      if (this.locked) return;
      const dt = Math.min(0.05, delta / 1000), s = this.ship, cam = this.cameras.main;

      let ax = (input.right ? 1 : 0) - (input.left ? 1 : 0), ay = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      const p = this.input.activePointer;
      if (!ax && !ay && p.isDown) {
        const wp = p.positionToCamera(cam), dx = wp.x - s.x, dy = wp.y - s.y, d = Math.hypot(dx, dy);
        if (d > 30) { ax = dx / d; ay = dy / d; }
      }
      const len = Math.hypot(ax, ay);
      if (len) { ax /= len; ay /= len; }
      const max = SPEED * (1 + Math.min(0.6, progress.coins * 0.015)) * (input.boost ? BOOST : 1);
      const k = Math.min(1, dt * (len ? 2.6 : 1.3));
      this.vel.x += (ax * max - this.vel.x) * k;
      this.vel.y += (ay * max - this.vel.y) * k;
      s.setVelocity(this.vel.x, this.vel.y);
      if (this.vel.length() > 12) s.rotation = Phaser.Math.Angle.RotateTo(s.rotation, this.vel.angle(), dt * 7);

      const bx = s.x - Math.cos(s.rotation) * 22, by = s.y - Math.sin(s.rotation) * 22;
      const fl = (len ? (input.boost ? 1.6 : 1) : 0.3) * (0.85 + Math.random() * 0.3);
      this.flame.setPosition(bx, by).setRotation(s.rotation).setScale(fl / S, (0.9 + Math.random() * 0.2) / S).setAlpha(len ? 1 : 0.6);
      this.trail.setPosition(bx, by);
      this.trail.emitting = !!len;
      cam.setFollowOffset(-this.vel.x * 0.35, -this.vel.y * 0.25);

      for (const c of this.coins) {
        if (c.taken) continue;
        c.a += c.w * dt;
        const x = c.cx + Math.cos(c.a) * c.rad, y = c.cy + Math.sin(c.a) * c.rad;
        c.img.setPosition(x, y);
        c.label.setPosition(x, y - 16);
        if (Phaser.Math.Distance.Between(s.x, s.y, x, y) < 44) this.collect(c);
      }

      const near = this.buildings.find((b) => Phaser.Math.Distance.Between(s.x, s.y, b.x, b.y) < b.landR);
      const atGoal = Phaser.Math.Distance.Between(s.x, s.y, this.goal.x, this.goal.y) < this.goal.landR;
      this.buildings.forEach((b) => b.halo.setAlpha(b === near ? 1 : 0));
      this.goal.halo.setAlpha(atGoal ? 1 : 0);
      if (near || atGoal) {
        this.prompt.setText(IS_TOUCH ? 'TAP E TO LAND' : 'PRESS E TO LAND').setPosition(s.x, s.y - 52).setVisible(true);
        if (input.act && time > this.cooldown) atGoal ? this.openGoal() : this.openStage(near.idx);
      } else {
        this.prompt.setVisible(false);
      }

      UI.moveMarker(s.x / this.worldW);
    }

    collect(c) {
      c.taken = true;
      this.tweens.killTweensOf(c.img);
      this.burst.explode(22, c.img.x, c.img.y);
      c.img.destroy();
      this.tweens.add({ targets: c.label, y: c.label.y - 50, alpha: 0, scale: 1.4, duration: 1000, onComplete: () => c.label.destroy() });
      progress.coins++;
      progress.skills.add(c.name);
      if (progress.coins % 5 === 0) this.popText(`ENGINE BOOST  ·  LV ${progress.coins / 5 + 1}`, '#67e8f9');
      UI.refresh();
    }

    popText(msg, color) {
      const t = this.add.text(this.ship.x, this.ship.y - 80, msg, font(16, color)).setOrigin(0.5).setDepth(12);
      this.tweens.add({ targets: t, y: t.y - 60, alpha: 0, duration: 1600, ease: 'Cubic.out', onComplete: () => t.destroy() });
    }

    lock() {
      this.locked = true;
      this.physics.pause();
      this.prompt.setVisible(false);
      this.trail.emitting = false;
      this.vel.set(0, 0);
      this.flame.setAlpha(0.6).setScale(0.3 / S, 1 / S);
    }
    unlock() { this.locked = false; this.physics.resume(); this.cooldown = this.time.now + 250; }

    openStage(i) {
      progress.visited.add(i);
      this.lock();
      UI.showStage(i);
    }

    openGoal() {
      if (this.locked) return;
      this.lock();
      for (let k = 0; k < 6; k++) {
        this.time.delayedCall(k * 160, () => this.fireworks.explode(70, this.goal.x + rr(-220, 220), this.goal.y + rr(-200, 120)));
      }
      this.time.delayedCall(1000, () => UI.showGoal());
    }

    travelTo(x, y) {
      this.ship.setPosition(x, y).setVelocity(0, 0).setRotation(0);
      this.vel.set(0, 0);
      this.cameras.main.setFollowOffset(0, 0).centerOn(x, y);
    }
  }

  // ------------------------------------------------------------------
  // DOM UI
  // ------------------------------------------------------------------
  const UI = {
    init(sc) {
      $('#hud-name').textContent = CV.name;
      $('#hud-title').textContent = CV.title;
      $('#intro-name').textContent = CV.name;
      $('#intro-title').textContent = CV.title;
      $('#intro-tag').textContent = CV.tagline || '';
      if (IS_TOUCH) {
        document.body.classList.add('touch');
        $('.controls').innerHTML = '<li>Hold &amp; drag to fly</li><li><kbd>⚡</kbd> boost</li><li><kbd>E</kbd> land on a planet</li>';
      }

      const tl = $('#timeline');
      sc.buildings.forEach((b) => {
        const st = CV.stages[b.idx];
        const dot = document.createElement('button');
        dot.className = 'dot ' + (st.type || 'work');
        dot.style.left = (b.x / sc.worldW) * 100 + '%';
        dot.style.setProperty('--c', st.color || '');
        dot.title = `${st.org}${st.period ? ' · ' + st.period : ''} — click to warp`;
        dot.onclick = () => { sc.travelTo(b.x - b.landR - 40, b.y); dot.blur(); };
        tl.appendChild(dot);
        b.dot = dot;
      });
      const g = document.createElement('button');
      g.className = 'dot goal';
      g.style.left = (sc.goal.x / sc.worldW) * 100 + '%';
      g.title = 'Contact beacon — click to warp';
      g.onclick = () => { sc.travelTo(sc.goal.x - 260, sc.goal.y); g.blur(); };
      tl.appendChild(g);

      this.refresh();
      this.bindModal();
      this.bindTouch();
      this.buildClassic();

      const start = $('#btn-start');
      start.disabled = false;
      const go = () => {
        if ($('#intro').classList.contains('hidden')) return;
        $('#intro').classList.add('hidden');
        start.blur();
        sc.unlock();
      };
      start.onclick = go;
      window.addEventListener('keydown', (e) => {
        if (['Enter', ' ', 'ArrowRight'].includes(e.key) && !$('#intro').classList.contains('hidden')) go();
      });
      $('#btn-skip').onclick = () => { go(); this.openClassic(); };
      $('#btn-cv').onclick = (e) => { e.currentTarget.blur(); this.openClassic(); };
      $('#btn-bag').onclick = (e) => { e.currentTarget.blur(); $('#bag').classList.toggle('hidden'); };
      $('#btn-back').onclick = () => this.closeClassic();
      $('#btn-print').onclick = () => window.print();
    },

    refresh() {
      const n = CV.stages.length;
      $('#hud-cp').textContent = `${progress.visited.size}/${n}`;
      $('#hud-sk').textContent = `${progress.coins}/${progress.totalCoins}`;
      scene.buildings.forEach((b) => b.dot && b.dot.classList.toggle('visited', progress.visited.has(b.idx)));
      const got = [...progress.skills];
      $('#bag').innerHTML = got.length
        ? `<p>Skill crystals collected</p><div class="chips">${got.map((s) => `<span class="chip got">${esc(s)}</span>`).join('')}</div>`
        : '<p>No crystals yet — fly through the ones orbiting each planet 💎</p>';
    },

    moveMarker(f) {
      const pct = (f * 100).toFixed(1) + '%';
      if (pct !== this._pct) $('#me').style.left = this._pct = pct;
    },

    openModal(html, actions) {
      $('#modal-body').innerHTML = html;
      const box = $('#modal-actions');
      box.innerHTML = '';
      actions.forEach(([label, fn, cls]) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.className = cls || '';
        b.onclick = fn;
        box.appendChild(b);
      });
      $('#modal').classList.remove('hidden');
      this.refresh();
    },

    closeModal() {
      if ($('#modal').classList.contains('hidden')) return;
      $('#modal').classList.add('hidden');
      scene.unlock();
    },

    bindModal() {
      const m = $('#modal');
      m.addEventListener('click', (e) => { if (e.target === m || e.target.hasAttribute('data-close')) this.closeModal(); });
      window.addEventListener('keydown', (e) => {
        if (!m.classList.contains('hidden') && ['Escape', 'e', 'E', 'Enter'].includes(e.key)) { e.preventDefault(); this.closeModal(); }
      });
    },

    showStage(i) {
      const st = CV.stages[i], meta = typeOf(st);
      const chips = (st.skills || [])
        .map((s) => `<span class="chip ${progress.skills.has(s) ? 'got' : ''}">${progress.skills.has(s) ? '✓ ' : ''}${esc(s)}</span>`)
        .join('');
      $('#modal .card').style.setProperty('--c', st.color || '');
      this.openModal(
        `<div class="badge">${meta.icon} ${meta.label}${st.period ? ' · ' + esc(st.period) : ''}</div>
         <h2>${esc(st.title)}</h2>
         <h3>${esc(st.org)}${st.location ? ' · ' + esc(st.location) : ''}</h3>
         ${st.summary ? `<p>${esc(st.summary)}</p>` : ''}
         ${st.points && st.points.length ? `<ul>${st.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
         ${st.type === 'toolkit' ? (CV.skillGroups || []).map((g) => `<p class="group"><b>${esc(g.label)}:</b> ${g.items.map(esc).join(', ')}</p>`).join('') : ''}
         ${chips ? `<p class="label">Skill crystals in orbit</p><div class="chips">${chips}</div>` : ''}
         <p class="hint">Planet ${i + 1} of ${CV.stages.length}</p>`,
        [['Take off ▶', () => this.closeModal(), 'primary']]
      );
    },

    contactLinks() {
      const c = CV.contact || {};
      return [
        c.email && ['✉️ Email', 'mailto:' + c.email],
        c.linkedin && ['💼 LinkedIn', c.linkedin],
        c.github && ['⌨️ GitHub', c.github],
        c.website && ['🌐 Website', c.website],
      ].filter(Boolean);
    },

    showGoal() {
      const links = this.contactLinks()
        .map(([l, h]) => `<a class="btn" href="${esc(h)}" target="_blank" rel="noopener">${esc(l)}</a>`)
        .join('');
      $('#modal .card').style.setProperty('--c', '#fbbf24');
      this.openModal(
        `<div class="badge">🏆 Mission complete</div>
         <h2>Thanks for flying!</h2>
         <p>You landed on <b>${progress.visited.size}/${CV.stages.length}</b> planets and collected
            <b>${progress.coins}/${progress.totalCoins}</b> skill crystals.</p>
         ${CV.rightToWork ? `<p>✅ ${esc(CV.rightToWork)}</p>` : ''}
         <p class="label">Get in touch${CV.contact && CV.contact.location ? ' · ' + esc(CV.contact.location) : ''}</p>
         <div class="links">${links}</div>`,
        [
          ['📄 Classic CV', () => { this.closeModal(); this.openClassic(); }],
          ['↺ Fly again', () => { this.closeModal(); scene.travelTo(scene.start.x, scene.start.y); }],
          ['Close', () => this.closeModal(), 'primary'],
        ]
      );
    },

    bindTouch() {
      document.querySelectorAll('#touch button').forEach((b) => {
        const k = b.dataset.k;
        const down = (e) => { e.preventDefault(); touch[k] = true; b.classList.add('on'); };
        const up = (e) => { e.preventDefault(); if (k === 'boost') touch[k] = false; b.classList.remove('on'); };
        b.addEventListener('pointerdown', down);
        ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => b.addEventListener(ev, up));
      });
    },

    buildClassic() {
      const c = CV.contact || {};
      const section = (type, heading) => {
        const items = CV.stages.filter((s) => (TYPES[s.type] ? s.type : 'work') === type).slice().reverse();
        if (!items.length) return '';
        return `<h2>${heading}</h2>` + items.map((s) => `
          <div class="entry">
            <div class="row"><b>${esc(s.title)}</b><span>${esc(s.period)}</span></div>
            <div class="org">${esc(s.org)}${s.location ? ' · ' + esc(s.location) : ''}</div>
            ${s.summary ? `<p>${esc(s.summary)}</p>` : ''}
            ${s.points && s.points.length ? `<ul>${s.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
            ${s.skills && s.skills.length ? `<p class="skills">${s.skills.map(esc).join(' · ')}</p>` : ''}
          </div>`).join('');
      };
      const allSkills = [...new Set(CV.stages.flatMap((s) => s.skills || []))];
      const contact = [c.email && `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`, c.location && esc(c.location),
        ...['linkedin', 'github', 'website'].filter((k) => c[k]).map((k) => `<a href="${esc(c[k])}">${esc(c[k].replace(/^https?:\/\//, ''))}</a>`)]
        .filter(Boolean).join(' · ');
      $('#doc').innerHTML = `
        <h1>${esc(CV.name)}</h1>
        <p class="role">${esc(CV.title)}</p>
        <p class="contact">${contact}</p>
        ${CV.rightToWork ? `<p class="contact"><b>Right to work:</b> ${esc(CV.rightToWork)}</p>` : ''}
        ${CV.summary ? `<h2>Professional Summary</h2><p>${esc(CV.summary)}</p>` : ''}
        ${CV.skillGroups ? `<h2>Technical Skills</h2>${CV.skillGroups.map((g) => `<p class="group"><b>${esc(g.label)}:</b> ${g.items.map(esc).join(', ')}</p>`).join('')}`
          : allSkills.length ? `<h2>Skills</h2><p>${allSkills.map(esc).join(' · ')}</p>` : ''}
        ${section('work', 'Professional Experience')}
        ${section('project', 'Research')}
        ${section('education', 'Education')}
        ${(CV.extras || []).map((x) => `<h2>${esc(x.label)}</h2><p>${x.items.map(esc).join(' · ')}</p>`).join('')}`;
    },

    openClassic() {
      $('#classic').classList.remove('hidden');
      $('#classic').scrollTop = 0;
      scene.lock();
      scene.input.keyboard.enabled = false;
      scene.input.keyboard.disableGlobalCapture(); // let arrows/space scroll the page
    },

    closeClassic() {
      $('#classic').classList.add('hidden');
      scene.input.keyboard.enabled = true;
      scene.input.keyboard.enableGlobalCapture();
      scene.unlock();
    },
  };

  // Start once the display font is ready so canvas text renders in it.
  // The canvas is sized in device pixels and shown at 1/DPR so everything stays sharp on retina screens.
  const fontReady = document.fonts ? document.fonts.load(`700 20px Orbitron`) : Promise.resolve();
  Promise.race([fontReady, new Promise((r) => setTimeout(r, 2000))]).then(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      backgroundColor: '#030712',
      antialias: true,
      physics: { default: 'arcade', arcade: { debug: false } },
      scale: { mode: Phaser.Scale.NONE, width: innerWidth * DPR, height: innerHeight * DPR, zoom: 1 / DPR },
      audio: { noAudio: true },
      scene: [Space],
    });
    window.addEventListener('resize', () => game.scale.resize(innerWidth * DPR, innerHeight * DPR));
  });
})();
