// =============================================
//  BodyCanvas — Multi-Mode Biometric Visualizer
// =============================================

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

  // MODE 1: FLOW (Existing Particles)
  const particles = Array.from({length: 2000}, () => ({
    x: Math.random() * W, y: Math.random() * H,
    px: 0, py: 0, speed: 0.5 + Math.random() * 1.5,
    life: Math.random(),
    reset() { this.x = Math.random() * W; this.y = Math.random() * H; this.px = this.x; this.py = this.y; this.life = 1; }
  }));

  function renderFlow(ctx, dt, pal) {
    ctx.fillStyle = 'rgba(5, 5, 10, 0.1)';
    ctx.fillRect(0, 0, W, H);
    ctx.lineCap = 'round';
    particles.forEach(p => {
      const s = 0.002;
      const angle = noise2D(p.x * s, p.y * s + performance.now() * 0.0001) * Math.PI * 4;
      p.px = p.x; p.py = p.y;
      p.x += Math.cos(angle) * p.speed * (1 + bio.hrNorm * 2);
      p.y += Math.sin(angle) * p.speed * (1 + bio.hrNorm * 2);
      p.life -= 0.005;
      if (p.life <= 0 || p.x < 0 || p.x > W || p.y < 0 || p.y > H) p.reset();
      ctx.strokeStyle = `hsla(${pal.hue + Math.random()*20}, 80%, 60%, ${p.life * 0.5})`;
      ctx.lineWidth = 1 + bio.strNorm * 2;
      ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
    });
  }

  // MODE 2: PULSE (Expanding Geometry)
  const rings = [];
  function renderPulse(ctx, dt, pal) {
    ctx.fillStyle = 'rgba(5, 5, 12, 0.15)';
    ctx.fillRect(0, 0, W, H);
    if (bio.beatPhase > 0.9) rings.push({ r: 0, a: 1 });
    ctx.lineWidth = 2 + bio.strNorm * 5;
    rings.forEach((r, i) => {
      r.r += (5 + bio.hrNorm * 10);
      r.a -= 0.01;
      if (r.a <= 0) rings.splice(i, 1);
      ctx.strokeStyle = `hsla(${pal.hue}, 80%, 60%, ${r.a})`;
      ctx.beginPath();
      ctx.arc(W/2, H/2, r.r, 0, Math.PI * 2);
      ctx.stroke();
      // Inner spikes
      if (bio.strNorm > 0.4) {
        ctx.beginPath();
        for(let j=0; j<8; j++) {
          const ang = (j/8) * Math.PI * 2 + performance.now()*0.001;
          ctx.moveTo(W/2 + Math.cos(ang)*r.r*0.8, H/2 + Math.sin(ang)*r.r*0.8);
          ctx.lineTo(W/2 + Math.cos(ang)*r.r*1.2, H/2 + Math.sin(ang)*r.r*1.2);
        }
        ctx.stroke();
      }
    });
  }

  // MODE 3: FLUID (Ink/Smoke)
  function renderFluid(ctx, dt, pal) {
    ctx.fillStyle = 'rgba(5, 5, 15, 0.05)';
    ctx.fillRect(0, 0, W, H);
    const t = performance.now() * 0.001;
    for (let i = 0; i < 5; i++) {
      const cx = W/2 + Math.sin(t + i) * W * 0.3;
      const cy = H/2 + Math.cos(t * 0.8 + i) * H * 0.3;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 100 + bio.strNorm * 200);
      grad.addColorStop(0, `hsla(${pal.hue + i*20}, 90%, 60%, 0.2)`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, 100 + bio.strNorm * 200, 0, Math.PI*2); ctx.fill();
    }
    // High-speed wisps
    ctx.strokeStyle = pal.main;
    ctx.lineWidth = 0.5;
    for(let i=0; i<20; i++) {
        const x = Math.random()*W;
        const y = Math.random()*H;
        ctx.beginPath(); ctx.moveTo(x,y); 
        ctx.lineTo(x + noise2D(x*0.01, t)*50, y + noise2D(y*0.01, t)*50);
        ctx.stroke();
    }
  }

  // MODE 4: GRID (3D Synthwave)
  function renderGrid(ctx, dt, pal) {
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, W, H);
    const time = performance.now() * 0.001;
    const speed = 1 + bio.hrNorm * 4;
    ctx.strokeStyle = `hsla(${pal.hue}, 80%, 40%, 0.3)`;
    ctx.lineWidth = 1;
    
    // Horizontal perspective lines
    const horizon = H * 0.4;
    for (let i = 0; i < 20; i++) {
      const y = horizon + Math.pow(i / 20, 2) * (H - horizon);
      const moveY = (y + time * 50 * speed) % (H - horizon);
      const finalY = horizon + moveY;
      ctx.beginPath(); ctx.moveTo(0, finalY); ctx.lineTo(W, finalY); ctx.stroke();
    }
    // Vertical perspective lines
    for (let i = -10; i <= 10; i++) {
      const xTop = W/2 + i * 50;
      const xBot = W/2 + i * 500;
      ctx.beginPath(); ctx.moveTo(xTop, horizon); ctx.lineTo(xBot, H); ctx.stroke();
    }
    // Pulsing Sun
    const sunGrad = ctx.createRadialGradient(W/2, horizon - 50, 0, W/2, horizon - 50, 150);
    sunGrad.addColorStop(0, `hsla(${pal.hue - 20}, 100%, 60%, 0.8)`);
    sunGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGrad;
    ctx.beginPath(); ctx.arc(W/2, horizon - 50, 150 + bio.beatPhase*20, 0, Math.PI*2); ctx.fill();
  }

  // MODE 5: ZEN (Minimal Typo)
  function renderZen(ctx, dt, pal) {
    const i = bio.intensity;
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, `hsla(${pal.hue}, 50%, 10%, 1)`);
    grad.addColorStop(1, `hsla(${pal.hue + 40}, 50%, 5%, 1)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // HR Display
    ctx.font = `200 ${120 + bio.beatPhase * 40}px Outfit`;
    ctx.fillStyle = '#fff';
    ctx.fillText(Math.round(bio.hr), W/2, H/2 - 40);
    ctx.font = '500 20px Outfit';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('HEART RATE / BPM', W/2, H/2 + 40);

    // Stress Bar
    const barW = 300;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.roundRect(W/2 - barW/2, H/2 + 100, barW, 4, 2); ctx.fill();
    ctx.fillStyle = pal.main;
    ctx.shadowBlur = 15; ctx.shadowColor = pal.main;
    ctx.roundRect(W/2 - barW/2, H/2 + 100, barW * bio.strNorm, 4, 2); ctx.fill();
    ctx.shadowBlur = 0;
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
