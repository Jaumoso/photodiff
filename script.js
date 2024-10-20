const sliderInput = document.getElementById("sliderInput");
const image1 = document.getElementById("image1");
const image2 = document.getElementById("image2");
const slider = document.getElementById("slider");
const dropArea = document.getElementById("dropArea");
const fileUpload = document.getElementById("fileUpload");
const fileCount = document.getElementById("fileCount");
const exifTableBody = document.querySelector("#exifTable tbody");

let imagesLoaded = 0;
let img1EXIF = null;
let img2EXIF = null;
let img1FileSize = 0;
let img2FileSize = 0;

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

      if (property == "thumbnail") {
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
