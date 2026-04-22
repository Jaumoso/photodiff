import { getDiffCanvas } from "./comparison.js";

const exportSection = document.getElementById("exportSection");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const exportDiffBtn = document.getElementById("exportDiffBtn");

let currentExifData = null;

export function showExport(exifStore) {
  exportSection.hidden = false;
  currentExifData = exifStore;
}

export function hideExport() {
  exportSection.hidden = true;
}

exportCsvBtn.addEventListener("click", () => {
  const exifContent = document.getElementById("exifContent");
  const tables = exifContent.querySelectorAll(".exif-table");
  let csv = "Property,Image 1,Image 2\n";
  tables.forEach((table) => {
    table.querySelectorAll("tbody tr").forEach((tr) => {
      const cells = tr.querySelectorAll("td");
      if (cells.length === 3) {
        const row = Array.from(cells).map(
          (c) => '"' + c.textContent.replace(/"/g, '""') + '"',
        );
        csv += row.join(",") + "\n";
      }
    });
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "photodiff-metadata.csv";
  a.click();
  URL.revokeObjectURL(url);
});

exportDiffBtn.addEventListener("click", () => {
  const diffCanvas = getDiffCanvas();
  if (!diffCanvas) return;
  const url = diffCanvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = "photodiff-difference-map.png";
  a.click();
});
