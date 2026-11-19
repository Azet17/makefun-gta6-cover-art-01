/* Vice City Cover Maker — offline GTA-style cover art studio.
 * Everything runs locally: photos are read on this machine, never uploaded.
 * Renders the cover on one canvas, live, and exports PNG at 1080x1080,
 * 1080x1350 or 1920x1080. No network requests, no libraries. */

'use strict';

const SAMPLE_PHOTOS = ['samples/boulevard.jpg', 'samples/pier.jpg'];
const EXPORT_SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

/* One panel's crop: which photo, where its centre sits (0..1), how far zoomed.
 * oy starts a little above centre so faces survive a wide landscape crop. */
function makePanel(photo) {
  return { photo, ox: 0.5, oy: 0.38, zoom: 1 };
}

const state = {
  photos: [],          // loaded HTMLImageElement objects
  panels: [makePanel(0), makePanel(1), makePanel(1), makePanel(0)],
  layout: 'grid4',     // 'grid4' | 'hero3' | 'fullbleed'
  grade: 'sunset',     // 'sunset' | 'neon' | 'golden'
  title: 'LEONIDA',
  caption: 'VICE CITY',
  subtitle: 'Leonida Nights',
  grain: true,
  vignette: true,
  size: '1080x1080',
  selectedPanel: 0,
  pickedPhoto: 0,
};

const canvas = document.getElementById('coverCanvas');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const shotMode = params.get('shot') || '';

/* ------------------------------------------------------------------ layout */

/* Panel rectangles for a layout, as fractions of the cover, with gutters. */
function layoutPanels(layout, W, H) {
  const g = Math.max(2, Math.round(W * 0.008)); // gutter between panels
  const full = { x: 0, y: 0, w: W, h: H };
  if (layout === 'fullbleed') return [full];
  if (layout === 'hero3') {
    const heroW = Math.round(W * 0.60) - g;
    const sideX = heroW + g;
    const sideW = W - sideX;
    const third = Math.round((H - 2 * g) / 3);
    return [
      { x: 0, y: 0, w: heroW, h: H },
      { x: sideX, y: 0, w: sideW, h: third },
      { x: sideX, y: third + g, w: sideW, h: third },
      { x: sideX, y: 2 * (third + g), w: sideW, h: H - 2 * (third + g) },
    ];
  }
  // grid4: two by two.
  const halfW = Math.round((W - g) / 2);
  const halfH = Math.round((H - g) / 2);
  return [
    { x: 0, y: 0, w: halfW, h: halfH },
    { x: halfW + g, y: 0, w: W - halfW - g, h: halfH },
    { x: 0, y: halfH + g, w: halfW, h: H - halfH - g },
    { x: halfW + g, y: halfH + g, w: W - halfW - g, h: H - halfH - g },
  ];
}

/* ------------------------------------------------------------------ drawing */

/* A tiny noise tile for the film grain overlay, made once. */
let grainTile = null;
function makeGrainTile() {
  const t = document.createElement('canvas');
  t.width = 160;
  t.height = 160;
  const c = t.getContext('2d');
  const img = c.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 28;
  }
  c.putImageData(img, 0, 0);
  return t;
}

/* Draw one photo into one panel, cover-fit, with the panel's pan and zoom. */
function drawPhotoInPanel(c, photo, panel, rect) {
  if (!photo) {
    c.fillStyle = '#241640';
    c.fillRect(rect.x, rect.y, rect.w, rect.h);
    return;
  }
  const iw = photo.naturalWidth;
  const ih = photo.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * panel.zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  let dx = rect.x + (rect.w - dw) / 2 - (panel.ox - 0.5) * (dw - rect.w);
  let dy = rect.y + (rect.h - dh) / 2 - (panel.oy - 0.5) * (dh - rect.h);
  dx = Math.min(rect.x, Math.max(rect.x + rect.w - dw, dx));
  dy = Math.min(rect.y, Math.max(rect.y + rect.h - dh, dy));
  c.save();
  c.beginPath();
  c.rect(rect.x, rect.y, rect.w, rect.h);
  c.clip();
  c.filter = 'saturate(1.28) contrast(1.06)';
  c.drawImage(photo, dx, dy, dw, dh);
  c.restore();
}

