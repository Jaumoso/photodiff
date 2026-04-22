// PhotoDiff — Main entry point
import { addImages, setOnSelectionChange } from "./js/gallery.js";
import { setCompareImages, setMetricsCallback } from "./js/comparison.js";
import { displayMetrics, hideMetrics } from "./js/metrics.js";
import { computeHistograms, hideHistograms } from "./js/histogram.js";
import { extractAndDisplayEXIF, hideEXIF } from "./js/exif.js";
import { showExport, hideExport } from "./js/export.js";
import {
  notify,
  showLoading,
  hideLoading,
  waitForImageLoad,
} from "./js/utils.js";

// ── Theme toggle ──
const themeToggle = document.getElementById("themeToggle");
const savedTheme = localStorage.getItem("photodiff-theme") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("photodiff-theme", next);
});

// ── Drop zone ──
const dropArea = document.getElementById("dropArea");
const fileUpload = document.getElementById("fileUpload");

dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.classList.add("dragover");
});

dropArea.addEventListener("dragleave", () => {
  dropArea.classList.remove("dragover");
});

dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.classList.remove("dragover");
  if (e.dataTransfer.files.length > 0) {
    addImages(Array.from(e.dataTransfer.files));
  }
});

dropArea.addEventListener("click", (e) => {
  if (e.target.tagName !== "LABEL" && e.target.tagName !== "INPUT") {
    fileUpload.click();
  }
});

fileUpload.addEventListener("change", () => {
  if (fileUpload.files.length > 0) {
    addImages(Array.from(fileUpload.files));
    fileUpload.value = "";
  }
});

// ── Paste ──
document.addEventListener("paste", (e) => {
  const files = [];
  for (const item of (e.clipboardData || window.clipboardData).items) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      files.push(item.getAsFile());
    }
  }
  if (files.length > 0) addImages(files);
});

// ── Selection change → trigger comparison ──
setOnSelectionChange(async (selected) => {
  if (selected.length < 2) {
    hideMetrics();
    hideHistograms();
    hideEXIF();
    hideExport();
    document.getElementById("comparatorSection").hidden = true;
    return;
  }

  showLoading();
  try {
    setCompareImages(selected);
  } catch (err) {
    console.error(err);
    notify("Error comparing images");
  } finally {
    hideLoading();
  }
});

// ── Metrics callback from comparison module ──
setMetricsCallback((data) => {
  displayMetrics(data);

  // Histograms: we need canvas contexts from the comparison
  // The comparison module draws to off-screen canvases; we pass them here
  const canvasLeft = document.getElementById("canvasLeft");
  const canvasRight = document.getElementById("canvasRight");
  // Use the comparison's internal canvases — re-derive from the metric data
  // Actually we'll compute from img elements
  const [sel1, sel2] = [data.names[0], data.names[1]];

  // Create temp canvases for histogram
  const [res1, res2] = data.resolution;
  const w = Math.min(res1[0], res2[0]);
  const h = Math.min(res1[1], res2[1]);

  const tc1 = document.createElement("canvas");
  const tc2 = document.createElement("canvas");
  tc1.width = tc2.width = w;
  tc1.height = tc2.height = h;
  const tctx1 = tc1.getContext("2d");
  const tctx2 = tc2.getContext("2d");

  // We need the actual image elements — get from files
  const img1 = new Image();
  const img2 = new Image();
  img1.src = URL.createObjectURL(data.files[0]);
  img2.src = URL.createObjectURL(data.files[1]);

  Promise.all([waitForImageLoad(img1), waitForImageLoad(img2)]).then(() => {
    tctx1.drawImage(img1, 0, 0, w, h);
    tctx2.drawImage(img2, 0, 0, w, h);
    computeHistograms(tctx1, tctx2, w, h, data.names[0], data.names[1]);
    URL.revokeObjectURL(img1.src);
    URL.revokeObjectURL(img2.src);
  });

  // EXIF
  extractAndDisplayEXIF(
    data.files[0],
    data.files[1],
    data.names[0],
    data.names[1],
  );

  // Export
  showExport();
});
