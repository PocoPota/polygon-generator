const canvas = document.querySelector('#artCanvas');
const ctx = canvas.getContext('2d');

const els = {
  width: document.querySelector('#widthInput'),
  height: document.querySelector('#heightInput'),
  count: document.querySelector('#countInput'),
  size: document.querySelector('#sizeInput'),
  edge: document.querySelector('#edgeInput'),
  countOutput: document.querySelector('#countOutput'),
  sizeOutput: document.querySelector('#sizeOutput'),
  edgeOutput: document.querySelector('#edgeOutput'),
  transparent: document.querySelector('#transparentInput'),
  background: document.querySelector('#backgroundInput'),
  backgroundRow: document.querySelector('#backgroundColorRow'),
  dimension: document.querySelector('#dimensionLabel'),
  refresh: document.querySelector('#refreshButton'),
  download: document.querySelector('#downloadButton'),
  assetDrawer: document.querySelector('#assetDrawer'),
  assetGrid: document.querySelector('#assetGrid'),
  closeAssets: document.querySelector('#closeAssetsButton'),
  seed: document.querySelector('#seedInput'),
  copySeed: document.querySelector('#copySeedButton'),
  toast: document.querySelector('#toast'),
  paletteInputs: [...document.querySelectorAll('#palette input')],
  presets: [...document.querySelectorAll('.preset')],
};

let seed = createSeed();
let renderTimer;
let generatedItems = [];

function createSeed() {
  return `PS-${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0').toUpperCase()}`;
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFromSeed(value) {
  let state = hashString(value);
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function mix(hex, target, amount, alpha = 1) {
  const color = hexToRgb(hex);
  const end = hexToRgb(target);
  const channel = key => Math.round(color[key] + (end[key] - color[key]) * amount);
  return `rgba(${channel('r')},${channel('g')},${channel('b')},${alpha})`;
}

function pointOnEdge(rand, width, height, bias, overscan) {
  if (rand() < bias) {
    const edge = Math.floor(rand() * 4);
    if (edge === 0) return { x: rand() * width, y: rand() * height * .2 - overscan * .35 };
    if (edge === 1) return { x: width - rand() * width * .18 + overscan * .35, y: rand() * height };
    if (edge === 2) return { x: rand() * width, y: height - rand() * height * .2 + overscan * .35 };
    return { x: rand() * width * .18 - overscan * .35, y: rand() * height };
  }
  return { x: rand() * width, y: rand() * height };
}

function polygonPath(context, points) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach(point => context.lineTo(point.x, point.y));
  context.closePath();
}

function fillFace(context, points, colorA, colorB) {
  const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  const gradient = context.createLinearGradient(points[0].x, points[0].y, centerX, centerY);
  gradient.addColorStop(0, colorA);
  gradient.addColorStop(1, colorB);
  polygonPath(context, points);
  context.fillStyle = gradient;
  context.fill();
}

function drawCrystal(context, rand, x, y, radius, rotation, color, opacity) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.globalAlpha = opacity;

  const tall = .75 + rand() * .45;
  const skew = (rand() - .5) * .38;
  const points = [
    { x: -radius * (.55 + rand() * .2), y: radius * (.46 + rand() * .16) },
    { x: radius * (.64 + rand() * .24), y: radius * (.5 + rand() * .15) },
    { x: radius * skew, y: -radius * tall },
    { x: radius * (skew * .35 + (rand() - .5) * .12), y: radius * (.03 + rand() * .12) },
  ];

  context.shadowColor = 'rgba(28,20,18,.12)';
  context.shadowBlur = radius * .18;
  context.shadowOffsetY = radius * .1;
  fillFace(context, [points[0], points[2], points[3]], mix(color, '#ffffff', .18), mix(color, '#24102d', .12));
  context.shadowColor = 'transparent';
  fillFace(context, [points[2], points[1], points[3]], mix(color, '#ffffff', .58), mix(color, '#ffffff', .04));
  fillFace(context, [points[0], points[3], points[1]], mix(color, '#21072e', .22), mix(color, '#ffffff', .38));

  if (rand() > .44) {
    const tip = { x: points[2].x + radius * (.28 + rand() * .26), y: points[2].y + radius * (.22 + rand() * .14) };
    fillFace(context, [points[2], tip, points[1]], mix(color, '#ffffff', .72), mix(color, '#ffffff', .12));
  }

  context.restore();
}

