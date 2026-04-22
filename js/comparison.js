import pixelmatch from "https://esm.run/pixelmatch";
import { waitForImageLoad } from "./utils.js";

// ── State ──
let currentMode = "slider";
let sliderPos = 50;
let img1Data = null;
let img2Data = null;
let diffCanvas = null;
let diffCtx = null;
let highlightCanvas = null; // diff overlay on original
let compareWidth = 0;
let compareHeight = 0;
let isDragging = false;
let zoomLevel = 1;
let panX = 0,
  panY = 0;
let isPanning = false;
let panStartX = 0,
  panStartY = 0;
let flickerShowFirst = true;
let flickerInterval = null;

// ── DOM refs ──
const comparatorSection = document.getElementById("comparatorSection");
const viewport = document.getElementById("compareViewport");
const container = document.getElementById("compareContainer");
const canvasLeft = document.getElementById("canvasLeft");
const canvasRight = document.getElementById("canvasRight");
const canvasDiff = document.getElementById("canvasDiff");
const sliderHandle = document.getElementById("sliderHandle");
const labelLeft = document.getElementById("labelLeft");
const labelRight = document.getElementById("labelRight");
const onionControls = document.getElementById("onionControls");
const onionOpacity = document.getElementById("onionOpacity");
const onionValue = document.getElementById("onionValue");
const zoomResetBtn = document.getElementById("zoomResetBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const magnifierEl = document.getElementById("magnifier");
const magnifierToggle = document.getElementById("magnifierToggle");
const magnifierCanvas = document.getElementById("magnifierCanvas");

const modeButtons = document.querySelectorAll("[data-mode]");

let metricsCallback = null;
export function setMetricsCallback(cb) {
  metricsCallback = cb;
}

// ── Set images ──
export function setCompareImages(selected) {
  if (selected.length < 2) {
    comparatorSection.hidden = true;
    stopFlicker();
    return;
  }
  comparatorSection.hidden = false;

  const [a, b] = selected;

  Promise.all([waitForImageLoad(a.imgEl), waitForImageLoad(b.imgEl)]).then(
    () => {
      compareWidth = Math.min(a.imgEl.naturalWidth, b.imgEl.naturalWidth);
      compareHeight = Math.min(a.imgEl.naturalHeight, b.imgEl.naturalHeight);

      const c1 = document.createElement("canvas");
      const c2 = document.createElement("canvas");
      c1.width = c2.width = compareWidth;
      c1.height = c2.height = compareHeight;
      const ctx1 = c1.getContext("2d", { willReadFrequently: true });
      const ctx2 = c2.getContext("2d", { willReadFrequently: true });
      ctx1.drawImage(a.imgEl, 0, 0, compareWidth, compareHeight);
      ctx2.drawImage(b.imgEl, 0, 0, compareWidth, compareHeight);

      img1Data = {
        imgEl: a.imgEl,
        name: a.name,
        canvas: c1,
        ctx: ctx1,
        width: compareWidth,
        height: compareHeight,
        file: a.file,
      };
      img2Data = {
        imgEl: b.imgEl,
        name: b.name,
        canvas: c2,
        ctx: ctx2,
        width: compareWidth,
        height: compareHeight,
        file: b.file,
      };

      labelLeft.textContent = a.name;
      labelRight.textContent = b.name;

      // Build pure diff
      diffCanvas = document.createElement("canvas");
      diffCanvas.width = compareWidth;
      diffCanvas.height = compareHeight;
      diffCtx = diffCanvas.getContext("2d");

      const id1 = ctx1.getImageData(0, 0, compareWidth, compareHeight);
      const id2 = ctx2.getImageData(0, 0, compareWidth, compareHeight);
      const diffImg = diffCtx.createImageData(compareWidth, compareHeight);
      const diffCount = pixelmatch(
        id1.data,
        id2.data,
        diffImg.data,
        compareWidth,
        compareHeight,
        { threshold: 0.1 },
      );
      diffCtx.putImageData(diffImg, 0, 0);

      // Build highlight overlay: original image with red overlay where pixels differ
      highlightCanvas = document.createElement("canvas");
      highlightCanvas.width = compareWidth;
      highlightCanvas.height = compareHeight;
      const hlCtx = highlightCanvas.getContext("2d");
      hlCtx.drawImage(c1, 0, 0);
      const hlData = hlCtx.getImageData(0, 0, compareWidth, compareHeight);
      for (let i = 0; i < diffImg.data.length; i += 4) {
        // If diff pixel is not black (has color), this pixel differs
        if (
          diffImg.data[i] > 0 ||
          diffImg.data[i + 1] > 0 ||
          diffImg.data[i + 2] > 0
        ) {
          hlData.data[i] = Math.min(255, hlData.data[i] * 0.3 + 255 * 0.7); // R
          hlData.data[i + 1] = Math.round(hlData.data[i + 1] * 0.3); // G
          hlData.data[i + 2] = Math.round(hlData.data[i + 2] * 0.3); // B
        }
      }
      hlCtx.putImageData(hlData, 0, 0);

      const totalPixels = compareWidth * compareHeight;
      const similarity = 1 - diffCount / totalPixels;

      const sharpness1 = calculateSharpness(ctx1, compareWidth, compareHeight);
      const sharpness2 = calculateSharpness(ctx2, compareWidth, compareHeight);
      const contrast1 = calculateContrast(ctx1, compareWidth, compareHeight);
      const contrast2 = calculateContrast(ctx2, compareWidth, compareHeight);

      if (metricsCallback) {
        metricsCallback({
          similarity,
          sharpness: [sharpness1, sharpness2],
          contrast: [contrast1, contrast2],
          resolution: [
            [a.imgEl.naturalWidth, a.imgEl.naturalHeight],
            [b.imgEl.naturalWidth, b.imgEl.naturalHeight],
          ],
          fileSize: [a.size, b.size],
          names: [a.name, b.name],
          files: [a.file, b.file],
        });
      }

      zoomLevel = 1;
      panX = 0;
      panY = 0;
      sliderPos = 50;
      stopFlicker();
      renderMode();
    },
  );
}

// ── Render ──
function getDisplaySize() {
  const maxW = viewport.clientWidth || 800;
  const isSbs = currentMode === "side-by-side";
  const availW = isSbs ? Math.floor((maxW - 8) / 2) : maxW;
  const scale = Math.min(availW / compareWidth, 1);
  return {
    w: Math.round(compareWidth * scale),
    h: Math.round(compareHeight * scale),
    scale,
  };
}

function renderMode() {
  if (!img1Data || !img2Data) return;

  const isSbs = currentMode === "side-by-side";
  const { w: displayW, h: displayH } = getDisplaySize();

  // Container layout
  container.classList.toggle("sbs", isSbs);
  if (isSbs) {
    container.style.width = displayW * 2 + 8 + "px";
    container.style.height = displayH + "px";
    viewport.style.minHeight = displayH + "px";
  } else {
    container.style.width = displayW + "px";
    container.style.height = displayH + "px";
    viewport.style.minHeight = displayH + "px";
  }

  // Configure canvases
  [canvasLeft, canvasRight, canvasDiff].forEach((c) => {
    c.width = compareWidth;
    c.height = compareHeight;
    c.style.width = displayW + "px";
    c.style.height = displayH + "px";
  });

  const ctxL = canvasLeft.getContext("2d");
  const ctxR = canvasRight.getContext("2d");
  const ctxD = canvasDiff.getContext("2d");
  ctxL.clearRect(0, 0, compareWidth, compareHeight);
  ctxR.clearRect(0, 0, compareWidth, compareHeight);
  ctxD.clearRect(0, 0, compareWidth, compareHeight);

  // Reset visibility/styles
  canvasLeft.hidden = false;
  canvasRight.hidden = false;
  canvasDiff.hidden = true;
  sliderHandle.hidden = true;
  onionControls.hidden = true;
  canvasRight.style.clipPath = "";
  canvasLeft.style.clipPath = "";
  canvasRight.style.opacity = "";
  canvasLeft.style.opacity = "";
  canvasLeft.style.position = "";
  canvasRight.style.position = "";

  // Zoom/pan transform
  const transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
  container.style.transform = transform;
  container.style.transformOrigin = "center center";

  // Labels
  labelLeft.style.display = "";
  labelRight.style.display = "";

  if (currentMode === "slider") {
    ctxL.drawImage(img1Data.canvas, 0, 0);
    ctxR.drawImage(img2Data.canvas, 0, 0);
    canvasRight.style.clipPath = `inset(0 ${100 - sliderPos}% 0 0)`;
    sliderHandle.hidden = false;
    sliderHandle.style.left = sliderPos + "%";
  } else if (currentMode === "side-by-side") {
    // True side by side: both canvases flow next to each other
    canvasLeft.style.position = "relative";
    canvasRight.style.position = "relative";
    ctxL.drawImage(img1Data.canvas, 0, 0);
    ctxR.drawImage(img2Data.canvas, 0, 0);
  } else if (currentMode === "diff") {
    canvasLeft.hidden = true;
    canvasRight.hidden = true;
    canvasDiff.hidden = false;
    ctxD.drawImage(diffCanvas, 0, 0);
    labelLeft.style.display = "none";
    labelRight.style.display = "none";
  } else if (currentMode === "highlight") {
    canvasRight.hidden = true;
    canvasDiff.hidden = true;
    ctxL.drawImage(highlightCanvas, 0, 0);
    labelRight.style.display = "none";
  } else if (currentMode === "onion") {
    ctxL.drawImage(img1Data.canvas, 0, 0);
    ctxR.drawImage(img2Data.canvas, 0, 0);
    canvasRight.style.opacity = parseInt(onionOpacity.value) / 100;
    onionControls.hidden = false;
  } else if (currentMode === "flicker") {
    if (flickerShowFirst) {
      ctxL.drawImage(img1Data.canvas, 0, 0);
      canvasRight.hidden = true;
    } else {
      canvasLeft.hidden = true;
      ctxR.drawImage(img2Data.canvas, 0, 0);
    }
  }
}

// ── Flicker ──
function startFlicker() {
  stopFlicker();
  flickerShowFirst = true;
  flickerInterval = setInterval(() => {
    flickerShowFirst = !flickerShowFirst;
    renderMode();
  }, 500);
}

function stopFlicker() {
  if (flickerInterval) {
    clearInterval(flickerInterval);
    flickerInterval = null;
  }
}

// ── Slider dragging ──
function getSliderPosFromEvent(e) {
  const rect = container.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
}

sliderHandle.addEventListener("mousedown", (e) => {
  isDragging = true;
  e.preventDefault();
});
sliderHandle.addEventListener(
  "touchstart",
  () => {
    isDragging = true;
  },
  { passive: true },
);

document.addEventListener("mousemove", (e) => {
  if (isDragging) {
    sliderPos = getSliderPosFromEvent(e);
    renderMode();
  }
});
document.addEventListener(
  "touchmove",
  (e) => {
    if (isDragging) {
      sliderPos = getSliderPosFromEvent(e);
      renderMode();
    }
  },
  { passive: true },
);
document.addEventListener("mouseup", () => {
  isDragging = false;
});
document.addEventListener("touchend", () => {
  isDragging = false;
});

viewport.addEventListener("click", (e) => {
  if (currentMode === "slider" && !isDragging) {
    sliderPos = getSliderPosFromEvent(e);
    renderMode();
  }
});

// ── Mode buttons ──
modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const prev = currentMode;
    modeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;
    if (prev === "flicker") stopFlicker();
    if (currentMode === "flicker") startFlicker();
    renderMode();
  });
});

