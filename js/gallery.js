import { formatFileSize } from "./utils.js";

// State: array of { id, file, name, size, url, imgEl }
let images = [];
let selectedIds = []; // max 2
let idCounter = 0;
let onSelectionChange = null;

const gallerySection = document.getElementById("gallerySection");
const galleryEl = document.getElementById("gallery");
const imageCountEl = document.getElementById("imageCount");
const selectionHintEl = document.getElementById("selectionHint");
const clearAllBtn = document.getElementById("clearAllBtn");

export function setOnSelectionChange(cb) {
  onSelectionChange = cb;
}

export function getSelectedImages() {
  return selectedIds
    .map((id) => images.find((img) => img.id === id))
    .filter(Boolean);
}

export function getAllImages() {
  return [...images];
}

export function addImages(files) {
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const id = ++idCounter;
    const url = URL.createObjectURL(file);
    const imgEl = new Image();
    imgEl.src = url;
    images.push({ id, file, name: file.name, size: file.size, url, imgEl });
  }
  render();
  // Auto-select first 2 if nothing selected
  if (selectedIds.length === 0 && images.length >= 2) {
    selectedIds = [images[0].id, images[1].id];
    render();
    fireChange();
  } else if (selectedIds.length === 1 && images.length >= 2) {
    const unselected = images.find((i) => !selectedIds.includes(i.id));
    if (unselected) {
      selectedIds.push(unselected.id);
      render();
      fireChange();
    }
  }
}

function removeImage(id) {
  const img = images.find((i) => i.id === id);
  if (img) URL.revokeObjectURL(img.url);
  images = images.filter((i) => i.id !== id);
  selectedIds = selectedIds.filter((sid) => sid !== id);
  render();
  fireChange();
}

function toggleSelect(id) {
  const idx = selectedIds.indexOf(id);
  if (idx !== -1) {
    selectedIds.splice(idx, 1);
  } else {
    if (selectedIds.length >= 2) {
      selectedIds.shift(); // remove oldest selection
    }
    selectedIds.push(id);
  }
  render();
  fireChange();
}

function fireChange() {
  if (onSelectionChange) onSelectionChange(getSelectedImages());
}

function render() {
  gallerySection.hidden = images.length === 0;
  imageCountEl.textContent = images.length;

  const selCount = selectedIds.length;
  if (selCount === 2) {
    selectionHintEl.textContent = "2 images selected — comparing";
  } else if (selCount === 1) {
    selectionHintEl.textContent = "Select 1 more image to compare";
  } else {
    selectionHintEl.textContent = "Select 2 images to compare";
  }

  galleryEl.innerHTML = "";
  images.forEach((img, i) => {
    const isSelected = selectedIds.includes(img.id);
    const selIdx = selectedIds.indexOf(img.id);

    const item = document.createElement("div");
    item.className = "gallery-item" + (isSelected ? " selected" : "");

    item.innerHTML = `
      <div class="select-badge">${isSelected ? selIdx + 1 : ""}</div>
      <img class="thumb" src="${img.url}" alt="${img.name}" />
      <div class="info">
        <span class="name" title="${img.name}">${img.name}</span>
        ${formatFileSize(img.size)}
      </div>
      <button class="remove-btn" title="Remove">×</button>
    `;

    item.querySelector(".remove-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      removeImage(img.id);
    });

    item.addEventListener("click", () => toggleSelect(img.id));
    galleryEl.appendChild(item);
  });
}

clearAllBtn.addEventListener("click", () => {
  images.forEach((img) => URL.revokeObjectURL(img.url));
  images = [];
  selectedIds = [];
  render();
  fireChange();
});

export function clearAll() {
  clearAllBtn.click();
}