/* The colour grade: a gradient-map style overlay over the whole cover. */
function applyGrade(c, grade, W, H) {
  let grad;
  if (grade === 'neon') {
    grad = c.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#19e3ff');
    grad.addColorStop(0.55, '#b04dff');
    grad.addColorStop(1, '#ff2ea6');
    c.save();
    c.globalCompositeOperation = 'overlay';
    c.globalAlpha = 0.55;
    c.fillStyle = grad;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'screen';
    c.globalAlpha = 0.16;
    const glow = c.createRadialGradient(W * 0.85, H * 0.1, 0, W * 0.85, H * 0.1, W * 0.7);
    glow.addColorStop(0, 'rgba(255,46,166,0.9)');
    glow.addColorStop(1, 'rgba(255,46,166,0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, W, H);
    c.restore();
  } else if (grade === 'golden') {
    grad = c.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#ffe08a');
    grad.addColorStop(0.6, '#ffb35c');
    grad.addColorStop(1, '#ff8c42');
    c.save();
    c.globalCompositeOperation = 'soft-light';
    c.globalAlpha = 0.55;
    c.fillStyle = grad;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'overlay';
    c.globalAlpha = 0.15;
    c.fillStyle = 'rgba(255,180,80,1)';
    c.fillRect(0, 0, W, H);
    c.restore();
  } else {
    // Vice City sunset: hot orange sky into pink into purple.
    grad = c.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#ff9e45');
    grad.addColorStop(0.45, '#ff5e7a');
    grad.addColorStop(1, '#7b2ff7');
    c.save();
    c.globalCompositeOperation = 'overlay';
    c.globalAlpha = 0.5;
    c.fillStyle = grad;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'soft-light';
    c.globalAlpha = 0.28;
    c.fillStyle = 'rgba(255,120,60,1)';
    c.fillRect(0, 0, W, H);
    c.restore();
  }
}

function applyGrainAndVignette(c, W, H) {
  if (state.grain) {
    if (!grainTile) grainTile = makeGrainTile();
    c.save();
    c.globalAlpha = 0.5;
    c.fillStyle = c.createPattern(grainTile, 'repeat');
    c.fillRect(0, 0, W, H);
    c.restore();
  }
  if (state.vignette) {
    const v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.38)');
    c.fillStyle = v;
    c.fillRect(0, 0, W, H);
  }
}

/* Shrink a font until its text fits maxWidth; returns the size actually used. */
function fitFont(c, text, px, family, maxWidth) {
  let size = px;
  c.font = `${size}px ${family}`;
  const w = c.measureText(text).width;
  if (w > maxWidth) size = Math.max(10, Math.floor((size * maxWidth) / w));
  c.font = `${size}px ${family}`;
  return size;
}

