import { formatFileSize } from "./utils.js";

const metricsSection = document.getElementById("metricsSection");
const metricsGrid = document.getElementById("metricsGrid");

export function displayMetrics(data) {
  metricsSection.hidden = false;
  metricsGrid.innerHTML = "";

  const { similarity, sharpness, contrast, resolution, fileSize, names } = data;

  const cards = [
    {
      label: "Similarity",
      value: (similarity * 100).toFixed(1) + "%",
      detail:
        similarity > 0.95
          ? "Nearly identical"
          : similarity > 0.8
            ? "Similar"
            : "Different",
    },
    {
      label: "Resolution",
      value: `${resolution[0][0]}×${resolution[0][1]}`,
      value2: `${resolution[1][0]}×${resolution[1][1]}`,
      compare: resolution[0][0] * resolution[0][1],
      compare2: resolution[1][0] * resolution[1][1],
    },
    {
      label: "File Size",
      value: formatFileSize(fileSize[0]),
      value2: formatFileSize(fileSize[1]),
      compare: fileSize[0],
      compare2: fileSize[1],
      lowerBetter: true,
    },
    {
      label: "Sharpness",
      value: sharpness[0].toFixed(1),
      value2: sharpness[1].toFixed(1),
      compare: sharpness[0],
      compare2: sharpness[1],
    },
    {
      label: "Contrast",
      value: contrast[0].toFixed(1),
      value2: contrast[1].toFixed(1),
      compare: contrast[0],
      compare2: contrast[1],
    },
  ];

  cards.forEach((c) => {
    const card = document.createElement("div");
    card.className = "metric-card";

    if (c.value2 !== undefined) {
      const winner = c.lowerBetter
        ? c.compare <= c.compare2
          ? 0
          : 1
        : c.compare >= c.compare2
          ? 0
          : 1;

      const labelEl = document.createElement("div");
      labelEl.className = "metric-label";
      labelEl.textContent = c.label;

      const valueEl = document.createElement("div");
      valueEl.className = "metric-value";

      const leftEl = document.createElement("span");
      leftEl.className = winner === 0 ? "metric-winner" : "metric-loser";
      leftEl.textContent = c.value;

      const vsEl = document.createElement("span");
      vsEl.style.opacity = "0.3";
      vsEl.style.margin = "0 4px";
      vsEl.textContent = "vs";

      const rightEl = document.createElement("span");
      rightEl.className = winner === 1 ? "metric-winner" : "metric-loser";
      rightEl.textContent = c.value2;

      valueEl.appendChild(leftEl);
      valueEl.appendChild(vsEl);
      valueEl.appendChild(rightEl);

      const detailEl = document.createElement("div");
      detailEl.className = "metric-detail";
      detailEl.textContent = `${names[winner]} wins`;

      card.appendChild(labelEl);
      card.appendChild(valueEl);
      card.appendChild(detailEl);
    } else {
      const labelEl = document.createElement("div");
      labelEl.className = "metric-label";
      labelEl.textContent = c.label;

      const valueEl = document.createElement("div");
      valueEl.className = "metric-value";
      valueEl.textContent = c.value;

      const detailEl = document.createElement("div");
      detailEl.className = "metric-detail";
      detailEl.textContent = c.detail || "";

      card.appendChild(labelEl);
      card.appendChild(valueEl);
      card.appendChild(detailEl);
    }
    metricsGrid.appendChild(card);
  });
}

export function hideMetrics() {
  metricsSection.hidden = true;
}