// ── Onion opacity ──
onionOpacity.addEventListener("input", () => {
  onionValue.textContent = onionOpacity.value + "%";
  if (currentMode === "onion") renderMode();
});

// ── Zoom (follows cursor) ──
viewport.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Point in container coords before zoom
    const cx = (mx - rect.width / 2) / zoomLevel - panX;
    const cy = (my - rect.height / 2) / zoomLevel - panY;

    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(10, zoomLevel * factor));

    // Adjust pan so the point under cursor stays fixed
    panX = (mx - rect.width / 2) / newZoom - cx;
    panY = (my - rect.height / 2) / newZoom - cy;
    zoomLevel = newZoom;

    renderMode();
  },
  { passive: false },
);

zoomResetBtn.addEventListener("click", () => {
  zoomLevel = 1;
  panX = 0;
  panY = 0;
  renderMode();
});

// ── Pan (right-click drag, middle-click, or ctrl/meta+drag) ──
viewport.addEventListener("mousedown", (e) => {
  if (e.button === 2 || e.button === 1 || e.ctrlKey || e.metaKey) {
    isPanning = true;
    panStartX = e.clientX / zoomLevel - panX;
    panStartY = e.clientY / zoomLevel - panY;
    e.preventDefault();
  }
});

viewport.addEventListener("contextmenu", (e) => e.preventDefault());