/* Bold poster lettering: big display caption, neon script subtitle, title block. */
function drawLettering(c, W, H) {
  const margin = Math.round(W * 0.045);
  // A dark scrim behind the caption so white type reads on any photo.
  const scrim = c.createLinearGradient(0, H * 0.62, 0, H);
  scrim.addColorStop(0, 'rgba(0,0,0,0)');
  scrim.addColorStop(1, 'rgba(0,0,0,0.5)');
  c.fillStyle = scrim;
  c.fillRect(0, H * 0.62, W, H * 0.38);

  // Title block, top left.
  if (state.title.trim()) {
    const ts = Math.round(W * 0.028);
    c.save();
    c.font = `${ts}px Anton, 'Arial Black', sans-serif`;
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    c.lineWidth = Math.max(2, ts * 0.16);
    c.strokeStyle = 'rgba(0,0,0,0.85)';
    c.strokeText(state.title.toUpperCase(), margin, margin + ts);
    c.fillStyle = '#ffffff';
    c.fillText(state.title.toUpperCase(), margin, margin + ts);
    c.fillStyle = '#ff2ea6';
    c.fillRect(margin, margin + ts + Math.round(ts * 0.28), Math.round(W * 0.09), Math.max(3, Math.round(ts * 0.14)));
    c.restore();
  }

  // Neon script subtitle, just above the caption.
  if (state.subtitle.trim()) {
    const ss = fitFont(c, state.subtitle, Math.round(W * 0.048), 'Pacifico, cursive', W - 2 * margin);
    c.save();
    c.font = `${ss}px Pacifico, cursive`;
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    c.shadowColor = '#ff2ea6';
    c.shadowBlur = Math.round(W * 0.022);
    c.fillStyle = '#ffd7ef';
    c.fillText(state.subtitle, W / 2, H - Math.round(W * 0.135));
    c.restore();
  }

  // The big display caption.
  if (state.caption.trim()) {
    const fs = fitFont(c, state.caption.toUpperCase(), Math.round(W * 0.115), "Anton, 'Arial Black', sans-serif", W - 2 * margin);
    c.save();
    c.font = `${fs}px Anton, 'Arial Black', sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(255,46,166,0.75)';
    c.shadowBlur = Math.round(W * 0.012);
    c.shadowOffsetY = Math.round(W * 0.004);
    c.lineWidth = Math.max(3, Math.round(fs * 0.085));
    c.lineJoin = 'round';
    c.strokeStyle = '#0a0616';
    c.strokeText(state.caption.toUpperCase(), W / 2, H - Math.round(W * 0.028));
    c.fillStyle = '#ffffff';
    c.fillText(state.caption.toUpperCase(), W / 2, H - Math.round(W * 0.028));
    c.restore();
  }
}

/* Render the whole cover into a context at W x H. forExport skips the editor overlay. */
function drawCover(c, W, H, forExport) {
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#000';
  c.fillRect(0, 0, W, H);
  const rects = layoutPanels(state.layout, W, H);
  for (let i = 0; i < rects.length; i++) {
    const panel = state.panels[i];
    const photo = panel && panel.photo != null ? state.photos[panel.photo] : null;
    drawPhotoInPanel(c, photo, panel || makePanel(null), rects[i]);
  }
  // White panel gutters, GTA poster style.
  const g = Math.max(2, Math.round(W * 0.008));
  c.fillStyle = '#ffffff';
  if (state.layout === 'grid4') {
    c.fillRect(0, Math.round(H / 2) - Math.floor(g / 2), W, g);
    c.fillRect(Math.round(W / 2) - Math.floor(g / 2), 0, g, H);
  } else if (state.layout === 'hero3') {
    const heroW = Math.round(W * 0.60) - g;
    c.fillRect(heroW, 0, g, H);
    const sideX = heroW + g;
    const third = Math.round((H - 2 * g) / 3);
    c.fillRect(sideX, third, W - sideX, g);
    c.fillRect(sideX, 2 * third + g, W - sideX, g);
  }
  applyGrade(c, state.grade, W, H);
  applyGrainAndVignette(c, W, H);
  drawLettering(c, W, H);
  if (!forExport && state.selectedPanel != null && !shotMode) {
    // Editor only: outline the selected panel.
    const rect = rects[state.selectedPanel];
    if (rect) {
      c.save();
      c.strokeStyle = '#ff2ea6';
      c.lineWidth = Math.max(3, Math.round(W * 0.006));
      c.setLineDash([Math.round(W * 0.02), Math.round(W * 0.012)]);
      c.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
      c.restore();
    }
  }
}

function renderPreview() {
  const [W, H] = EXPORT_SIZES[state.size];
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  drawCover(ctx, W, H, false);
}

/* ------------------------------------------------------------------ photos */

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load ' + src));
    img.src = src;
  });
}

function rebuildPhotoStrip() {
  const strip = document.getElementById('photoStrip');
  strip.innerHTML = '';
  if (state.photos.length === 0) {
    const span = document.createElement('span');
    span.className = 'empty';
    span.textContent = 'No photos yet — add your own or use the samples.';
    strip.appendChild(span);
    return;
  }
  state.photos.forEach((img, i) => {
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = 'Photo ' + (i + 1);
    thumb.title = 'Photo ' + (i + 1) + ' — click to pick, then click a panel';
    if (i === state.pickedPhoto) thumb.classList.add('picked');
    thumb.addEventListener('click', () => {
      state.pickedPhoto = i;
      rebuildPhotoStrip();
    });
    strip.appendChild(thumb);
  });
}

async function addPhotoFiles(files) {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    try {
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      state.photos.push(img);
      state.pickedPhoto = state.photos.length - 1;
      added++;
    } catch (err) {
      console.warn('skipped unreadable file', file.name);
    }
  }
  if (added > 0) {
    // Place the newest photo into the selected panel if it is empty.
    const panel = state.panels[state.selectedPanel];
    if (panel && panel.photo == null) panel.photo = state.photos.length - 1;
    rebuildPhotoStrip();
    renderPreview();
  }
  return added;
}

async function loadSamplePhotos() {
  for (const src of SAMPLE_PHOTOS) {
    try {
      state.photos.push(await loadImage(src));
    } catch (err) {
      console.warn('sample failed', src);
    }
  }
  state.pickedPhoto = 0;
  rebuildPhotoStrip();
  renderPreview();
}

/* ------------------------------------------------------------------ export */

function exportCanvas(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), w, h, true);
  return off;
}

/* Headless-test hook: returns a PNG data URL for the chosen size. */
window.__exportPNG = function (w, h) {
  return new Promise((resolve) => {
    exportCanvas(w, h).toBlob((blob) => {
      if (!blob) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    }, 'image/png');
  });
};
window.__coverState = state;

async function exportPNG() {
  const [w, h] = EXPORT_SIZES[state.size];
  const status = document.getElementById('exportStatus');
  status.textContent = 'Rendering ' + w + ' × ' + h + '…';
  const off = exportCanvas(w, h);
  off.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed — try again.';
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vice-city-cover-' + w + 'x' + h + '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    status.textContent = 'Exported ' + w + ' × ' + h + ' PNG (' + Math.round(blob.size / 1024) + ' KiB).';
  }, 'image/png');
}

/* ------------------------------------------------------------------ UI wiring */

function segWire(id, attr, apply) {
  const seg = document.getElementById(id);
  seg.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    seg.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    apply(btn.getAttribute(attr));
  });
}

function selectPanel(i) {
  state.selectedPanel = i;
  const label = document.getElementById('selectedLabel');
  if (label) label.textContent = 'panel ' + (i + 1);
  const panel = state.panels[i];
  const slider = document.getElementById('zoomSlider');
  if (panel && slider) {
    slider.value = Math.round(panel.zoom * 100);
    document.getElementById('zoomVal').textContent = Math.round(panel.zoom * 100) + '%';
  }
  renderPreview();
}

function canvasPoint(ev) {
  const r = canvas.getBoundingClientRect();
  const [W, H] = EXPORT_SIZES[state.size];
  return {
    x: (ev.clientX - r.left) * (W / r.width),
    y: (ev.clientY - r.top) * (H / r.height),
    W,
    H,
  };
}

function hitPanel(x, y) {
  const [W, H] = EXPORT_SIZES[state.size];
  const rects = layoutPanels(state.layout, W, H);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i;
  }
  return -1;
}

let drag = null;

function bindCanvas() {
  canvas.addEventListener('pointerdown', (ev) => {
    const p = canvasPoint(ev);
    const i = hitPanel(p.x, p.y);
    if (i < 0) return;
    // A picked photo goes straight into the clicked panel.
    if (state.pickedPhoto != null && state.photos[state.pickedPhoto]) {
      state.panels[i].photo = state.pickedPhoto;
    }
    selectPanel(i);
    canvas.setPointerCapture(ev.pointerId);
    drag = { x: p.x, y: p.y, panel: state.panels[i] };
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const p = canvasPoint(ev);
    const panel = drag.panel;
    const photo = state.photos[panel.photo];
    if (!photo) return;
    const [W, H] = EXPORT_SIZES[state.size];
    const rect = layoutPanels(state.layout, W, H)[state.selectedPanel];
    const base = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight);
    const dw = photo.naturalWidth * base * panel.zoom;
    const dh = photo.naturalHeight * base * panel.zoom;
    if (dw > rect.w) panel.ox = clamp01(panel.ox - (p.x - drag.x) / (dw - rect.w));
    if (dh > rect.h) panel.oy = clamp01(panel.oy - (p.y - drag.y) / (dh - rect.h));
    drag.x = p.x;
    drag.y = p.y;
    renderPreview();
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const panel = state.panels[state.selectedPanel];
    if (!panel) return;
    panel.zoom = Math.min(3, Math.max(1, panel.zoom * (1 - ev.deltaY * 0.001)));
    const slider = document.getElementById('zoomSlider');
    slider.value = Math.round(panel.zoom * 100);
    document.getElementById('zoomVal').textContent = Math.round(panel.zoom * 100) + '%';
    renderPreview();
  }, { passive: false });
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function bindControls() {
  document.getElementById('fileInput').addEventListener('change', (ev) => {
    addPhotoFiles(ev.target.files);
    ev.target.value = '';
  });
  document.getElementById('sampleBtn').addEventListener('click', loadSamplePhotos);
  document.getElementById('fillAllBtn').addEventListener('click', () => {
    if (state.pickedPhoto == null || !state.photos[state.pickedPhoto]) return;
    state.panels.forEach((p) => { p.photo = state.pickedPhoto; });
    renderPreview();
  });
  document.getElementById('zoomSlider').addEventListener('input', (ev) => {
    const panel = state.panels[state.selectedPanel];
    if (!panel) return;
    panel.zoom = Number(ev.target.value) / 100;
    document.getElementById('zoomVal').textContent = ev.target.value + '%';
    renderPreview();
  });
  segWire('layoutSeg', 'data-layout', (v) => { state.layout = v; renderPreview(); });
  segWire('gradeSeg', 'data-grade', (v) => { state.grade = v; renderPreview(); });
  segWire('sizeSeg', 'data-size', (v) => { state.size = v; renderPreview(); });
  document.getElementById('grainToggle').addEventListener('change', (ev) => {
    state.grain = ev.target.checked;
    renderPreview();
  });
  document.getElementById('vignetteToggle').addEventListener('change', (ev) => {
    state.vignette = ev.target.checked;
    renderPreview();
  });
  document.getElementById('titleInput').addEventListener('input', (ev) => {
    state.title = ev.target.value;
    renderPreview();
  });
  document.getElementById('captionInput').addEventListener('input', (ev) => {
    state.caption = ev.target.value;
    renderPreview();
  });
  document.getElementById('subtitleInput').addEventListener('input', (ev) => {
    state.subtitle = ev.target.value;
    renderPreview();
  });
  document.getElementById('exportBtn').addEventListener('click', exportPNG);
  window.addEventListener('dragover', (ev) => ev.preventDefault());
  window.addEventListener('drop', (ev) => {
    ev.preventDefault();
    if (ev.dataTransfer && ev.dataTransfer.files.length > 0) addPhotoFiles(ev.dataTransfer.files);
  });
  bindCanvas();
}

/* ------------------------------------------------------------------ shot modes */

const SHOT_PRESETS = {
  cover: { size: '1920x1080', layout: 'grid4', grade: 'sunset' },
  portrait: { size: '1080x1350', layout: 'hero3', grade: 'neon' },
  editor: { size: '1080x1080', layout: 'grid4', grade: 'sunset' },
  wide: { size: '1920x1080', layout: 'fullbleed', grade: 'golden' },
};

function applyShotPreset() {
  const preset = SHOT_PRESETS[shotMode];
  if (!preset) return;
  state.size = preset.size;
  state.layout = preset.layout;
  state.grade = preset.grade;
  if (shotMode === 'cover' || shotMode === 'portrait' || shotMode === 'wide') {
    document.body.classList.add('shot-' + shotMode);
  }
  // Sync the visible control state with the preset.
  const syncSeg = (id, attr, value) => {
    const seg = document.getElementById(id);
    if (!seg) return;
    seg.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('active', b.getAttribute(attr) === value);
    });
  };
  syncSeg('layoutSeg', 'data-layout', state.layout);
  syncSeg('gradeSeg', 'data-grade', state.grade);
  syncSeg('sizeSeg', 'data-size', state.size);
}

/* ------------------------------------------------------------------ boot */

/* Resolves once the first cover is painted — the headless harness waits on it. */
window.__coverReady = (async function boot() {
  applyShotPreset();
  bindControls();
  renderPreview();
  try {
    await Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('40px Pacifico'),
    ]);
  } catch (err) {
    console.warn('font load failed, using system fallback', err);
  }
  await loadSamplePhotos();
  selectPanel(0);
  renderPreview();
  return true;
})();
