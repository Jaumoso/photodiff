const exifSection = document.getElementById("exifSection");
const exifContent = document.getElementById("exifContent");
const exifSearch = document.getElementById("exifSearch");
const exifDiffOnly = document.getElementById("exifDiffOnly");

let exifStore = { data1: null, data2: null, name1: "", name2: "" };

// EXIF category mapping
const CATEGORIES = {
  Camera: [
    "Make",
    "Model",
    "Software",
    "DateTime",
    "DateTimeOriginal",
    "DateTimeDigitized",
    "Artist",
    "Copyright",
  ],
  Lens: [
    "LensModel",
    "LensMake",
    "LensInfo",
    "FocalLength",
    "FocalLengthIn35mmFilm",
    "MaxApertureValue",
  ],
  Exposure: [
    "ExposureTime",
    "FNumber",
    "ISOSpeedRatings",
    "ExposureProgram",
    "ExposureBiasValue",
    "MeteringMode",
    "Flash",
    "WhiteBalance",
    "ExposureMode",
    "BrightnessValue",
    "ShutterSpeedValue",
    "ApertureValue",
  ],
  Image: [
    "ImageWidth",
    "ImageHeight",
    "PixelXDimension",
    "PixelYDimension",
    "Orientation",
    "XResolution",
    "YResolution",
    "ResolutionUnit",
    "ColorSpace",
    "SceneCaptureType",
    "SubjectArea",
  ],
  GPS: [
    "GPSLatitude",
    "GPSLatitudeRef",
    "GPSLongitude",
    "GPSLongitudeRef",
    "GPSAltitude",
    "GPSAltitudeRef",
    "GPSTimeStamp",
    "GPSDateStamp",
  ],
};

export function extractAndDisplayEXIF(file1, file2, name1, name2) {
  exifSection.hidden = false;
  exifStore.name1 = name1;
  exifStore.name2 = name2;

  let done = 0;
  const check = () => {
    if (++done === 2) renderEXIF();
  };

  EXIF.getData(file1, function () {
    exifStore.data1 = EXIF.getAllTags(this);
    exifStore.data1._fileSize = file1.size;
    check();
  });

  EXIF.getData(file2, function () {
    exifStore.data2 = EXIF.getAllTags(this);
    exifStore.data2._fileSize = file2.size;
    check();
  });
}

function renderEXIF() {
  const { data1, data2, name1, name2 } = exifStore;
  if (!data1 || !data2) return;

  const searchTerm = exifSearch.value.toLowerCase();
  const diffOnly = exifDiffOnly.checked;

  const allKeys = new Set([...Object.keys(data1), ...Object.keys(data2)]);

  // Group keys by category
  const grouped = {};
  const otherKeys = [];

  allKeys.forEach((key) => {
    if (key === "thumbnail" || key === "MakerNote") return; // skip binary blobs
    let found = false;
    for (const [cat, keys] of Object.entries(CATEGORIES)) {
      if (keys.includes(key)) {
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(key);
        found = true;
        break;
      }
    }
    if (!found) otherKeys.push(key);
  });

  if (otherKeys.length) grouped["Other"] = otherKeys;

  exifContent.innerHTML = "";

  for (const [category, keys] of Object.entries(grouped)) {
    const filteredKeys = keys.filter((key) => {
      if (searchTerm && !key.toLowerCase().includes(searchTerm)) return false;
      if (diffOnly) {
        const v1 = stringify(data1[key]);
        const v2 = stringify(data2[key]);
        if (v1 === v2) return false;
      }
      return true;
    });

    if (filteredKeys.length === 0) continue;

    const group = document.createElement("div");
    group.className = "exif-group";

    const header = document.createElement("div");
    header.className = "exif-group-header";
    header.innerHTML = `<span class="chevron">▼</span> ${category} <span class="badge">${filteredKeys.length}</span>`;
    header.addEventListener("click", () => group.classList.toggle("collapsed"));

    const table = document.createElement("table");
    table.className = "exif-table";
    table.innerHTML = `<thead><tr><th>Property</th><th>${name1}</th><th>${name2}</th></tr></thead>`;
    const tbody = document.createElement("tbody");

    filteredKeys.forEach((key) => {
      const v1 = stringify(data1[key]);
      const v2 = stringify(data2[key]);
      const match = v1 === v2;
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${key}</td><td class="${match ? "exif-match" : "exif-diff"}">${v1}</td><td class="${match ? "exif-match" : "exif-diff"}">${v2}</td>`;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    group.appendChild(header);
    group.appendChild(table);
    exifContent.appendChild(group);
  }
}

function stringify(val) {
  if (val === undefined || val === null) return "N/A";
  if (Array.isArray(val)) {
    // Try to decode as EXIF UserComment (first 8 bytes = charset id)
    if (
      val.length > 8 &&
      val.every((b) => typeof b === "number" && b >= 0 && b <= 255)
    ) {
      const header = val
        .slice(0, 8)
        .map((b) => String.fromCharCode(b))
        .join("");
      if (header.startsWith("ASCII")) {
        const text = val
          .slice(8)
          .filter((b) => b !== 0)
          .map((b) => String.fromCharCode(b))
          .join("");
        return text || "N/A";
      }
    }
    // Short numeric arrays (GPS coords, SubjectArea, etc.) → join
    if (val.length <= 10) return val.join(", ");
    return `[${val.length} bytes]`;
  }
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

exifSearch.addEventListener("input", renderEXIF);
exifDiffOnly.addEventListener("change", renderEXIF);

export function hideEXIF() {
  exifSection.hidden = true;
}
