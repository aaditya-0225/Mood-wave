//  Mood Wave — Multi-Mode Biometric Visualizer

(() => {
  'use strict';

  // ── Canvas Setup ──────────────────────────────
  const canvas = document.getElementById('artCanvas');
  const ctx = canvas.getContext('2d');
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth * devicePixelRatio;
    H = canvas.height = window.innerHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
  }

  window.addEventListener('resize', resize);
  resize();

  // ── Simplex Noise ──────────────────────────────
  const GRAD = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  const PERM = new Uint8Array(512);
  {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
  }

  function noise2D(x, y) {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const X0 = i - t, Y0 = j - t;
    const x0 = x - X0, y0 = y - Y0;
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0*x0 - y0*y0;
    if (t0 > 0) { t0 *= t0; const g = GRAD[PERM[ii + PERM[jj]] & 7]; n0 = t0 * t0 * (g[0]*x0 + g[1]*y0); }
    let t1 = 0.5 - x1*x1 - y1*y1;
    if (t1 > 0) { t1 *= t1; const g = GRAD[PERM[ii+i1 + PERM[jj+j1]] & 7]; n1 = t1 * t1 * (g[0]*x1 + g[1]*y1); }
    let t2 = 0.5 - x2*x2 - y2*y2;
    if (t2 > 0) { t2 *= t2; const g = GRAD[PERM[ii+1 + PERM[jj+1]] & 7]; n2 = t2 * t2 * (g[0]*x2 + g[1]*y2); }
    return 70 * (n0 + n1 + n2);
  }

  // ── Biometric Engine ──────────────────────────
  const bio = {
    hr: 72, hrTarget: 72, stress: 20, stressTarget: 20,
    currMode: 1,
    lastBeat: 0, beatPhase: 0,
    isExternal: false,

    update(dt) {
      const t = performance.now() / 1000;
      if (!this.isExternal) {
        this.hrTarget = 65 + Math.sin(t * 0.1) * 20 + Math.sin(t * 0.5) * 5;
        this.stressTarget = 20 + Math.sin(t * 0.07) * 40;
      }
      const smoothing = 1 - Math.pow(0.005, dt);
      this.hr += (this.hrTarget - this.hr) * smoothing;
      this.stress += (this.stressTarget - this.stress) * smoothing;
      
      const beatInt = 60 / this.hr * 1000;
      if (performance.now() - this.lastBeat >= beatInt) {
        this.lastBeat = performance.now();
        this.beatPhase = 1;
      } else {
        this.beatPhase *= 0.9;
      }
    },
    get hrNorm() { return (this.hr - 50) / 130; },
    get strNorm() { return this.stress / 100; },
    get intensity() { return (this.hrNorm + this.strNorm) / 2; }
  };

  window.setBiometrics = (hr, stress) => {
    if (hr) { bio.hrTarget = hr; bio.isExternal = true; }
    if (stress !== undefined) { bio.stressTarget = stress; bio.isExternal = true; }
  };

  if (typeof io !== 'undefined') {
    const socket = io();
    socket.on('biometrics', d => window.setBiometrics(d.hr, d.stress));
    socket.on('modeChange', d => bio.currMode = d.mode);
  }

  // ── Color Palettes ────────────────────────────
  function getModePalette() {
    const i = bio.intensity;
    const hueBase = (240 + i * 200) % 360;
    return {
      main: `hsla(${hueBase}, ${70 + i * 30}%, ${50 + i * 15}%, 1)`,
      glow: `hsla(${hueBase}, 80%, 60%, 0.5)`,
      bg: `hsla(${hueBase}, 40%, 5%, 1)`,
      hue: hueBase
    };
  }

  // ── Renderers ─────────────────────────────────

  // MODE 1: CALM / FLOW — Dense layered particle flow with glowing depth
  const particles = Array.from({length: 3000}, () => ({
    x: Math.random() * 2000, y: Math.random() * 2000,
    px: 0, py: 0, speed: 0.3 + Math.random() * 2,
    life: Math.random(), layer: Math.floor(Math.random() * 3),
    hueOff: Math.random() * 40 - 20,
    reset() { this.x = Math.random() * W; this.y = Math.random() * H; this.px = this.x; this.py = this.y; this.life = 1; }
  }));

  function renderFlow(ctx, dt, pal) {
    ctx.fillStyle = 'rgba(2, 2, 8, 0.08)';
    ctx.fillRect(0, 0, W, H);

    const t = performance.now() * 0.0001;
    ctx.lineCap = 'round';

    // Background glow
    const glowX = W/2 + Math.sin(t * 8) * W * 0.2;
    const glowY = H/2 + Math.cos(t * 6) * H * 0.2;
    const bgGlow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, W * 0.4);
    bgGlow.addColorStop(0, `hsla(${pal.hue + 30}, 80%, 40%, 0.03)`);
    bgGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, W, H);

    particles.forEach(p => {
      const scale = [0.001, 0.002, 0.004][p.layer];
      const speedMult = [0.6, 1, 1.6][p.layer];
      const angle = noise2D(p.x * scale, p.y * scale + t * 2) * Math.PI * 4;
      p.px = p.x; p.py = p.y;
      const vel = p.speed * speedMult * (1 + bio.hrNorm * 2.5);
      p.x += Math.cos(angle) * vel;
      p.y += Math.sin(angle) * vel;
      p.life -= 0.003;
      if (p.life <= 0 || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) p.reset();

      const alpha = p.life * [0.3, 0.5, 0.7][p.layer];
      const lightness = 50 + p.layer * 10;
      ctx.strokeStyle = `hsla(${pal.hue + p.hueOff}, 85%, ${lightness}%, ${alpha})`;
      ctx.lineWidth = [0.5, 1.2, 2.5][p.layer] + bio.strNorm * 1.5;
      ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
    });
  }

  // MODE 2: FOCUSED / PULSE — Sacred geometry with rotating polygons
  const pulseRings = [];
  function renderPulse(ctx, dt, pal) {
    ctx.fillStyle = 'rgba(3, 3, 12, 0.12)';
    ctx.fillRect(0, 0, W, H);
    const t = performance.now() * 0.001;

    // Central glow
    const coreGlow = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, 200 + bio.beatPhase * 80);
    coreGlow.addColorStop(0, `hsla(${pal.hue}, 100%, 70%, ${0.15 + bio.beatPhase * 0.2})`);
    coreGlow.addColorStop(0.5, `hsla(${pal.hue + 20}, 80%, 50%, 0.05)`);
    coreGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGlow;
    ctx.fillRect(0, 0, W, H);

    if (bio.beatPhase > 0.9) {
      pulseRings.push({ r: 10, a: 1, sides: [3, 4, 5, 6, 8][Math.floor(Math.random() * 5)], rot: Math.random() * Math.PI });
    }
    
    pulseRings.forEach((ring, i) => {
      ring.r += (4 + bio.hrNorm * 12);
      ring.a -= 0.008;
      ring.rot += 0.005;
      if (ring.a <= 0) { pulseRings.splice(i, 1); return; }

      // Draw polygon ring
      ctx.strokeStyle = `hsla(${pal.hue + ring.r * 0.3}, 80%, 60%, ${ring.a * 0.8})`;
      ctx.lineWidth = 1.5 + bio.strNorm * 3;
      ctx.beginPath();
      for (let j = 0; j <= ring.sides; j++) {
        const ang = (j / ring.sides) * Math.PI * 2 + ring.rot + t * 0.2;
        const px = W/2 + Math.cos(ang) * ring.r;
        const py = H/2 + Math.sin(ang) * ring.r;
        j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      // Inner connecting lines (sacred geometry)
      if (ring.r < 300 && ring.sides >= 5) {
        ctx.strokeStyle = `hsla(${pal.hue + 60}, 70%, 50%, ${ring.a * 0.2})`;
        ctx.lineWidth = 0.5;
        for (let j = 0; j < ring.sides; j++) {
          const ang1 = (j / ring.sides) * Math.PI * 2 + ring.rot + t * 0.2;
          const ang2 = ((j + 2) / ring.sides) * Math.PI * 2 + ring.rot + t * 0.2;
          ctx.beginPath();
          ctx.moveTo(W/2 + Math.cos(ang1) * ring.r, H/2 + Math.sin(ang1) * ring.r);
          ctx.lineTo(W/2 + Math.cos(ang2) * ring.r, H/2 + Math.sin(ang2) * ring.r);
          ctx.stroke();
        }
      }
    });

    // Orbiting dots
    for (let i = 0; i < 12; i++) {
      const orbitR = 60 + i * 30;
      const ang = t * (0.5 - i * 0.03) + i;
      const dx = W/2 + Math.cos(ang) * orbitR;
      const dy = H/2 + Math.sin(ang) * orbitR;
      const dotGlow = ctx.createRadialGradient(dx, dy, 0, dx, dy, 8 + bio.beatPhase * 6);
      dotGlow.addColorStop(0, `hsla(${pal.hue + i * 15}, 90%, 70%, 0.8)`);
      dotGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = dotGlow;
      ctx.beginPath(); ctx.arc(dx, dy, 8 + bio.beatPhase * 6, 0, Math.PI * 2); ctx.fill();
    }
  }

  // MODE 3: HAPPY / FLUID — Lava lamp metaballs with organic tendrils
  const blobs = Array.from({length: 10}, (_, i) => ({
    x: Math.random(), y: Math.random(),
    vx: (Math.random() - 0.5) * 0.002,
    vy: (Math.random() - 0.5) * 0.002,
    r: 80 + Math.random() * 120,
    hueOff: i * 25, phase: i * 0.7
  }));

  function renderFluid(ctx, dt, pal) {
    ctx.fillStyle = 'rgba(3, 3, 12, 0.04)';
    ctx.fillRect(0, 0, W, H);
    const t = performance.now() * 0.001;

    // Animate blobs
    blobs.forEach(b => {
      b.x += b.vx + Math.sin(t * 0.3 + b.phase) * 0.001;
      b.y += b.vy + Math.cos(t * 0.25 + b.phase) * 0.001;
      if (b.x < 0.05 || b.x > 0.95) b.vx *= -1;
      if (b.y < 0.05 || b.y > 0.95) b.vy *= -1;
      b.x = Math.max(0.02, Math.min(0.98, b.x));
      b.y = Math.max(0.02, Math.min(0.98, b.y));
    });

    // Draw blobs with layered radial gradients
    blobs.forEach((b, i) => {
      const cx = b.x * W;
      const cy = b.y * H;
      const radius = b.r * (1 + bio.strNorm * 0.8 + Math.sin(t + b.phase) * 0.2);

      // Outer glow
      const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.5);
      g1.addColorStop(0, `hsla(${pal.hue + b.hueOff}, 90%, 60%, 0.12)`);
      g1.addColorStop(0.5, `hsla(${pal.hue + b.hueOff + 20}, 80%, 50%, 0.06)`);
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1;
      ctx.beginPath(); ctx.arc(cx, cy, radius * 1.5, 0, Math.PI * 2); ctx.fill();

      // Inner core
      const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.6);
      g2.addColorStop(0, `hsla(${pal.hue + b.hueOff}, 100%, 75%, 0.25)`);
      g2.addColorStop(1, `hsla(${pal.hue + b.hueOff}, 90%, 55%, 0.05)`);
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2); ctx.fill();
    });

    // Organic tendrils connecting nearby blobs
    ctx.lineWidth = 0.8;
    for (let i = 0; i < blobs.length; i++) {
      for (let j = i + 1; j < blobs.length; j++) {
        const dx = (blobs[i].x - blobs[j].x) * W;
        const dy = (blobs[i].y - blobs[j].y) * H;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 300) {
          const alpha = (1 - dist / 300) * 0.15;
          ctx.strokeStyle = `hsla(${pal.hue + blobs[i].hueOff}, 80%, 60%, ${alpha})`;
          const cpx = (blobs[i].x + blobs[j].x) / 2 * W + noise2D(i + j, t * 0.2) * 60;
          const cpy = (blobs[i].y + blobs[j].y) / 2 * H + noise2D(j, t * 0.2) * 60;
          ctx.beginPath();
          ctx.moveTo(blobs[i].x * W, blobs[i].y * H);
          ctx.quadraticCurveTo(cpx, cpy, blobs[j].x * W, blobs[j].y * H);
          ctx.stroke();
        }
      }
    }

    // Floating sparkles
    for (let i = 0; i < 30; i++) {
      const sx = (noise2D(i * 0.5, t * 0.3) * 0.5 + 0.5) * W;
      const sy = (noise2D(i * 0.5 + 100, t * 0.3) * 0.5 + 0.5) * H;
      const sa = Math.sin(t * 2 + i) * 0.3 + 0.4;
      ctx.fillStyle = `hsla(${pal.hue + i * 8}, 90%, 80%, ${sa * 0.4})`;
      ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fill();
    }
  }

  // MODE 4: ENERGETIC / GRID — Full synthwave with mountains, sun & scan lines
  function renderGrid(ctx, dt, pal) {
    const t = performance.now() * 0.001;
    const speed = 1 + bio.hrNorm * 4;
    const horizon = H * 0.45;

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    skyGrad.addColorStop(0, '#020008');
    skyGrad.addColorStop(0.5, `hsla(${pal.hue - 40}, 80%, 8%, 1)`);
    skyGrad.addColorStop(1, `hsla(${pal.hue - 20}, 90%, 15%, 1)`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, horizon);

    // Ground
    const gndGrad = ctx.createLinearGradient(0, horizon, 0, H);
    gndGrad.addColorStop(0, `hsla(${pal.hue}, 80%, 10%, 1)`);
    gndGrad.addColorStop(1, '#020008');
    ctx.fillStyle = gndGrad;
    ctx.fillRect(0, horizon, W, H - horizon);

    // Sun with horizontal slices
    const sunY = horizon - 60;
    const sunR = 80 + bio.beatPhase * 15;
    for (let s = 0; s < sunR; s += 4) {
      const sliceAlpha = (s % 12 < 6) ? 0.9 : 0.3;
      const grad = ctx.createRadialGradient(W/2, sunY, s, W/2, sunY, s + 4);
      grad.addColorStop(0, `hsla(${pal.hue - 30}, 100%, 60%, ${sliceAlpha * (1 - s / sunR)})`);
      grad.addColorStop(1, `hsla(${pal.hue}, 100%, 50%, ${sliceAlpha * 0.5 * (1 - s / sunR)})`);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(W/2, sunY, s + 4, 0, Math.PI * 2); ctx.fill();
    }

    // Sun reflection glow
    const reflGrad = ctx.createRadialGradient(W/2, sunY, 0, W/2, sunY, sunR * 3);
    reflGrad.addColorStop(0, `hsla(${pal.hue - 20}, 100%, 60%, 0.15)`);
    reflGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = reflGrad;
    ctx.fillRect(0, 0, W, H);

    // Mountain silhouette
    ctx.fillStyle = `hsla(${pal.hue}, 60%, 5%, 0.9)`;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    for (let x = 0; x <= W; x += 8) {
      const mh = noise2D(x * 0.003, 1) * 80 + noise2D(x * 0.008, 2) * 30;
      ctx.lineTo(x, horizon - Math.abs(mh) - 20);
    }
    ctx.lineTo(W, horizon);
    ctx.closePath();
    ctx.fill();

    // Grid lines
    ctx.strokeStyle = `hsla(${pal.hue}, 80%, 50%, 0.25)`;
    ctx.lineWidth = 1;

    // Horizontal
    for (let i = 0; i < 25; i++) {
      const rawY = Math.pow(i / 25, 2) * (H - horizon);
      const moveY = (rawY + t * 50 * speed) % (H - horizon);
      const finalY = horizon + moveY;
      const proximity = 1 - moveY / (H - horizon);
      ctx.strokeStyle = `hsla(${pal.hue}, 80%, 50%, ${0.1 + proximity * 0.3})`;
      ctx.beginPath(); ctx.moveTo(0, finalY); ctx.lineTo(W, finalY); ctx.stroke();
    }

    // Vertical (perspective)
    ctx.strokeStyle = `hsla(${pal.hue}, 80%, 50%, 0.2)`;
    for (let i = -15; i <= 15; i++) {
      const xTop = W/2 + i * 40;
      const xBot = W/2 + i * 600;
      ctx.beginPath(); ctx.moveTo(xTop, horizon); ctx.lineTo(xBot, H); ctx.stroke();
    }

    // Scan lines overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    for (let y = 0; y < H; y += 3) {
      ctx.fillRect(0, y, W, 1);
    }

    // Side glow bars
    const barGlow = ctx.createLinearGradient(0, 0, 40, 0);
    barGlow.addColorStop(0, `hsla(${pal.hue}, 100%, 60%, ${0.05 + bio.beatPhase * 0.1})`);
    barGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = barGlow;
    ctx.fillRect(0, 0, 40, H);
    const barGlow2 = ctx.createLinearGradient(W, 0, W - 40, 0);
    barGlow2.addColorStop(0, `hsla(${pal.hue}, 100%, 60%, ${0.05 + bio.beatPhase * 0.1})`);
    barGlow2.addColorStop(1, 'transparent');
    ctx.fillStyle = barGlow2;
    ctx.fillRect(W - 40, 0, 40, H);
  }

  // MODE 5: RELAXED / AURORA — Northern lights with stars & breathing orbs
  const auroraStars = Array.from({length: 150}, () => ({
    x: Math.random(), y: Math.random() * 0.55,
    r: Math.random() * 1.8 + 0.2,
    twinkle: Math.random() * Math.PI * 2
  }));

  const auroraOrbs = Array.from({length: 10}, (_, i) => ({
    x: Math.random(), y: 0.25 + Math.random() * 0.5,
    r: 25 + Math.random() * 70,
    phase: i * 0.7, speed: 0.08 + Math.random() * 0.12
  }));

  function renderZen(ctx, dt, pal) {
    const t = performance.now() * 0.001;
    const breathe = Math.sin(t * 0.3) * 0.5 + 0.5;

    // Deep night sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#010008');
    skyGrad.addColorStop(0.3, '#030018');
    skyGrad.addColorStop(0.7, '#060028');
    skyGrad.addColorStop(1, '#0a0a30');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Stars with twinkle
    auroraStars.forEach(s => {
      const alpha = 0.2 + Math.sin(t * 0.8 + s.twinkle) * 0.4;
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, alpha)})`;
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Aurora curtains — 5 layers
    const auroraColors = [
      { h: 120, s: 85, l: 50 },
      { h: 150, s: 75, l: 48 },
      { h: 180, s: 70, l: 45 },
      { h: 260, s: 65, l: 55 },
      { h: 310, s: 55, l: 50 },
    ];

    for (let layer = 0; layer < 5; layer++) {
      const c = auroraColors[layer];
      const yBase = H * (0.12 + layer * 0.07);
      const amplitude = 50 + breathe * 35 + bio.hrNorm * 25;
      const waveSpeed = 0.12 + layer * 0.04;

      ctx.beginPath();
      ctx.moveTo(0, H);

      for (let x = 0; x <= W; x += 3) {
        const nx = x / W;
        const wave1 = Math.sin(nx * 3.5 + t * waveSpeed + layer * 1.2) * amplitude;
        const wave2 = Math.sin(nx * 6 - t * waveSpeed * 0.6 + layer * 2.5) * amplitude * 0.4;
        const wave3 = noise2D(nx * 2.5, t * 0.08 + layer * 0.5) * amplitude * 0.7;
        ctx.lineTo(x, yBase + wave1 + wave2 + wave3);
      }

      ctx.lineTo(W, H);
      ctx.closePath();

      const curtainGrad = ctx.createLinearGradient(0, yBase - amplitude * 1.5, 0, yBase + H * 0.35);
      const alpha = 0.07 + breathe * 0.05 - layer * 0.01;
      curtainGrad.addColorStop(0, `hsla(${c.h}, ${c.s}%, ${c.l}%, ${alpha})`);
      curtainGrad.addColorStop(0.25, `hsla(${c.h}, ${c.s}%, ${c.l}%, ${alpha * 0.5})`);
      curtainGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = curtainGrad;
      ctx.fill();
    }

    // Floating orbs
    auroraOrbs.forEach(o => {
      const ox = (o.x + Math.sin(t * o.speed + o.phase) * 0.18) * W;
      const oy = (o.y + Math.cos(t * o.speed * 0.6 + o.phase) * 0.1) * H;
      const radius = o.r * (0.7 + breathe * 0.5);

      const orbGrad = ctx.createRadialGradient(ox, oy, 0, ox, oy, radius);
      orbGrad.addColorStop(0, `hsla(${130 + o.phase * 25}, 75%, 65%, ${0.12 + breathe * 0.08})`);
      orbGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = orbGrad;
      ctx.beginPath(); ctx.arc(ox, oy, radius, 0, Math.PI * 2); ctx.fill();
    });

    // Horizon glow
    const horizonGrad = ctx.createRadialGradient(W/2, H * 1.1, 0, W/2, H * 1.1, H * 0.7);
    horizonGrad.addColorStop(0, `hsla(180, 50%, 25%, ${0.08 + breathe * 0.04})`);
    horizonGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = horizonGrad;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Main Loop ─────────────────────────────────
  let lastTime = 0;
  function loop(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    bio.update(dt);
    const pal = getModePalette();

    switch(bio.currMode) {
      case 1: renderFlow(ctx, dt, pal); break;
      case 2: renderPulse(ctx, dt, pal); break;
      case 3: renderFluid(ctx, dt, pal); break;
      case 4: renderGrid(ctx, dt, pal); break;
      case 5: renderZen(ctx, dt, pal); break;
      default: renderFlow(ctx, dt, pal);
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

})();
