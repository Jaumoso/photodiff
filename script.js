const sliderInput = document.getElementById("sliderInput");
const image1 = document.getElementById("image1");
const image2 = document.getElementById("image2");
const slider = document.getElementById("slider");
const dropArea = document.getElementById("dropArea");
const fileUpload = document.getElementById("fileUpload");
const fileCount = document.getElementById("fileCount");
const exifTableBody = document.querySelector("#exifTable tbody");
import pixelmatch from "https://esm.run/pixelmatch";

let imagesLoaded = 0;
let img1EXIF = null;
let img2EXIF = null;
let img1FileSize = 0;
let img2FileSize = 0;
console.log("pixelmatch loaded:", typeof pixelmatch !== "undefined");

let canvas1, canvas2, canvas3, ctx1, ctx2, diffContext;

function calculateImageSimilarity(img1, img2) {
  canvas1 = document.createElement("canvas");
  canvas2 = document.createElement("canvas");
  canvas3 = document.createElement("canvas");
  ctx1 = canvas1.getContext("2d");
  ctx2 = canvas2.getContext("2d");
  diffContext = canvas3.getContext("2d");

  canvas1.width = img1.width;
  canvas1.height = img1.height;
  canvas2.width = img2.width;
  canvas2.height = img2.height;
  canvas3.width = img2.width;
  canvas3.height = img2.height;

  ctx1.drawImage(img1, 0, 0);
  ctx2.drawImage(img2, 0, 0);

  const imageData1 = ctx1.getImageData(0, 0, canvas1.width, canvas1.height);
  const imageData2 = ctx2.getImageData(0, 0, canvas2.width, canvas2.height);
  const diff = diffContext.createImageData(canvas3.width, canvas3.height);

  const diffCount = pixelmatch(
    imageData1.data,
    imageData2.data,
    diff.data,
    canvas1.width,
    canvas1.height,
    {
      threshold: 0.5,
    }
  );

  const totalPixels = canvas1.width * canvas1.height;
  const similarity = 1 - diffCount / totalPixels;

  // const pixelCount = imageData1.data.length;
  // let diffCount = 0;

  // for (let i = 0; i < pixelCount; i += 4) {
  //   if (
  //     imageData1.data[i] !== imageData2.data[i] ||
  //     imageData1.data[i + 1] !== imageData2.data[i + 1] ||
  //     imageData1.data[i + 2] !== imageData2.data[i + 2]
  //   ) {
  //     diffCount++;
  //   }
  // }

  // const similarityRatio = 1 - diffCount / (pixelCount / 4);
  return similarity;
}

// Add this function to compare image quality
function compareImageQuality(img1, img2) {
  const sharpness1 = calculateSharpness(ctx1, canvas1.width, canvas1.height);
  const sharpness2 = calculateSharpness(ctx2, canvas2.width, canvas2.height);

  const contrast1 = calculateContrast(ctx1, canvas1.width, canvas1.height);
  const contrast2 = calculateContrast(ctx2, canvas2.width, canvas2.height);

  return {
    sharpness: sharpness1 > sharpness2 ? 1 : 2,
    contrast: contrast1 > contrast2 ? 1 : 2,
  };
}

function calculateSharpness(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  let sharpness = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const horizontalDiff = Math.abs(
        imageData.data[idx] - imageData.data[idx + 4]
      );
      const verticalDiff = Math.abs(
        imageData.data[idx] - imageData.data[idx + width * 4]
      );
      sharpness += horizontalDiff + verticalDiff;
    }
  }

  return sharpness / (width * height);
}