function draw() {
  const width = Math.min(4096, Math.max(320, Number(els.width.value) || 1200));
  const height = Math.min(4096, Math.max(320, Number(els.height.value) || 1200));
  els.width.value = width;
  els.height.value = height;
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);

  if (!els.transparent.checked) {
    ctx.fillStyle = els.background.value;
    ctx.fillRect(0, 0, width, height);
  }

  const rand = randomFromSeed(seed);
  const colors = els.paletteInputs.map(input => input.value);
  const count = Number(els.count.value);
  const baseSize = Number(els.size.value) / 1200 * Math.min(width, height);
  const edgeBias = Number(els.edge.value) / 100;

  generatedItems = [];
  for (let i = 0; i < count; i++) {
    const radius = baseSize * (.55 + rand() * .9);
    const point = pointOnEdge(rand, width, height, edgeBias, radius);
    const color = colors[Math.floor(rand() * colors.length)];
    const rotation = rand() * Math.PI * 2;
    const opacity = .78 + rand() * .22;
    const shapeSeed = `${seed}-POLY-${i + 1}`;
    generatedItems.push({ color, rotation, shapeSeed });
    drawCrystal(ctx, randomFromSeed(shapeSeed), point.x, point.y, radius, rotation, color, opacity);
  }

  els.countOutput.value = count;
  els.sizeOutput.value = baseSize < Math.min(width, height) * .075 ? '小' : baseSize > Math.min(width, height) * .13 ? '大' : '中';
  els.edgeOutput.value = `${els.edge.value}%`;
  els.dimension.textContent = `${width} × ${height} PX`;
  els.seed.value = seed;
  els.backgroundRow.classList.toggle('disabled', els.transparent.checked);
  updateCanvasRatio(width, height);
  if (els.assetDrawer.classList.contains('open')) renderAssetGrid();
}

function renderSingleAsset(item, targetCanvas) {
  const size = 512;
  targetCanvas.width = size;
  targetCanvas.height = size;
  const context = targetCanvas.getContext('2d');
  context.clearRect(0, 0, size, size);
  drawCrystal(context, randomFromSeed(item.shapeSeed), size / 2, size / 2, 150, item.rotation, item.color, 1);
}

function renderAssetGrid() {
  els.assetGrid.replaceChildren();
  generatedItems.forEach((item, index) => {
    const card = document.createElement('article');
    card.className = 'asset-card';
    const preview = document.createElement('canvas');
    renderSingleAsset(item, preview);
    const footer = document.createElement('footer');
    const label = document.createElement('small');
    label.textContent = `ポリゴン ${String(index + 1).padStart(2, '0')}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.title = `ポリゴン ${index + 1} を保存`;
    button.setAttribute('aria-label', button.title);
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 20h14"/></svg>';
    button.addEventListener('click', () => {
      const exportCanvas = document.createElement('canvas');
      renderSingleAsset(item, exportCanvas);
      const link = document.createElement('a');
      link.download = `poly-scatter-${String(index + 1).padStart(2, '0')}-${seed.toLowerCase()}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
      showToast(`ポリゴン ${String(index + 1).padStart(2, '0')} を保存しました`);
    });
    footer.append(label, button);
    card.append(preview, footer);
    els.assetGrid.append(card);
  });
}

function updateCanvasRatio(width, height) {
  const stage = document.querySelector('#canvasStage');
  const availableWidth = Math.max(200, stage.clientWidth - 76);
  const availableHeight = Math.max(200, stage.clientHeight - 76);
  const scale = Math.min(availableWidth / width, availableHeight / height);
  canvas.style.width = `${Math.round(width * scale)}px`;
  canvas.style.height = `${Math.round(height * scale)}px`;
}

function scheduleDraw() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(draw, 40);
}

function newComposition() {
  seed = createSeed();
  draw();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove('show'), 1500);
}

document.querySelector('#controlsForm').addEventListener('input', event => {
  if (event.target.type === 'color') {
    event.target.closest('label')?.style.setProperty('--swatch', event.target.value);
  }
  scheduleDraw();
});

els.presets.forEach(button => button.addEventListener('click', () => {
  const [width, height] = button.dataset.size.split(',');
  els.width.value = width;
  els.height.value = height;
  els.presets.forEach(item => item.classList.toggle('active', item === button));
  draw();
}));

[els.width, els.height].forEach(input => input.addEventListener('input', () => {
  els.presets.forEach(button => button.classList.remove('active'));
}));

els.refresh.addEventListener('click', newComposition);

els.download.addEventListener('click', () => {
  renderAssetGrid();
  els.assetDrawer.classList.add('open');
  els.assetDrawer.setAttribute('aria-hidden', 'false');
});

els.closeAssets.addEventListener('click', () => {
  els.assetDrawer.classList.remove('open');
  els.assetDrawer.setAttribute('aria-hidden', 'true');
});

els.copySeed.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(seed);
    showToast('シードをコピーしました');
  } catch {
    showToast(seed);
  }
});

els.seed.addEventListener('change', () => {
  const nextSeed = els.seed.value.trim().toUpperCase();
  seed = nextSeed || createSeed();
  draw();
});

window.addEventListener('resize', () => updateCanvasRatio(canvas.width, canvas.height));
draw();
