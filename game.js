(() => {
  'use strict';

  const CV = window.CV;
  const W = 960, H = 540, GROUND_Y = H - 64;
  const START_W = 760, STAGE_W = 1000, END_W = 700;
  const SPEED = 250, JUMP = 680;
  const FONT = '"Press Start 2P", monospace';
  const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches;
  const TYPES = {
    education: { tex: 'school', icon: '🎓', label: 'Education' },
    work: { tex: 'office', icon: '💼', label: 'Experience' },
    project: { tex: 'lab', icon: '🔬', label: 'Research' },
    toolkit: { tex: 'tools', icon: '🧰', label: 'Toolkit' },
  };
  const typeOf = (st) => TYPES[st.type] || TYPES.work;

  const $ = (s) => document.querySelector(s);
  const esc = (s = '') =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const font = (size, color = '#ffffff') => ({
    fontFamily: FONT, fontSize: size + 'px', color, align: 'center', stroke: '#0f172a', strokeThickness: 4,
  });

  const touch = { left: false, right: false, jump: false, action: false };
  const progress = { visited: new Set(), coins: 0, totalCoins: 0, skills: new Set() };
  let scene = null;

  // ------------------------------------------------------------------
  // Pixel art
  // ------------------------------------------------------------------
  const PLAYER_PAL = { H: '#3b2a1a', S: '#f1c27d', E: '#1a1a1a', T: '#2563eb', P: '#1f2937', B: '#111111' };
  const BODY = [
    '....HHHHH...',
    '...HHHHHHH..',
    '...HHSSSSS..',
    '...HSSSESS..',
    '...SSSSSSS..',
    '....SSSSS...',
    '...TTTTTTT..',
    '..TTTTTTTTT.',
    '..STTTTTTTS.',
    '..STTTTTTTS.',
    '....TTTTT...',
  ];
  const LEGS = {
    idle: ['....PPPPP...', '....PP.PP...', '....PP.PP...', '....PP.PP...', '...BBB.BBB..'],
    run: ['....PPPPP...', '...PP..PP...', '..PP....PP..', '..P......P..', '.BB......BB.'],
    jump: ['....PPPPP...', '...PP..PP...', '...PP..PP...', '...BB..BB...', '............'],
  };
  const PLAYER_FRAMES = [BODY.concat(LEGS.idle), BODY.concat(LEGS.run), BODY.concat(LEGS.jump)];

  function pixelTexture(sc, key, frames, pal, scale) {
    const fw = frames[0][0].length * scale, fh = frames[0].length * scale;
    const tex = sc.textures.createCanvas(key, fw * frames.length, fh);
    const ctx = tex.getContext();
    frames.forEach((rows, f) =>
      rows.forEach((row, y) =>
        [...row].forEach((c, x) => {
          if (c === '.') return;
          ctx.fillStyle = pal[c];
          ctx.fillRect(f * fw + x * scale, y * scale, scale, scale);
        })
      )
    );
    frames.forEach((_, f) => tex.add(f, 0, f * fw, 0, fw, fh));
    tex.refresh();
  }

  function gfxTexture(sc, key, w, h, draw) {
    const g = sc.make.graphics({}, false);
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  function makeTextures(sc) {
    pixelTexture(sc, 'player', PLAYER_FRAMES, PLAYER_PAL, 3);

    gfxTexture(sc, 'ground', 32, 64, (g) => {
      g.fillStyle(0x8b5a2b).fillRect(0, 0, 32, 64);
      g.fillStyle(0x6f4520).fillRect(4, 16, 4, 4).fillRect(20, 23, 4, 4).fillRect(13, 27, 3, 3).fillRect(8, 40, 4, 4).fillRect(24, 50, 3, 3);
      g.fillStyle(0x4ade80).fillRect(0, 0, 32, 9);
      g.fillStyle(0x22c55e).fillRect(0, 8, 32, 3).fillRect(5, 11, 3, 2).fillRect(19, 11, 3, 3);
    });
    gfxTexture(sc, 'platform', 32, 16, (g) => {
      g.fillStyle(0xa16207).fillRect(0, 0, 32, 16);
      g.fillStyle(0xca8a04).fillRect(0, 0, 32, 4);
      g.fillStyle(0x713f12).fillRect(0, 13, 32, 3).fillRect(15, 4, 2, 9);
    });
    gfxTexture(sc, 'coin', 20, 20, (g) => {
      g.fillStyle(0xb45309).fillCircle(10, 10, 10);
      g.fillStyle(0xfacc15).fillCircle(10, 10, 8);
      g.fillStyle(0xeab308).fillRect(9, 5, 3, 10);
      g.fillStyle(0xfef9c3).fillRect(5, 5, 2, 5);
    });
    gfxTexture(sc, 'spark', 6, 6, (g) => g.fillStyle(0xffffff).fillRect(0, 0, 6, 6));
    gfxTexture(sc, 'post', 14, 64, (g) => {
      g.fillStyle(0x713f12).fillRect(5, 10, 4, 54);
      g.fillStyle(0xa16207).fillRect(0, 0, 14, 12);
    });

    gfxTexture(sc, 'school', 200, 180, (g) => {
      g.fillStyle(0xb45309).fillRect(20, 70, 160, 110);
      g.fillStyle(0x9a3412);
      for (let y = 80; y < 180; y += 12) g.fillRect(20, y, 160, 2);
      g.fillStyle(0x7f1d1d).fillTriangle(5, 75, 100, 18, 195, 75);
      g.fillStyle(0xfef3c7).fillCircle(100, 54, 12);
      g.fillStyle(0x1f2937).fillRect(99, 45, 2, 10).fillRect(99, 53, 7, 2);
      g.fillStyle(0xe5e7eb).fillRect(98, 0, 3, 20);
      g.fillStyle(0x2563eb).fillRect(101, 1, 18, 11);
      g.fillStyle(0xbfdbfe).fillRect(38, 92, 30, 26).fillRect(132, 92, 30, 26).fillRect(38, 136, 30, 26).fillRect(132, 136, 30, 26);
      g.fillStyle(0x451a03).fillRect(82, 122, 36, 58);
      g.fillStyle(0xfacc15).fillRect(110, 150, 4, 4);
    });

    gfxTexture(sc, 'office', 170, 260, (g) => {
      g.fillStyle(0x1e293b).fillRect(10, 20, 150, 240);
      g.fillStyle(0x334155).fillRect(0, 12, 170, 12);
      g.fillStyle(0x94a3b8).fillRect(82, 0, 4, 12);
      g.fillStyle(0xef4444).fillRect(80, 0, 8, 4);
      for (let y = 36; y < 210; y += 30)
        for (let c = 0; c < 4; c++) {
          const r = rnd();
          g.fillStyle(r < 0.45 ? 0xfde68a : r < 0.75 ? 0x7dd3fc : 0x475569).fillRect(22 + c * 35, y, 24, 18);
        }
      g.fillStyle(0x0f172a).fillRect(60, 214, 50, 46);
      g.fillStyle(0x38bdf8).fillRect(64, 218, 20, 42).fillRect(86, 218, 20, 42);
    });

    gfxTexture(sc, 'lab', 200, 150, (g) => {
      g.fillStyle(0x0f766e).fillRect(10, 50, 180, 100);
      g.fillStyle(0x134e4a).fillRect(0, 40, 200, 14);
      g.fillStyle(0x99f6e4).fillRect(28, 78, 84, 72);
      g.fillStyle(0x5eead4);
      for (let y = 88; y < 150; y += 12) g.fillRect(28, y, 84, 3);
      g.fillStyle(0xfde68a).fillRect(130, 78, 44, 32);
      g.fillStyle(0x713f12).fillRect(150, 22, 4, 18);
      g.fillStyle(0xfacc15).fillCircle(152, 20, 15);
      g.fillStyle(0x134e4a).fillCircle(152, 20, 6);
    });

    gfxTexture(sc, 'tools', 200, 170, (g) => {
      g.fillStyle(0x6d28d9).fillRect(14, 60, 172, 110);
      g.fillStyle(0x4c1d95).fillTriangle(0, 66, 100, 20, 200, 66);
      g.fillStyle(0x5b21b6);
      for (let x = 14; x < 186; x += 16) g.fillRect(x, 66, 3, 104);
      g.fillStyle(0x1e1b4b).fillRect(76, 110, 48, 60);
      g.fillStyle(0xfde68a).fillRect(30, 90, 30, 24).fillRect(140, 90, 30, 24);
      g.fillStyle(0xcbd5e1).fillRect(92, 0, 12, 40).fillCircle(98, 6, 12);
      g.fillStyle(0x4c1d95).fillRect(94, -6, 8, 12);
    });

    gfxTexture(sc, 'goal', 260, 240, (g) => {
      g.fillStyle(0x94a3b8).fillRect(30, 80, 200, 160);
      g.fillStyle(0x64748b).fillRect(0, 40, 60, 200).fillRect(200, 40, 60, 200);
      g.fillStyle(0x64748b);
      for (let x = 30; x < 230; x += 20) g.fillRect(x, 68, 12, 12);
      [0, 23, 46, 200, 223, 246].forEach((x) => g.fillRect(x, 28, 14, 12));
      g.fillStyle(0x1e293b).fillRect(100, 170, 60, 70).fillCircle(130, 170, 30);
      g.fillStyle(0xfde68a).fillRect(22, 90, 16, 24).fillRect(222, 90, 16, 24).fillRect(70, 110, 16, 24).fillRect(174, 110, 16, 24);
      g.fillStyle(0xe5e7eb).fillRect(128, 10, 4, 70);
      g.fillStyle(0xfacc15).fillTriangle(132, 10, 172, 22, 132, 34);
    });
  }

  function drawBackground(sc, worldW) {
    const sky = sc.add.graphics().setScrollFactor(0).setDepth(-10);
    sky.fillGradientStyle(0x60a5fa, 0x60a5fa, 0xdbeafe, 0xdbeafe, 1).fillRect(0, 0, W, H);
    sky.fillStyle(0xfef08a).fillCircle(800, 110, 40);

    const layer = (factor, depth, draw) => {
      const g = sc.add.graphics().setScrollFactor(factor, 1).setDepth(depth);
      draw(g, W + (worldW - W) * factor + 200);
    };
    layer(0.12, -9, (g, w) => {
      g.fillStyle(0x93a8d6);
      g.beginPath().moveTo(0, GROUND_Y);
      for (let x = 0; x <= w; x += 140) g.lineTo(x, GROUND_Y - 170 - rnd() * 130).lineTo(x + 70, GROUND_Y - 90 - rnd() * 60);
      g.lineTo(w, GROUND_Y).closePath().fillPath();
    });
    layer(0.3, -8, (g, w) => {
      g.fillStyle(0xffffff, 0.9);
      for (let x = 80; x < w; x += 260 + rnd() * 200) {
        const y = 70 + rnd() * 110;
        g.fillCircle(x, y, 22).fillCircle(x + 26, y - 10, 28).fillCircle(x + 56, y, 22).fillRect(x, y, 56, 22);
      }
    });
    layer(0.5, -7, (g, w) => {
      g.fillStyle(0x4d9b6a);
      for (let x = 0; x < w; x += 150) g.fillCircle(x, GROUND_Y + 40, 90 + rnd() * 70);
    });
  }

  // ------------------------------------------------------------------
  // Scene
  // ------------------------------------------------------------------
  class Level extends Phaser.Scene {
    constructor() { super('level'); }

    create() {
      scene = this;
      makeTextures(this);
      const stages = CV.stages || [];
      this.worldW = START_W + stages.length * STAGE_W + END_W;
      this.physics.world.setBounds(0, 0, this.worldW, H + 200);
      this.cameras.main.setBounds(0, 0, this.worldW, H);
      drawBackground(this, this.worldW);

      this.solids = [];
      this.coins = [];
      this.buildings = [];

      const ground = this.add.tileSprite(this.worldW / 2, GROUND_Y + 32, this.worldW, 64, 'ground');
      this.physics.add.existing(ground, true);
      this.solids.push(ground);

      // Welcome sign
      this.add
        .text(380, 120, `Hi, I'm ${CV.name}!\n\n${CV.title}\n\nWalk right to explore\nmy journey  >>>`, font(14))
        .setOrigin(0.5, 0)
        .setLineSpacing(6)
        .setBackgroundColor('#0f172acc')
        .setPadding(18, 16);

      stages.forEach((st, i) => this.buildStage(st, i, START_W + i * STAGE_W));

      // Goal
      const gx = START_W + stages.length * STAGE_W + 360;
      const goal = this.add.image(gx, GROUND_Y, 'goal').setOrigin(0.5, 1).setDepth(1).setInteractive({ useHandCursor: true });
      goal.on('pointerdown', () => this.openGoal());
      this.add.text(gx, GROUND_Y - goal.height - 14, "LET'S TALK!", font(14, '#facc15')).setOrigin(0.5, 1);
      this.goal = { x: gx, half: goal.width / 2, img: goal };

      // Player
      this.player = this.physics.add.sprite(140, GROUND_Y - 60, 'player', 0).setDepth(5);
      this.player.body.setSize(24, 46).setOffset(6, 2);
      this.player.setCollideWorldBounds(true);
      this.physics.add.collider(this.player, this.solids);
      this.anims.create({ key: 'run', frames: [{ key: 'player', frame: 1 }, { key: 'player', frame: 0 }], frameRate: 9, repeat: -1 });

      this.cameras.main.startFollow(this.player, true, 0.12, 0.12).setFollowOffset(-140, 0);

      this.prompt = this.add.text(0, 0, '', font(10, '#facc15')).setOrigin(0.5).setDepth(6).setVisible(false);
      this.tweens.add({ targets: this.prompt, scale: 1.12, duration: 450, yoyo: true, repeat: -1 });

      this.coinFx = this.add.particles(0, 0, 'spark', {
        speed: { min: 60, max: 200 }, lifespan: 500, gravityY: 300, scale: { start: 1, end: 0 },
        tint: [0xfacc15, 0xfde68a, 0xffffff], emitting: false,
      }).setDepth(7);
      this.confetti = this.add.particles(0, 0, 'spark', {
        speed: { min: 200, max: 520 }, angle: { min: 210, max: 330 }, lifespan: 1800, gravityY: 500,
        rotate: { min: 0, max: 360 }, scale: { start: 1.6, end: 0.4 },
        tint: [0xfacc15, 0xef4444, 0x22c55e, 0x3b82f6, 0xa855f7], emitting: false,
      }).setDepth(7);

      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys('W,A,D,E,ENTER');
      this.lastGround = this.jumpBuffer = -1e9;
      this.cooldown = 0;

      progress.totalCoins = this.coins.length;
      this.locked = true;
      this.physics.pause();
      UI.init(this);
    }

    buildStage(st, i, x0) {
      const meta = typeOf(st);
      const year = String(st.period || '').split(/[–—-]/)[0].trim();
      if (year) this.add.image(x0 + 20, GROUND_Y, 'post').setOrigin(0.5, 1);
      if (year) this.add.text(x0 + 20, GROUND_Y - 74, year, font(10)).setOrigin(0.5, 1);

      this.platform(x0 + 190, GROUND_Y - 115, 176);
      this.platform(x0 + 390, GROUND_Y - 215, 176);

      const b = this.add.image(x0 + 690, GROUND_Y, meta.tex).setOrigin(0.5, 1).setDepth(1).setInteractive({ useHandCursor: true });
      b.on('pointerdown', () => this.openStage(i));
      this.add
        .text(b.x, GROUND_Y - b.height - 14, [st.org, st.period].filter(Boolean).join('\n'), { ...font(10), wordWrap: { width: 260 } })
        .setOrigin(0.5, 1)
        .setLineSpacing(6)
        .setBackgroundColor('#0f172acc')
        .setPadding(10, 8);
      this.buildings.push({ x: b.x, half: b.width / 2, idx: i, img: b });

      // Ordered so neighbouring coins alternate label heights; extra skills fall back to a ground row
      const G = GROUND_Y - 40, P1 = GROUND_Y - 150, P2 = GROUND_Y - 250;
      const slots = [
        [x0 + 70, G], [x0 + 120, P1], [x0 + 190, P1], [x0 + 260, P1], [x0 + 320, P2], [x0 + 390, P2], [x0 + 460, P2],
        [x0 + 500, G], [x0 + 560, G], [x0 + 290, GROUND_Y - 80], [x0 + 420, GROUND_Y - 90], [x0 + 615, G],
      ];
      (st.skills || []).forEach((name, k) => {
        const [cx, cy] = slots[k] || [x0 + 675 + (k - slots.length) * 60, G];
        const img = this.add.image(cx, cy, 'coin').setDepth(4);
        const label = this.add.text(cx, cy - (k % 2 ? 46 : 20), name, font(7)).setOrigin(0.5, 1).setDepth(4);
        this.tweens.add({ targets: [img, label], y: '-=7', duration: 700 + rnd() * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        this.coins.push({ img, label, name, taken: false });
      });
    }

    platform(x, y, w) {
      const p = this.add.tileSprite(x, y, w, 16, 'platform');
      this.physics.add.existing(p, true);
      Object.assign(p.body.checkCollision, { down: false, left: false, right: false });
      this.solids.push(p);
    }

    readInput() {
      const JD = Phaser.Input.Keyboard.JustDown, c = this.cursors, k = this.keys;
      const jump = [c.up, c.space, k.W].map(JD).includes(true) || touch.jump;
      const act = [k.E, k.ENTER].map(JD).includes(true) || touch.action;
      touch.jump = touch.action = false;
      return {
        left: c.left.isDown || k.A.isDown || touch.left,
        right: c.right.isDown || k.D.isDown || touch.right,
        jump, act,
      };
    }

    update(time) {
      const input = this.readInput(); // always read so presses during a dialog don't leak out afterwards
      if (this.locked) return;
      const p = this.player;

      const onGround = p.body.blocked.down || p.body.touching.down;
      if (onGround) this.lastGround = time;
      if (input.jump) this.jumpBuffer = time;
      if (time - this.jumpBuffer < 130 && time - this.lastGround < 110) {
        p.setVelocityY(-JUMP);
        this.jumpBuffer = this.lastGround = -1e9;
      }

      const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      p.setVelocityX(dir * SPEED);
      if (dir) p.setFlipX(dir < 0);
      if (!onGround) { p.anims.stop(); p.setFrame(2); }
      else if (dir) p.anims.play('run', true);
      else { p.anims.stop(); p.setFrame(0); }

      for (const c of this.coins) {
        if (!c.taken && Phaser.Math.Distance.Between(p.x, p.y, c.img.x, c.img.y) < 36) this.collect(c);
      }

      const near = this.buildings.find((b) => Math.abs(p.x - b.x) < b.half * 0.7);
      const atGoal = Math.abs(p.x - this.goal.x) < this.goal.half * 0.6;
      if ((near || atGoal) && onGround) {
        this.prompt.setText(IS_TOUCH ? 'TAP E TO ENTER' : 'PRESS E TO ENTER').setPosition(p.x, p.y - 56).setVisible(true);
        if (input.act && time > this.cooldown) atGoal ? this.openGoal() : this.openStage(near.idx);
      } else {
        this.prompt.setVisible(false);
      }

      UI.moveMarker(p.x / this.worldW);
    }

    collect(c) {
      c.taken = true;
      this.tweens.killTweensOf([c.img, c.label]);
      this.coinFx.explode(14, c.img.x, c.img.y);
      c.img.destroy();
      this.tweens.add({ targets: c.label, y: c.label.y - 40, alpha: 0, duration: 900, onComplete: () => c.label.destroy() });
      progress.coins++;
      progress.skills.add(c.name);
      UI.refresh();
    }

    lock() { this.locked = true; this.physics.pause(); this.prompt.setVisible(false); this.player.anims.stop(); }
    unlock() { this.locked = false; this.physics.resume(); this.cooldown = this.time.now + 250; }

    openStage(i) {
      progress.visited.add(i);
      this.lock();
      UI.showStage(i);
    }

    openGoal() {
      if (this.locked) return;
      this.lock();
      this.confetti.explode(120, this.goal.x, GROUND_Y - 200);
      this.time.delayedCall(700, () => UI.showGoal());
    }

    travelTo(x) {
      this.player.setPosition(x, GROUND_Y - 60).setVelocity(0, 0);
      this.cameras.main.centerOn(x + 140, H / 2);
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
        $('.controls').innerHTML = '<li><kbd>◀</kbd><kbd>▶</kbd> move</li><li><kbd>▲</kbd> jump</li><li><kbd>E</kbd> enter building</li>';
      }

      const tl = $('#timeline');
      sc.buildings.forEach((b) => {
        const st = CV.stages[b.idx];
        const dot = document.createElement('button');
        dot.className = 'dot ' + (st.type || 'work');
        dot.style.left = (b.x / sc.worldW) * 100 + '%';
        dot.title = `${st.org} · ${st.period || ''} — click to travel`;
        dot.onclick = () => { sc.travelTo(b.x - 180); dot.blur(); };
        tl.appendChild(dot);
        b.dot = dot;
      });
      const g = document.createElement('button');
      g.className = 'dot goal';
      g.style.left = (sc.goal.x / sc.worldW) * 100 + '%';
      g.title = 'Contact — click to travel';
      g.onclick = () => { sc.travelTo(sc.goal.x - 220); g.blur(); };
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
        ? `<p>Skills collected</p><div class="chips">${got.map((s) => `<span class="chip got">${esc(s)}</span>`).join('')}</div>`
        : '<p>No skills yet — jump for the coins! 🪙</p>';
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
      this.openModal(
        `<div class="badge">${meta.icon} ${meta.label}${st.period ? ' · ' + esc(st.period) : ''}</div>
         <h2>${esc(st.title)}</h2>
         <h3>${esc(st.org)}${st.location ? ' · ' + esc(st.location) : ''}</h3>
         ${st.summary ? `<p>${esc(st.summary)}</p>` : ''}
         ${st.points && st.points.length ? `<ul>${st.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
         ${st.type === 'toolkit' ? (CV.skillGroups || []).map((g) => `<p class="group"><b>${esc(g.label)}:</b> ${g.items.map(esc).join(', ')}</p>`).join('') : ''}
         ${chips ? `<p class="label">Skills unlocked here</p><div class="chips">${chips}</div>` : ''}
         <p class="hint">Level ${i + 1} of ${CV.stages.length}</p>`,
        [['Continue ▶', () => this.closeModal(), 'primary']]
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
      this.openModal(
        `<div class="badge">🏆 Quest complete</div>
         <h2>Thanks for playing!</h2>
         <p>You explored <b>${progress.visited.size}/${CV.stages.length}</b> levels and collected
            <b>${progress.coins}/${progress.totalCoins}</b> skill coins.</p>
         ${CV.rightToWork ? `<p>✅ ${esc(CV.rightToWork)}</p>` : ''}
         <p class="label">Get in touch${CV.contact && CV.contact.location ? ' · ' + esc(CV.contact.location) : ''}</p>
         <div class="links">${links}</div>`,
        [
          ['📄 Classic CV', () => { this.closeModal(); this.openClassic(); }],
          ['↺ Play again', () => { this.closeModal(); scene.travelTo(140); }],
          ['Close', () => this.closeModal(), 'primary'],
        ]
      );
    },

    bindTouch() {
      document.querySelectorAll('#touch button').forEach((b) => {
        const k = b.dataset.k;
        const down = (e) => { e.preventDefault(); touch[k] = true; b.classList.add('on'); };
        const up = (e) => { e.preventDefault(); if (k === 'left' || k === 'right') touch[k] = false; b.classList.remove('on'); };
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

  // Start once the pixel font is ready so canvas text renders in it
  const fontReady = document.fonts ? document.fonts.load(`16px ${FONT}`) : Promise.resolve();
  Promise.race([fontReady, new Promise((r) => setTimeout(r, 2000))]).then(() => {
    new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      width: W,
      height: H,
      pixelArt: true,
      backgroundColor: '#93c5fd',
      physics: { default: 'arcade', arcade: { gravity: { y: 1500 }, debug: false } },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      audio: { noAudio: true },
      scene: [Level],
    });
  });
})();