function calculateContrast(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  let min = 255;
  let max = 0;

  for (let i = 0; i < imageData.data.length; i += 4) {
    const brightness =
      (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
    if (brightness < min) min = brightness;
    if (brightness > max) max = brightness;
  }

  return max - min;
}

// Function to adjust the height of the image comparator
function adjustHeight() {
  const maxHeight = Math.max(image1.clientHeight, image2.clientHeight);
  dropArea.style.height = `${maxHeight}px`; // Set the height of the drop area
}

// Function to show the EXIF data in the table
function displayEXIF() {
  exifTableBody.innerHTML = "";

  // Show file size in the table
  const fileSizeRow = document.createElement("tr");
  const fileSizeLabelCell = document.createElement("td");
  fileSizeLabelCell.textContent = "File Size (KB)";
  fileSizeRow.appendChild(fileSizeLabelCell);

  const fileSizeImg1Cell = document.createElement("td");
  fileSizeImg1Cell.textContent = (img1FileSize / 1024).toFixed(2) + " KB";
  fileSizeRow.appendChild(fileSizeImg1Cell);

  const fileSizeImg2Cell = document.createElement("td");
  fileSizeImg2Cell.textContent = (img2FileSize / 1024).toFixed(2) + " KB";
  fileSizeRow.appendChild(fileSizeImg2Cell);

  // styling for differences
  const fileSizeMatch =
    fileSizeImg1Cell.textContent === fileSizeImg2Cell.textContent;
  fileSizeImg1Cell.classList.add(fileSizeMatch ? "match" : "diff");
  fileSizeImg2Cell.classList.add(fileSizeMatch ? "match" : "diff");

  exifTableBody.appendChild(fileSizeRow);

  if (img1EXIF && img2EXIF) {
    const exifProperties = new Set([
      ...Object.keys(img1EXIF),
      ...Object.keys(img2EXIF),
    ]);

    exifProperties.forEach((property) => {
      const row = document.createElement("tr");

      const propertyCell = document.createElement("td");
      propertyCell.textContent = property;
      row.appendChild(propertyCell);

      const img1Cell = document.createElement("td");
      img1Cell.textContent = img1EXIF[property] || "N/A";

      const img2Cell = document.createElement("td");
      img2Cell.textContent = img2EXIF[property] || "N/A";

      if (property == "thumbnail" || "UserComment") {
        img1Cell.textContent = JSON.stringify(img1EXIF[property]) || "N/A";
        img2Cell.textContent = JSON.stringify(img2EXIF[property]) || "N/A";
        img1Cell.id = "thumbnail";
        img2Cell.id = "thumbnail";
      }

      row.appendChild(img2Cell);
      row.appendChild(img1Cell);

      // styling for differences
      const exifMatch = img1Cell.textContent === img2Cell.textContent;
      img1Cell.classList.add(exifMatch ? "match" : "diff");
      img2Cell.classList.add(exifMatch ? "match" : "diff");

      exifTableBody.appendChild(row);
    });
  }
}

// Function to extract EXIF data of images
function extractEXIF(file, imageNumber) {
  EXIF.getData(file, function () {
    const allTags = EXIF.getAllTags(this);

    if (imageNumber === 1) {
      img1EXIF = allTags;
      img1FileSize = file.size;
      document.getElementById("img1name").textContent = file.name;
      document.getElementById("image1-name").textContent = file.name; // Set image 1 name
    } else {
      img2EXIF = allTags;
      img2FileSize = file.size;
      document.getElementById("img2name").textContent = file.name;
      document.getElementById("image2-name").textContent = file.name; // Set image 2 name
    }

    displayEXIF(); // Show EXIF and file size in the table
  });
}

// Function to handle file drop
function handleDrop(event) {
  event.preventDefault();
  const files = event.dataTransfer.files;

  if (files.length === 2) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = (function (index) {
        return function (e) {
          if (index === 0) {
            image2.src = e.target.result; // First image goes to image2 (left)
            image2.hidden = false;
            extractEXIF(file, 1); // Extract EXIF of first img
          } else {
            image1.src = e.target.result; // Second image goes to image1 (right)
            image1.hidden = false;
            extractEXIF(file, 2); // Extract EXIF of second img
          }
          imagesLoaded++;
          if (imagesLoaded === 2) {
            sliderInput.hidden = false;
            adjustHeight();
          }
        };
      })(i);

      reader.readAsDataURL(file);
    }
  } else {
    sendNotification("Only 2 files supported");
  }
}

// Function to handle pasting images
function handlePaste(event) {
  const items = (event.clipboardData || window.clipboardData).items;

  let files = [];
  for (const item of items) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      files.push(item.getAsFile());
    }
  }

  if (files.length === 2) {
    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (function (index) {
        return function (e) {
          if (index === 0) {
            image2.src = e.target.result; // First image goes to image2 (left)
            image2.hidden = false;
            extractEXIF(file, 1); // Extract EXIF of first img
          } else {
            image1.src = e.target.result; // Second image goes to image1 (right)
            image1.hidden = false;
            extractEXIF(file, 2); // Extract EXIF of second img
          }
          imagesLoaded++;
          if (imagesLoaded === 2) {
            sliderInput.hidden = false;
            adjustHeight();
          }
        };
      })(index);

      reader.readAsDataURL(file);
    });
  } else {
    sendNotification("Only 2 files supported");
  }
}

function handleUpload() {
  const files = Array.from(fileUpload.files); // Convert FileList to an array

  if (files.length == 2) {
    fileCount.textContent = `2 files selected: ${files[0].name}, ${files[1].name}`;

    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (function (index) {
        return function (e) {
          if (index === 0) {
            image2.src = e.target.result; // First image goes to image2 (left)
            image2.hidden = false;
            extractEXIF(file, 1); // Extract EXIF of first img
          } else {
            image1.src = e.target.result; // Second image goes to image1 (right)
            image1.hidden = false;
            extractEXIF(file, 2); // Extract EXIF of second img
          }
          imagesLoaded++;
          if (imagesLoaded === 2) {
            sliderInput.hidden = false; // Show the slider when both images are loaded
            adjustHeight(); // Adjust layout after images load

            const similarityRatio = calculateImageSimilarity(image1, image2);
            const qualityComparison = compareImageQuality(image1, image2);

            const comparisonResults =
              document.getElementById("comparisonResults");
            comparisonResults.innerHTML = `
              <h3>Image Comparison Results</h3>
              <p>Similarity Ratio: ${(similarityRatio * 100).toFixed(2)}%</p>
              <p>Better Sharpness: Image ${qualityComparison.sharpness}</p>
              <p>Better Contrast: Image ${qualityComparison.contrast}</p>
            `;
          }
        };
      })(index);

      reader.readAsDataURL(file);
    });
  } else {
    fileCount.textContent = "No file selected";
    sendNotification("Only 2 files supported");
    imagesLoaded = 0; // Reset imagesLoaded if the file selection is invalid
  }
}

function sendNotification(message) {
  const notification = document.getElementById("notification");

  // Set the message
  notification.textContent = message;

  // Add the "show" class to make it visible
  notification.classList.add("show");

  // After 3 seconds, remove the show class and hide the notification
  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000); // 3 seconds
}

// Prevent default drag behaviors
dropArea.addEventListener("dragover", (event) => {
  event.preventDefault();
});

dropArea.addEventListener("drop", handleDrop);

// Handle paste event
document.addEventListener("paste", handlePaste);

// Handle file upload button
fileUpload.addEventListener("change", handleUpload);

// Update slider functionality
sliderInput.addEventListener("input", function () {
  const value = this.value; // Get the current value of the slider (0 - 100)

  // Move the slider visually
  slider.style.left = `${value}%`;

  // Adjust the clip-path of the second image to reveal or hide parts of it
  if (image2.src) {
    image2.style.clipPath = `inset(0 ${100 - value}% 0 0)`; // Clipping effect remains unchanged
  }
});
