export function notify(message) {
  const el = document.getElementById("notification");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3000);
}

export function showLoading() {
  document.getElementById("loadingOverlay").hidden = false;
}

export function hideLoading() {
  document.getElementById("loadingOverlay").hidden = true;
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export function waitForImageLoad(img) {
  return new Promise((resolve) => {
    if (img.complete && img.naturalWidth) resolve();
    else img.onload = () => resolve();
  });
}