document.addEventListener("mousemove", (e) => {
  if (!isPanning) return;
  panX = e.clientX / zoomLevel - panStartX;
  panY = e.clientY / zoomLevel - panStartY;
  renderMode();
});

document.addEventListener("mouseup", () => {
  isPanning = false;
});

// Touch pan (two-finger)
let lastTouchDist = 0;
let lastTouchCenter = null;
viewport.addEventListener(
  "touchstart",
  (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      lastTouchCenter = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    }
  },
  { passive: true },
);

viewport.addEventListener(
  "touchmove",
  (e) => {
    if (e.touches.length === 2 && !isDragging) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const center = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };

      if (lastTouchDist > 0) {
        zoomLevel = Math.max(
          0.5,
          Math.min(10, zoomLevel * (dist / lastTouchDist)),
        );
      }
      if (lastTouchCenter) {
        panX += (center.x - lastTouchCenter.x) / zoomLevel;
        panY += (center.y - lastTouchCenter.y) / zoomLevel;
      }
      lastTouchDist = dist;
      lastTouchCenter = center;
      renderMode();
    }
  },
  { passive: false },
);

viewport.addEventListener("touchend", () => {
  lastTouchDist = 0;
  lastTouchCenter = null;
});

// ── Fullscreen ──
fullscreenBtn.addEventListener("click", () => {
  viewport.classList.toggle("fullscreen");
  setTimeout(() => renderMode(), 100);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && viewport.classList.contains("fullscreen")) {
    viewport.classList.remove("fullscreen");
    renderMode();
  }
});

