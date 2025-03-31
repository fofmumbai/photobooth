const imageInput1 = document.getElementById("imageInput1");
const imageInput2 = document.getElementById("imageInput2");
const imageInput3 = document.getElementById("imageInput3");
const generateButton = document.getElementById("generateButton");
const downloadButton = document.getElementById("downloadButton");
const canvas = document.getElementById("canvas");
const preview = document.getElementById("preview");
const ctx = canvas.getContext("2d", { alpha: true });
const fileNameDisplay1 = document.getElementById("file-name-1");
const fileNameDisplay2 = document.getElementById("file-name-2");
const fileNameDisplay3 = document.getElementById("file-name-3");

// Camera elements
const cameraModal = document.getElementById("camera-modal");
const cameraFeed = document.getElementById("camera-feed");
const takePhotoButton = document.getElementById("take-photo");
const switchCameraButton = document.getElementById("switch-camera");
const photoCanvas = document.getElementById("photo-canvas");
const photoCtx = photoCanvas.getContext("2d");
const cameraButtons = document.querySelectorAll(".camera-button");
const closeModalButton = document.querySelector(".close-modal");

// Camera variables
let stream;
let currentInputId;
let facingMode = "environment"; // Start with back camera

// Create high-resolution canvas for output
const outputCanvas = document.createElement("canvas");
const outputCtx = outputCanvas.getContext("2d", { alpha: true });

// Set dimensions based on 7cm x 19.5cm at 600dpi
const DPI = 600;
const PIXELS_PER_CM = DPI / 2.54;
const STRIP_WIDTH = Math.round(7 * PIXELS_PER_CM);
const STRIP_HEIGHT = Math.round(19.5 * PIXELS_PER_CM);

// Set preview canvas dimensions (scaled down for display)
canvas.width = STRIP_WIDTH / 4;
canvas.height = STRIP_HEIGHT / 4;

// Set output canvas dimensions (high resolution)
outputCanvas.width = STRIP_WIDTH;
outputCanvas.height = STRIP_HEIGHT;

// Enable image smoothing for all canvases
[ctx, outputCtx].forEach((context) => {
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
});

// Load background template
let backgroundImage = new Image();
backgroundImage.src = "template.png";
backgroundImage.crossOrigin = "Anonymous";

generateButton.addEventListener("click", generatePhotostrip);
downloadButton.addEventListener("click", downloadPhotostrip);

// Handle file input changes
function setupFileInput(inputElement, fileNameElement) {
  inputElement.addEventListener("change", function () {
    const file = this.files[0];
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "image/avif",
      "image/apng",
    ];
    const maxFileSize = 20 * 1024 * 1024; // 20MB file size limit

    const fileName = file ? file.name : "";
    if (fileName) {
      fileNameElement.textContent = `${fileName}`;
    } else {
      fileNameElement.textContent = "";
    }

    // Validate file type and size
    if (file) {
      if (!allowedTypes.includes(file.type)) {
        alert("Please upload only JPG, JPEG, or PNG images.");
        this.value = "";
        fileNameElement.textContent = "";
        return;
      }

      if (file.size > maxFileSize) {
        alert("File size should not exceed 20MB.");
        this.value = "";
        fileNameElement.textContent = "";
        return;
      }
    }
  });
}

// Set up file input handlers
setupFileInput(imageInput1, fileNameDisplay1);
setupFileInput(imageInput2, fileNameDisplay2);
setupFileInput(imageInput3, fileNameDisplay3);

// Camera functionality
cameraButtons.forEach((button) => {
  button.addEventListener("click", function () {
    currentInputId = this.getAttribute("data-target");
    openCamera();
  });
});

closeModalButton.addEventListener("click", closeCamera);

// Open camera stream
async function openCamera() {
  try {
    // Set up photo canvas
    photoCanvas.width = 1280;
    photoCanvas.height = 720;

    // Get camera stream
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    cameraFeed.srcObject = stream;
    cameraModal.style.display = "block";
  } catch (error) {
    console.error("Error accessing camera:", error);
    alert("Unable to access camera. Please check your camera permissions.");
  }
}

// Close camera stream
function closeCamera() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
  cameraModal.style.display = "none";
}

