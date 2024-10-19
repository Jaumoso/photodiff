const sliderInput = document.getElementById("sliderInput");
const image1 = document.getElementById("image1");
const image2 = document.getElementById("image2");
const slider = document.getElementById("slider");
const dropArea = document.getElementById("dropArea");

let imagesLoaded = 0;

// Function to adjust the height of the image comparator
function adjustHeight() {
  const maxHeight = Math.max(image1.clientHeight, image2.clientHeight);
  dropArea.style.height = `${maxHeight}px`; // Set the height of the drop area
}

// Function to handle file drop
function handleDrop(event) {
  event.preventDefault();
  const files =
    event.dataTransfer.files ||
    event.clipboardData ||
    event.clipboardData.items;

  if (files.length === 2) {
    // Check if exactly two files are dropped
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = (function (index) {
        return function (e) {
          if (index === 0) {
            image1.src = e.target.result; // Load first image
            image1.hidden = false; // Show image
          } else {
            image2.src = e.target.result; // Load second image
            image2.hidden = false; // Show image
          }
          imagesLoaded++;
          if (imagesLoaded === 2) {
            sliderInput.hidden = false; // Show slider after both images are loaded
            adjustHeight(); // Adjust the height of the comparator
          }
        };
      })(i);

      reader.readAsDataURL(file); // Read the image as data URL
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
    // Check if exactly two images are pasted
    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (function (index) {
        return function (e) {
          if (index === 0) {
            image1.src = e.target.result; // Load first image
            image1.hidden = false; // Show image
          } else {
            image2.src = e.target.result; // Load second image
            image2.hidden = false; // Show image
          }
          imagesLoaded++;
          if (imagesLoaded === 2) {
            sliderInput.hidden = false; // Show slider after both images are loaded
            adjustHeight(); // Adjust the height of the comparator
          }
        };
      })(index);

      reader.readAsDataURL(file); // Read the image as data URL
    });
  }
}

// Prevent default drag behaviors
dropArea.addEventListener("dragover", (event) => {
  event.preventDefault();
});

dropArea.addEventListener("drop", handleDrop);

// Handle paste event
document.addEventListener("paste", handlePaste);

// Update slider functionality
sliderInput.addEventListener("input", function () {
  const value = this.value;
  slider.style.left = `${value}%`;
  if (image2.src) {
    // Only adjust if second image is loaded
    image2.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
  }
});