// ── Magnifying Glass ──
const MAGNIFIER_SIZE = 180;
const MAGNIFIER_ZOOM = 3;

magnifierCanvas.width = MAGNIFIER_SIZE;
magnifierCanvas.height = MAGNIFIER_SIZE;

viewport.addEventListener("mousemove", (e) => {
  if (!magnifierToggle.checked || !img1Data) {
    magnifierEl.hidden = true;
    return;
  }

  const rect = viewport.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  // Position magnifier (offset so it doesn't cover cursor)
  magnifierEl.hidden = false;
  const magX = mx + 20;
  const magY = my - MAGNIFIER_SIZE - 10;
  magnifierEl.style.left =
    (magX + MAGNIFIER_SIZE > rect.width ? mx - MAGNIFIER_SIZE - 10 : magX) +
    "px";
  magnifierEl.style.top = (magY < 0 ? my + 20 : magY) + "px";

  // Compute source coordinates in original image
  const cRect = container.getBoundingClientRect();

  // For SBS mode, use the canvas the cursor is actually over
  let sbsCanvasWidth = cRect.width;
  if (currentMode === "side-by-side") {
    sbsCanvasWidth = (cRect.width - 8) / 2; // account for gap
  }

  const scaleX = compareWidth / (sbsCanvasWidth / zoomLevel);
  const scaleY = compareHeight / (cRect.height / zoomLevel);

  let imgX, imgY;
  if (currentMode === "side-by-side") {
    // Determine which half the cursor is in
    const relX = e.clientX - cRect.left;
    const halfW = (cRect.width - 8) / 2;
    const localX = relX > halfW + 8 ? relX - halfW - 8 : relX;
    imgX = ((localX / zoomLevel) * scaleX) / zoomLevel;
    imgY = (((e.clientY - cRect.top) / zoomLevel) * scaleY) / zoomLevel;
  } else {
    imgX = (((e.clientX - cRect.left) / zoomLevel) * scaleX) / zoomLevel;
    imgY = (((e.clientY - cRect.top) / zoomLevel) * scaleY) / zoomLevel;
  }

  const ctx = magnifierCanvas.getContext("2d");
  ctx.clearRect(0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);

  const srcSize = MAGNIFIER_SIZE / MAGNIFIER_ZOOM;
  const isSingleSource = currentMode === "diff" || currentMode === "highlight";

  if (isSingleSource) {
    // Single source: diff map or highlight overlay
    const srcCanvas = currentMode === "diff" ? diffCanvas : highlightCanvas;
    ctx.drawImage(
      srcCanvas,
      imgX - srcSize / 2,
      imgY - srcSize / 2,
      srcSize,
      srcSize,
      0,
      0,
      MAGNIFIER_SIZE,
      MAGNIFIER_SIZE,
    );
  } else {
    // Split view: left half = img1, right half = img2
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, MAGNIFIER_SIZE / 2, MAGNIFIER_SIZE);
    ctx.clip();
    ctx.drawImage(
      img1Data.canvas,
      imgX - srcSize / 2,
      imgY - srcSize / 2,
      srcSize,
      srcSize,
      0,
      0,
      MAGNIFIER_SIZE,
      MAGNIFIER_SIZE,
    );
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(MAGNIFIER_SIZE / 2, 0, MAGNIFIER_SIZE / 2, MAGNIFIER_SIZE);
    ctx.clip();
    ctx.drawImage(
      img2Data.canvas,
      imgX - srcSize / 2,
      imgY - srcSize / 2,
      srcSize,
      srcSize,
      0,
      0,
      MAGNIFIER_SIZE,
      MAGNIFIER_SIZE,
    );
    ctx.restore();

    // Divider line
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(MAGNIFIER_SIZE / 2, 0);
    ctx.lineTo(MAGNIFIER_SIZE / 2, MAGNIFIER_SIZE);
    ctx.stroke();
  }

  // Crosshair
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MAGNIFIER_SIZE / 2, 0);
  ctx.lineTo(MAGNIFIER_SIZE / 2, MAGNIFIER_SIZE);
  ctx.moveTo(0, MAGNIFIER_SIZE / 2);
  ctx.lineTo(MAGNIFIER_SIZE, MAGNIFIER_SIZE / 2);
  ctx.stroke();
});