// Take photo
takePhotoButton.addEventListener("click", function () {
  // Draw current video frame to canvas
  photoCanvas.width = cameraFeed.videoWidth;
  photoCanvas.height = cameraFeed.videoHeight;
  photoCtx.drawImage(cameraFeed, 0, 0, photoCanvas.width, photoCanvas.height);

  // Convert to file
  photoCanvas.toBlob(
    function (blob) {
      const file = new File([blob], `camera-photo-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      // Create a FileList-like object
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      // Assign to the correct input
      const inputElement = document.getElementById(currentInputId);
      inputElement.files = dataTransfer.files;

      // Update file name display
      const fileNameId = currentInputId.replace("imageInput", "file-name-");
      document.getElementById(fileNameId).textContent = "Camera Photo";

      // Close camera
      closeCamera();
    },
    "image/jpeg",
    0.95
  );
});

// Switch camera
switchCameraButton.addEventListener("click", function () {
  facingMode = facingMode === "environment" ? "user" : "environment";
  closeCamera();
  openCamera();
});

// Enable generate button when background image loads
backgroundImage.onload = function () {
  generateButton.disabled = false;
};

function generatePhotostrip() {
  // Check if all three images are uploaded
  if (!imageInput1.files[0] || !imageInput2.files[0] || !imageInput3.files[0]) {
    alert("Please upload all three photos");
    return;
  }

  generateButton.classList.add("loading");
  generateButton.textContent = "Generating...";

  // Load all three images
  const promises = [
    loadImage(imageInput1.files[0]),
    loadImage(imageInput2.files[0]),
    loadImage(imageInput3.files[0]),
  ];

  Promise.all(promises)
    .then((images) => {
      // Generate preview version (lower quality for display)
      createPhotostrip(
        ctx,
        canvas.width,
        canvas.height,
        images,
        backgroundImage,
        true
      );

      // Generate high-resolution version (maximum quality)
      createPhotostrip(
        outputCtx,
        outputCanvas.width,
        outputCanvas.height,
        images,
        backgroundImage,
        false
      );

      // Update preview
      const previewDataUrl = canvas.toDataURL("image/png");
      preview.src = previewDataUrl;
      preview.style.display = "block";

      document.getElementById("photostrip-text").style.display = "block";
      downloadButton.style.display = "block";

      generateButton.classList.remove("loading");
      generateButton.textContent = "Create My Photostrip";
    })
    .catch((error) => {
      alert("Error loading images: " + error.message);
      generateButton.classList.remove("loading");
      generateButton.textContent = "Create My Photostrip";
    });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      const img = new Image();
      img.crossOrigin = "Anonymous";

      img.onload = function () {
        resolve(img);
      };

      img.onerror = function () {
        reject(new Error("Failed to load image"));
      };

      img.src = e.target.result;
    };

    reader.onerror = function () {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}

// Function to convert a photo to black and white with increased brightness
function applyBlackAndWhiteFilter(
  context,
  x,
  y,
  width,
  height,
  brightness = 20
) {
  // Get the image data from the canvas
  const imageData = context.getImageData(x, y, width, height);
  const data = imageData.data;

  // Iterate through each pixel
  for (let i = 0; i < data.length; i += 4) {
    // Convert to grayscale using luminosity method (weighted average)
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Calculate grayscale value
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // Increase brightness
    gray = Math.min(255, gray + brightness);

    // Set RGB channels to the same grayscale value
    data[i] = gray; // R
    data[i + 1] = gray; // G
    data[i + 2] = gray; // B
    // A channel (i+3) remains unchanged
  }

  // Put the modified image data back on the canvas
  context.putImageData(imageData, x, y);
}

function createPhotostrip(
  context,
  width,
  height,
  images,
  backgroundImage,
  isPreview
) {
  // Clear the canvas with a transparent background
  context.clearRect(0, 0, width, height);

  // Draw background template
  context.drawImage(backgroundImage, 0, 0, width, height);

  // Modified dimensions for the photo frames
  const frameWidth = width * 0.9;
  const frameHeight = frameWidth * (3 / 4); // 4:3 ratio

  // Reduce spacing between images
  const frameSpacing = height * 0.02;

  const totalFrameHeight = 3 * frameHeight + 2 * frameSpacing;

  // Move images up
  const startY = (height - totalFrameHeight) / 2 - height * 0.09;

  // Enhanced image rendering with better quality preservation
  for (let i = 0; i < 3; i++) {
    const userImage = images[i];
    const frameY = startY + i * (frameHeight + frameSpacing);
    const frameX = (width - frameWidth) / 2; // Center horizontally

    // Calculate source dimensions to maintain 4:3 ratio
    let sourceWidth, sourceHeight, sourceX, sourceY;

    if (userImage.width / userImage.height > 4 / 3) {
      // Image is wider than 4:3
      sourceHeight = userImage.height;
      sourceWidth = sourceHeight * (4 / 3);
      sourceX = (userImage.width - sourceWidth) / 2;
      sourceY = 0;
    } else {
      // Image is taller than 4:3
      sourceWidth = userImage.width;
      sourceHeight = sourceWidth * (3 / 4);
      sourceX = 0;
      sourceY = (userImage.height - sourceHeight) / 2;
    }

    // Draw the photo with maximum quality
    context.drawImage(
      userImage,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      frameX,
      frameY,
      frameWidth,
      frameHeight
    );

    // Apply black and white filter and increase brightness to the photo area
    applyBlackAndWhiteFilter(
      context,
      frameX,
      frameY,
      frameWidth,
      frameHeight,
      30
    );
  }
}

function downloadPhotostrip() {
  // Use lossless PNG format with maximum quality
  const dataURL = outputCanvas.toDataURL("image/png", 1.0);

  // Create download link
  const link = document.createElement("a");
  link.download = "Photostrip.png";
  link.href = dataURL;

  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Disable generate button until background image loads
generateButton.disabled = true;
