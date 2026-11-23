// ============================================================================
// Dulos editor — Promotional Site Interactive Engine & Dynamic App Captures
// ============================================================================

(() => {
  'use strict';

  // Ensure any stale PWA service worker from the previous hosted editor is cleaned up
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister());
    }).catch(() => {});
  }

  // --------------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------------
  const DURATION = 15; // seconds loop
  let isPlaying = true;
  let currentTime = 4.2;
  let lastFrameTs = performance.now();
  let activeMode = 'cinema'; // cinema | glitch | chroma | text | audio
  let activeGrade = 'cyber'; // cyber | teal | vintage | noir
  let compareSplit = 0.52;

  const MODE_META = {
    cinema: {
      tag: 'Shader: Cinematográfico',
      mobileTag: 'Reel 1080p · Cine',
      sidebarTitle: 'Etalonaje WebGL',
      sliders: [
        ['+18%', 64],
        ['+24%', 72],
        ['+32%', 78],
        ['45%', 45],
        ['30%', 30],
      ],
    },
    glitch: {
      tag: 'VFX: Glitch RGB + Shake',
      mobileTag: 'VFX · Glitch RGB',
      sidebarTitle: 'Efectos VFX GLSL',
      sliders: [
        ['+42%', 82],
        ['+38%', 76],
        ['+55%', 88],
        ['70%', 70],
        ['18%', 18],
      ],
    },
    chroma: {
      tag: 'Chroma Key · Despill 84%',
      mobileTag: 'Chroma Key · Alpha',
      sidebarTitle: 'Pantalla Verde',
      sliders: [
        ['84%', 84],
        ['42%', 42],
        ['90%', 90],
        ['25%', 25],
        ['10%', 10],
      ],
    },
    text: {
      tag: 'Texto Dinámico · 258 Fuentes',
      mobileTag: 'Texto Dinámico',
      sidebarTitle: 'Texto & Tipografía',
      sliders: [
        ['+12%', 56],
        ['+18%', 62],
        ['+20%', 65],
        ['60%', 60],
        ['40%', 40],
      ],
    },
    audio: {
      tag: 'Audio · Beats & 1000%',
      mobileTag: 'Audio · Beats',
      sidebarTitle: 'Mezclador Audio',
      sliders: [
        ['140%', 74],
        ['+6 dB', 68],
        ['128 BPM', 85],
        ['0.8s', 40],
        ['1.2s', 55],
      ],
    },
  };

  const GRADE_META = {
    cyber: { label: 'Neón Cyber · WebGL', tint: ['#4f46e5', '#ec4899', '#38bdf8'] },
    teal: { label: 'Cine Teal & Orange', tint: ['#0f766e', '#ea580c', '#fbbf24'] },
    vintage: { label: 'Vintage 35mm', tint: ['#78350f', '#b45309', '#fde68a'] },
    noir: { label: 'Noir B&N Alto Contraste', tint: ['#18181b', '#52525b', '#f4f4f5'] },
  };

  const DYNAMIC_TEXT_WORDS = ['Edita', 'en', '1080p', 'a', '30 FPS', 'sin', 'marcas'];

  // --------------------------------------------------------------------------
  // DOM References
  // --------------------------------------------------------------------------
  const desktopCanvas = document.getElementById('desktopCanvas');
  const mobileCanvas = document.getElementById('mobileCanvas');
  const waveformCanvas = document.getElementById('waveformCanvas');
  const compareCanvas = document.getElementById('compareCanvas');

  const dCtx = desktopCanvas ? desktopCanvas.getContext('2d') : null;
  const mCtx = mobileCanvas ? mobileCanvas.getContext('2d') : null;
  const wCtx = waveformCanvas ? waveformCanvas.getContext('2d') : null;
  const cCtx = compareCanvas ? compareCanvas.getContext('2d') : null;

  const desktopPlayhead = document.getElementById('desktopPlayhead');
  const mobilePlayhead = document.getElementById('mobilePlayhead');
  const desktopTimecode = document.getElementById('desktopTimecode');
  const mobileTimecode = document.getElementById('mobileTimecode');
  const desktopModeTag = document.getElementById('desktopModeTag');
  const mobileModeTag = document.getElementById('mobileModeTag');
  const sidebarTitle = document.getElementById('sidebarTitle');
  const playToggle = document.getElementById('playToggle');
  const showcaseStage = document.getElementById('showcaseStage');

  // --------------------------------------------------------------------------
  // Procedural Video Scene Renderer (for PC & Mobile Dynamic Screenshots)
  // --------------------------------------------------------------------------
  function drawDynamicScene(ctx, w, h, t, mode, isMobile) {
    ctx.save();

    // Optional camera shake in glitch mode
    if (mode === 'glitch' && Math.sin(t * 17) > 0.72) {
      ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4);
    }

    // 1. Background sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    if (mode === 'chroma') {
      // Draw subtle alpha transparency checkerboard on left half, new studio background on right half
      const splitX = w * (0.48 + Math.sin(t * 0.9) * 0.14);
      const cell = isMobile ? 12 : 16;
      for (let y = 0; y < h; y += cell) {
        for (let x = 0; x < splitX; x += cell) {
          ctx.fillStyle = ((x / cell + y / cell) % 2 === 0) ? '#171923' : '#232635';
          ctx.fillRect(x, y, cell, cell);
        }
      }
      const studioGrad = ctx.createLinearGradient(splitX, 0, w, h);
      studioGrad.addColorStop(0, '#1e1b4b');
      studioGrad.addColorStop(0.55, '#4c1d95');
      studioGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = studioGrad;
      ctx.fillRect(splitX, 0, w - splitX, h);

      // Chroma divider line
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, h);
      ctx.stroke();
    } else {
      sky.addColorStop(0, '#0b0d1f');
      sky.addColorStop(0.45, mode === 'glitch' ? '#2e1065' : '#1e1b4b');
      sky.addColorStop(0.82, mode === 'audio' ? '#0c4a6e' : '#581c87');
      sky.addColorStop(1, '#090a0f');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Glowing cinematic sun / orb
    const sunX = w * 0.5 + Math.sin(t * 0.4) * (w * 0.06);
    const sunY = h * (isMobile ? 0.36 : 0.42);
    const sunR = Math.min(w, h) * (isMobile ? 0.22 : 0.2);
    const sunGrad = ctx.createRadialGradient(sunX, sunY, sunR * 0.1, sunX, sunY, sunR * 1.9);
    sunGrad.addColorStop(0, mode === 'audio' ? 'rgba(56,189,248,0.95)' : 'rgba(244,114,182,0.95)');
    sunGrad.addColorStop(0.45, 'rgba(139,92,246,0.5)');
    sunGrad.addColorStop(1, 'rgba(9,10,15,0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR * 1.9, 0, Math.PI * 2);
    ctx.fill();

    // Solid core sun
    const coreGrad = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR);
    coreGrad.addColorStop(0, '#fde047');
    coreGrad.addColorStop(0.55, '#f472b6');
    coreGrad.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // 3. Parallax Mountain Silhouettes
    drawMountainLayer(ctx, w, h, h * 0.68, 38, t * 18, '#17153b', 0.008);
    drawMountainLayer(ctx, w, h, h * 0.77, 26, t * 34, '#0f1024', 0.013);

    // 4. Perspective Neon Grid Floor
    const horizon = h * 0.76;
    ctx.save();
    ctx.strokeStyle = mode === 'chroma' ? 'rgba(52, 211, 153, 0.32)' : 'rgba(99, 102, 241, 0.35)';
    ctx.lineWidth = 1;
    const gridSpacing = (t * 40) % 24;
    for (let i = 0; i < 8; i++) {
      const y = horizon + Math.pow((i * 24 + gridSpacing) / 192, 1.7) * (h - horizon);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = -8; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5 + i * 18, horizon);
      ctx.lineTo(w * 0.5 + i * 95, h);
      ctx.stroke();
    }
    ctx.restore();

    // 5. Floating Bokeh / Particles
    for (let i = 0; i < 16; i++) {
      const px = ((i * 97 + t * (16 + (i % 4) * 7)) % (w + 40)) - 20;
      const py = h * 0.15 + Math.sin(t * 0.8 + i * 1.4) * (h * 0.28) + (i % 5) * 18;
      const r = 1.5 + (i % 3) * 1.3;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(56,189,248,0.55)' : 'rgba(244,114,182,0.55)';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Mode-specific overlays
    if (mode === 'glitch') {
      // RGB Split slices
      for (let i = 0; i < 6; i++) {
        const sliceY = ((t * 140 + i * 67) % h);
        const sliceH = 3 + (i % 4) * 3;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(236, 72, 153, 0.28)' : 'rgba(56, 189, 248, 0.28)';
        ctx.fillRect(0, sliceY, w, sliceH);
      }
      ctx.font = `700 ${isMobile ? 20 : 34}px "Space Grotesk", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(56,189,248,0.85)';
      ctx.fillText('GLITCH RGB', w * 0.5 - 4, h * 0.52);
      ctx.fillStyle = 'rgba(236,72,153,0.85)';
      ctx.fillText('GLITCH RGB', w * 0.5 + 4, h * 0.52);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('GLITCH RGB', w * 0.5, h * 0.52);
    } else if (mode === 'chroma') {
      // Stylized subject silhouette with green-screen despill badge
      const cx = w * 0.5;
      const cy = h * 0.56;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.arc(cx, cy - 32, isMobile ? 18 : 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(cx - (isMobile ? 28 : 42), cy - 2, isMobile ? 56 : 84, isMobile ? 54 : 74, 20);
      ctx.fill();
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (mode === 'text') {
      const activeIdx = Math.floor(t * 2.2) % DYNAMIC_TEXT_WORDS.length;
      const boxW = isMobile ? w * 0.88 : w * 0.64;
      const boxH = isMobile ? 44 : 52;
      const bx = (w - boxW) / 2;
      const by = h * (isMobile ? 0.64 : 0.72);
      ctx.fillStyle = 'rgba(9, 10, 15, 0.78)';
      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = `700 ${isMobile ? 13 : 20}px "Space Grotesk", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const line = DYNAMIC_TEXT_WORDS.map((word, idx) => (idx === activeIdx ? `[ ${word.toUpperCase()} ]` : word)).join(' ');
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(line, w / 2, by + boxH / 2);
    } else if (mode === 'audio') {
      const bars = isMobile ? 18 : 34;
      const barW = (w * 0.72) / bars;
      const startX = w * 0.14;
      const baseY = h * 0.64;
      for (let i = 0; i < bars; i++) {
        const amp = (Math.sin(t * 7 + i * 0.55) * 0.5 + 0.5) * (Math.cos(t * 3.1 - i * 0.3) * 0.5 + 0.5);
        const bh = 10 + amp * (isMobile ? 76 : 110);
        const grad = ctx.createLinearGradient(0, baseY - bh, 0, baseY);
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(0.5, '#8b5cf6');
        grad.addColorStop(1, '#ec4899');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(startX + i * barW, baseY - bh, barW - 3, bh, 3);
        ctx.fill();
      }
    } else {
      // Cinema kinetic title
      ctx.font = `700 ${isMobile ? 18 : 32}px "Space Grotesk", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillText('DULOS EDITOR', w * 0.5, h * 0.48);
      ctx.font = `500 ${isMobile ? 10 : 14}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(224, 231, 255, 0.8)';
      ctx.fillText('1080P · 30 FPS · WEBGL ENGINE', w * 0.5, h * 0.48 + (isMobile ? 18 : 28));
    }

    // 7. Subtle Vignette
    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(5,6,10,0.52)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }

  function drawMountainLayer(ctx, w, h, baseY, amp, offset, color, freq) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 12) {
      const y =
        baseY -
        Math.abs(Math.sin((x + offset) * freq)) * amp -
        Math.sin((x + offset * 0.6) * freq * 2.1) * (amp * 0.35);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  // --------------------------------------------------------------------------
  // Desktop Timeline Waveform Canvas
  // --------------------------------------------------------------------------
  function drawTimelineWaveform(t) {
    if (!wCtx || !waveformCanvas) return;
    const w = waveformCanvas.width;
    const h = waveformCanvas.height;
    wCtx.clearRect(0, 0, w, h);

    const bars = 96;
    const step = w / bars;
    for (let i = 0; i < bars; i++) {
      const seed = Math.sin(i * 0.65) * Math.cos(i * 0.23 + 1.2);
      const pulse = Math.sin(t * 4 + i * 0.25) * 0.15;
      const barH = Math.max(4, (Math.abs(seed) * 0.75 + 0.2 + pulse) * (h - 4));
      wCtx.fillStyle = i % 12 === 0 ? '#f472b6' : 'rgba(56, 189, 248, 0.72)';
      wCtx.fillRect(i * step + 1, (h - barH) / 2, Math.max(1.5, step - 2), barH);
    }

    // Volume envelope line overlay
    wCtx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    wCtx.lineWidth = 1.2;
    wCtx.beginPath();
    wCtx.moveTo(0, h - 3);
    wCtx.lineTo(36, 6);
    wCtx.lineTo(w - 48, 6);
    wCtx.lineTo(w, h - 3);
    wCtx.stroke();
  }

  // --------------------------------------------------------------------------
  // Before/After Color Grading Compare Canvas
  // --------------------------------------------------------------------------
  function drawCompareCanvas(t) {
    if (!cCtx || !compareCanvas) return;
    const w = compareCanvas.width;
    const h = compareCanvas.height;
    const splitX = Math.round(w * compareSplit);
    const grade = GRADE_META[activeGrade] || GRADE_META.cyber;

    // Left: RAW flat footage
    cCtx.save();
    cCtx.beginPath();
    cCtx.rect(0, 0, splitX, h);
    cCtx.clip();
    drawGradeLandscape(cCtx, w, h, t, ['#334155', '#475569', '#94a3b8'], false);
    cCtx.restore();

    // Right: Graded WebGL Shader footage
    cCtx.save();
    cCtx.beginPath();
    cCtx.rect(splitX, 0, w - splitX, h);
    cCtx.clip();
    drawGradeLandscape(cCtx, w, h, t, grade.tint, true);
    cCtx.restore();
  }

  function drawGradeLandscape(ctx, w, h, t, palette, graded) {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, palette[0]);
    bg.addColorStop(0.55, palette[1]);
    bg.addColorStop(1, '#090a0f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Sun
    const sx = w * 0.56;
    const sy = h * 0.42 + Math.sin(t * 0.7) * 6;
    const sr = 54;
    const glow = ctx.createRadialGradient(sx, sy, 8, sx, sy, sr * 2.2);
    glow.addColorStop(0, palette[2]);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy, sr * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Mountains
    drawMountainLayer(ctx, w, h, h * 0.72, 46, t * 14, graded ? 'rgba(9,10,15,0.68)' : 'rgba(30,41,59,0.72)', 0.01);
    drawMountainLayer(ctx, w, h, h * 0.84, 30, t * 26, graded ? '#090a0f' : '#1e293b', 0.016);

    // Floating light rings
    for (let i = 0; i < 8; i++) {
      const rx = (i * 82 + t * 22) % (w + 60) - 30;
      const ry = h * 0.24 + Math.sin(t + i) * 35;
      ctx.fillStyle = graded ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(rx, ry, 3 + (i % 3) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --------------------------------------------------------------------------
  // Timecode Formatting & Main Animation Loop
  // --------------------------------------------------------------------------
  function formatTimecode(sec) {
    const s = Math.floor(sec) % 60;
    const frames = Math.floor((sec % 1) * 30);
    return `00:00:${String(s).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  }

  function animate(now) {
    const dt = Math.min(0.05, (now - lastFrameTs) / 1000);
    lastFrameTs = now;

    if (isPlaying) {
      currentTime = (currentTime + dt) % DURATION;
    }

    const pct = (currentTime / DURATION) * 100;
    if (desktopPlayhead) desktopPlayhead.style.left = `${4 + pct * 0.9}%`;
    if (mobilePlayhead) mobilePlayhead.style.left = `${6 + pct * 0.86}%`;
    if (desktopTimecode) desktopTimecode.textContent = formatTimecode(currentTime);
    if (mobileTimecode) mobileTimecode.textContent = `00:${String(Math.floor(currentTime)).padStart(2, '0')}.${Math.floor((currentTime % 1) * 10)}`;

    if (dCtx) drawDynamicScene(dCtx, desktopCanvas.width, desktopCanvas.height, currentTime, activeMode, false);
    if (mCtx) drawDynamicScene(mCtx, mobileCanvas.width, mobileCanvas.height, currentTime, activeMode, true);
    drawTimelineWaveform(currentTime);
    drawCompareCanvas(currentTime);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);

  // --------------------------------------------------------------------------
  // Mode & Device Switcher Controls
  // --------------------------------------------------------------------------
  function setShowcaseMode(mode) {
    if (!MODE_META[mode]) return;
    activeMode = mode;
    const meta = MODE_META[mode];

    if (desktopModeTag) desktopModeTag.textContent = meta.tag;
    if (mobileModeTag) mobileModeTag.textContent = meta.mobileTag;
    if (sidebarTitle) sidebarTitle.textContent = meta.sidebarTitle;

    // Update desktop inspector sliders
    const sliderRows = document.querySelectorAll('#inspectorSliders .slider-row');
    sliderRows.forEach((row, idx) => {
      const pair = meta.sliders[idx];
      if (!pair) return;
      const valEl = row.querySelector('.mono');
      const fillEl = row.querySelector('.slider-fill');
      if (valEl) valEl.textContent = pair[0];
      if (fillEl) fillEl.style.width = `${pair[1]}%`;
    });

    // Sync active buttons across toolbar, sidebar, and mobile dock
    document.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  }

  document.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => setShowcaseMode(btn.dataset.mode));
  });

  // Device view switcher (PC + Celular | Vista PC | Vista Celular)
  document.querySelectorAll('.switch-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const device = btn.dataset.device;
      document.querySelectorAll('.switch-btn').forEach((b) => {
        const active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', String(active));
      });
      if (showcaseStage) {
        showcaseStage.classList.remove('mode-both', 'mode-desktop', 'mode-mobile');
        showcaseStage.classList.add(`mode-${device}`);
      }
    });
  });

  // Play / Pause toggle
  if (playToggle) {
    playToggle.addEventListener('click', () => {
      isPlaying = !isPlaying;
      const pauseIcon = playToggle.querySelector('.icon-pause');
      const playIcon = playToggle.querySelector('.icon-play');
      if (pauseIcon) pauseIcon.classList.toggle('hidden', !isPlaying);
      if (playIcon) playIcon.classList.toggle('hidden', isPlaying);
    });
  }

  // Click on desktop timeline to scrub playhead
  const desktopTimeline = document.getElementById('desktopTimeline');
  if (desktopTimeline) {
    desktopTimeline.style.cursor = 'pointer';
    desktopTimeline.addEventListener('click', (e) => {
      const rect = desktopTimeline.getBoundingClientRect();
      const rel = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      currentTime = rel * DURATION;
    });
  }

  // --------------------------------------------------------------------------
  // Before/After Compare Slider & Color Presets
  // --------------------------------------------------------------------------
  const compareRange = document.getElementById('compareRange');
  const compareDivider = document.getElementById('compareDivider');
  const compareRightLabel = document.getElementById('compareRightLabel');

  if (compareRange && compareDivider) {
    compareRange.addEventListener('input', () => {
      const val = Number(compareRange.value);
      compareSplit = val / 100;
      compareDivider.style.left = `${val}%`;
    });
  }

  document.querySelectorAll('#gradePresets .preset-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      activeGrade = pill.dataset.grade;
      document.querySelectorAll('#gradePresets .preset-pill').forEach((p) => {
        p.classList.toggle('active', p === pill);
      });
      if (compareRightLabel && GRADE_META[activeGrade]) {
        compareRightLabel.textContent = GRADE_META[activeGrade].label;
      }
    });
  });

  // --------------------------------------------------------------------------
  // Audio Card Micro-Demo & Karaoke Subtitle Cycling
  // --------------------------------------------------------------------------
  const audioDemoBars = document.getElementById('audioDemoBars');
  if (audioDemoBars) {
    const barCount = 26;
    const bars = [];
    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement('span');
      bar.className = 'audio-bar';
      bar.style.height = `${20 + Math.random() * 65}%`;
      audioDemoBars.appendChild(bar);
      bars.push(bar);
    }
    setInterval(() => {
      bars.forEach((b, i) => {
        const wave = Math.sin(Date.now() * 0.005 + i * 0.45) * 0.5 + 0.5;
        b.style.height = `${16 + wave * 74}%`;
      });
    }, 180);
  }

  const karaokeWords = document.querySelectorAll('#karaokeLine .word');
  if (karaokeWords.length > 0) {
    let kIdx = 0;
    setInterval(() => {
      karaokeWords.forEach((w, i) => w.classList.toggle('active', i === kIdx));
      kIdx = (kIdx + 1) % karaokeWords.length;
    }, 650);
  }

  // --------------------------------------------------------------------------
  // Interactive 1080p Export Simulator
  // --------------------------------------------------------------------------
  let selectedResMb = 42;
  let selectedFpsMult = 1.0;
  let exportTimer = null;

  const estSizeEl = document.getElementById('estSize');
  const exportProgressFill = document.getElementById('exportProgressFill');
  const exportStatus = document.getElementById('exportStatus');
  const simulateExportBtn = document.getElementById('simulateExportBtn');

  function updateExportEstimate() {
    if (!estSizeEl) return;
    const mb = Math.round(selectedResMb * selectedFpsMult);
    estSizeEl.textContent = `~${mb} MB`;
  }

  document.querySelectorAll('#resControl button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#resControl button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedResMb = Number(btn.dataset.mb);
      updateExportEstimate();
    });
  });

  document.querySelectorAll('#fpsControl button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#fpsControl button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedFpsMult = Number(btn.dataset.mult);
      updateExportEstimate();
    });
  });

  if (simulateExportBtn && exportProgressFill && exportStatus) {
    simulateExportBtn.addEventListener('click', () => {
      if (exportTimer) clearInterval(exportTimer);
      let progress = 0;
      exportProgressFill.style.width = '0%';
      exportStatus.textContent = 'Codificando H.264 por GPU... 0%';
      simulateExportBtn.disabled = true;

      exportTimer = setInterval(() => {
        progress += 8 + Math.random() * 9;
        if (progress >= 100) {
          progress = 100;
          clearInterval(exportTimer);
          exportTimer = null;
          exportProgressFill.style.width = '100%';
          exportStatus.textContent = '✓ Exportación completada · Sin marca de agua';
          simulateExportBtn.disabled = false;
        } else {
          exportProgressFill.style.width = `${progress.toFixed(0)}%`;
          exportStatus.textContent = `Codificando H.264 por GPU... ${progress.toFixed(0)}%`;
        }
      }, 95);
    });
  }

  // --------------------------------------------------------------------------
  // Mobile Navigation & Scroll Reveal
  // --------------------------------------------------------------------------
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(open));
    });
    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('visible'));
  }

})();