viewport.addEventListener("mouseleave", () => {
  magnifierEl.hidden = true;
});

// ── Color Picker ──
const colorPickerToggle = document.getElementById("colorPickerToggle");
const colorPickerTooltip = document.getElementById("colorPickerTooltip");
const colorSwatch = document.getElementById("colorSwatch");
const colorValueEl = document.getElementById("colorValue");

viewport.addEventListener("mousemove", (e) => {
  if (!colorPickerToggle.checked || !img1Data) return;
  const rect = canvasLeft.getBoundingClientRect();
  const x = Math.floor(((e.clientX - rect.left) / rect.width) * compareWidth);
  const y = Math.floor(((e.clientY - rect.top) / rect.height) * compareHeight);
  if (x < 0 || y < 0 || x >= compareWidth || y >= compareHeight) {
    colorPickerTooltip.hidden = true;
    return;
  }
  const pixel = img1Data.ctx.getImageData(x, y, 1, 1).data;
  const hex =
    "#" +
    [pixel[0], pixel[1], pixel[2]]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
  colorSwatch.style.background = hex;
  colorValueEl.textContent = `${hex} · rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
  colorPickerTooltip.hidden = false;
  const vpRect = viewport.getBoundingClientRect();
  colorPickerTooltip.style.left = e.clientX - vpRect.left + 16 + "px";
  colorPickerTooltip.style.top = e.clientY - vpRect.top - 10 + "px";
});

viewport.addEventListener("mouseleave", () => {
  colorPickerTooltip.hidden = true;
});

viewport.addEventListener("click", (e) => {
  if (!colorPickerToggle.checked) return;
  const text = colorValueEl.textContent.split(" ")[0];
  if (text && navigator.clipboard) navigator.clipboard.writeText(text);
});

// ── Helpers ──
function calculateSharpness(ctx, width, height) {
  const d = ctx.getImageData(0, 0, width, height).data;
  let s = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      s += Math.abs(d[i] - d[i + 4]) + Math.abs(d[i] - d[i + width * 4]);
    }
  }
  return s / (width * height);
}

function calculateContrast(ctx, width, height) {
  const d = ctx.getImageData(0, 0, width, height).data;
  let min = 255,
    max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const b = (d[i] + d[i + 1] + d[i + 2]) / 3;
    if (b < min) min = b;
    if (b > max) max = b;
  }
  return max - min;
}

export function getDiffCanvas() {
  return diffCanvas;
}
