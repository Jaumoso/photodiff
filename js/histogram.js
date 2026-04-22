const histogramSection = document.getElementById("histogramSection");
const histCanvas1 = document.getElementById("histCanvas1");
const histCanvas2 = document.getElementById("histCanvas2");
const histLabel1 = document.getElementById("histLabel1");
const histLabel2 = document.getElementById("histLabel2");
const channelButtons = document.querySelectorAll("[data-channel]");

let histData1 = null;
let histData2 = null;
let currentChannel = "all";

channelButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    channelButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentChannel = btn.dataset.channel;
    draw();
  });
});

export function computeHistograms(
  img1Ctx,
  img2Ctx,
  width,
  height,
  name1,
  name2,
) {
  histogramSection.hidden = false;
  histLabel1.textContent = name1;
  histLabel2.textContent = name2;

  histData1 = computeHist(img1Ctx, width, height);
  histData2 = computeHist(img2Ctx, width, height);
  draw();
}

function computeHist(ctx, width, height) {
  const data = ctx.getImageData(0, 0, width, height).data;
  const r = new Uint32Array(256);
  const g = new Uint32Array(256);
  const b = new Uint32Array(256);
  const lum = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    r[data[i]]++;
    g[data[i + 1]]++;
    b[data[i + 2]]++;
    lum[
      Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
    ]++;
  }
  return { r, g, b, lum };
}

function draw() {
  if (!histData1 || !histData2) return;
  drawHist(histCanvas1, histData1);
  drawHist(histCanvas2, histData2);
}

function drawHist(canvas, data) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const channels = [];
  if (currentChannel === "all" || currentChannel === "r")
    channels.push({ arr: data.r, color: "rgba(255,60,60,0.6)" });
  if (currentChannel === "all" || currentChannel === "g")
    channels.push({ arr: data.g, color: "rgba(60,200,60,0.6)" });
  if (currentChannel === "all" || currentChannel === "b")
    channels.push({ arr: data.b, color: "rgba(60,100,255,0.6)" });
  if (currentChannel === "lum")
    channels.push({ arr: data.lum, color: "rgba(200,200,200,0.7)" });

  let maxVal = 0;
  channels.forEach((ch) => {
    for (let i = 0; i < 256; i++) {
      if (ch.arr[i] > maxVal) maxVal = ch.arr[i];
    }
  });

  if (maxVal === 0) return;

  channels.forEach((ch) => {
    ctx.fillStyle = ch.color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i < 256; i++) {
      const barH = (ch.arr[i] / maxVal) * h;
      ctx.lineTo(i * (w / 256), h - barH);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  });
}

export function hideHistograms() {
  histogramSection.hidden = true;
}
