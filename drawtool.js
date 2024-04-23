import { red, green, blue } from "./coolwarm.js"

//====================================//
//======= * * * Canvas * * * =========//
//====================================//

//Create an onscreen canvas. This is what the user sees and interacts with.
const onScreenCVS = document.getElementById("onScreen");
const onScreenCTX = onScreenCVS.getContext("2d", {willReadFrequently: true,});

//Create an offscreen canvas. This is where we will actually be drawing, in order to keep the image consistent and free of distortions.
let offScreenCVS = document.createElement("canvas");
let offScreenCTX = offScreenCVS.getContext("2d");
//Set the dimensions of the drawing canvas
offScreenCVS.width = 1024;
offScreenCVS.height = 1024;
offScreenCTX.fillStyle = 'white';
offScreenCTX.fillRect(0, 0, offScreenCVS.width, offScreenCVS.height);
let canvasAspectRatio = offScreenCVS.height/offScreenCVS.width

//Create a canvas for the magnetization produced by the script
const magCVS = document.getElementById("contourDisplay");
const magCTX = magCVS.getContext("2d", {willReadFrequently: true,});

//====================================//
//======= * * * Toolbar * * * ========//
//====================================//

// * Canvas Size Input * //
const canvasWidthInput = document.getElementById("canvasWidthInput");
const canvasHeightInput = document.getElementById("canvasHeightInput");
// * All tool buttons * //
const toolBtns = document.querySelectorAll('.toolBtn');
let toolBtnImg = document.getElementById('pantoolImg');
// * Pan button * //
const panBtn = document.getElementById("pantool")
// * Undo buttons * //
const undoBtn = document.getElementById("undo")
const redoBtn = document.getElementById("redo")
// * Reset buttons * //
const clearBtn = document.getElementById("clear")
// * Zoom buttons * //
const zoomInBtn = document.getElementById("zoomIn")
const zoomOutBtn = document.getElementById("zoomOut")
// * Drawing * //
const drawBtn = document.getElementById("drawtool")
const eraseBtn = document.getElementById("erasetool")
// * Line Width * //
const lineWidthInput = document.getElementById("lineWidth")
let lineWidth = 32;
// * Domain Wall Width * //
const dwThicknessInput = document.getElementById("dwThickness")
let dwThickness = 31;
// * Placing Blochlines * //
const placeBlochlineBtn = document.getElementById("bltool")

const tools = {
  pantool: {
      name: "pantool",
      //fn: handleDrag,
      onetime: false,
  },
  drawtool: {
      name: "pen",
      //fn: actionDraw,
      brushSize: 16,
      color: "black",
      onetime: false,
  },
  erasetool: {
      name: "eraser",
      //fn: actionDraw,
      brushSize: 16,
      color: "white",
      onetime: false,
  },
  zoomIn: {
      name: "zoomIn",
      //fn: handleZoom,
      z: 1.25,
      onetime: true,
  },
  zoomOut: {
      name: "zoomOut",
      //fn: handleZoom,
      z: 0.8,
      onetime: true,
  },
  undo: {
      name: "undo",
      //fn: handleUndo,
      onetime: true,
  },
  redo: {
      name: "redo",
      //fn: handleRedo,
      onetime: true,
  },
};

//====================================//
//======== * * * State * * * =========//
//====================================//

// OpenCV global Matrices and MatrixVectors library
let mats = {};
let state = {
  drawingDone: true
};

// useful function for async behavior
function waitFor(conditionFunction) {

  const poll = resolve => {
    if(conditionFunction()) resolve();
    else setTimeout(_ => poll(resolve), 100);
  }

  return new Promise(poll);
}

//====================================//
//======= * * * Rendering * * * ======//
//====================================//

//Set initial size of canvas. If using a non-square, make sure to set the ratio the same as the offscreen canvas by multiplying either the height or width by the correct ratio.
let baseDimensionX;
let baseDimensionY;
let rect;
initializeOnScreenCanvas();
onScreenCVS.width = baseDimensionX;
onScreenCVS.height = baseDimensionY;
magCVS.width = baseDimensionX;
magCVS.height = baseDimensionY;
let img = new Image();
let source = offScreenCVS.toDataURL();
let magImg = new Image();
let magSource = offScreenCVS.toDataURL();
renderImage();
startOpenCV();

async function renderBoth(redraw = true) {
  state.updatingDone = false;
  renderImage();
  renderMagImage(redraw);
}

//Once the image is loaded, draw the image onto the onscreen canvas.
async function renderImage() {
  img.src = source;
  img.onload = () => {
    //if the image is being drawn due to resizing, reset the width and height. Putting the width and height outside the img.onload function will make scaling smoother, but the image will flicker as you scale. Pick your poison.
    onScreenCVS.width = baseDimensionX;
    onScreenCVS.height = baseDimensionY;
    //Prevent blurring
    onScreenCTX.imageSmoothingEnabled = false;
    onScreenCTX.drawImage(img, 0, 0, onScreenCVS.width, onScreenCVS.height);
    state.updatingDone = true;
    console.log("Normal image drawn")
  };
}

//Once the image is loaded, draw the image onto the onscreen canvas.
async function renderMagImage(redraw = true) {
  if (redraw === true) {
    magSource = await drawMagSource();
    magImg.src = magSource;
    magImg.onload = () => {
      //if the image is being drawn due to resizing, reset the width and height. Putting the width and height outside the img.onload function will make scaling smoother, but the image will flicker as you scale. Pick your poison.
      magCVS.width = baseDimensionX;
      magCVS.height = baseDimensionY;
      //Prevent blurring
      magCTX.imageSmoothingEnabled = false;
      magCTX.drawImage(magImg, 0, 0, magCVS.width, magCVS.height);
      console.log("Mag image posted")
    };
  } else {
    //if the image is being drawn due to resizing, reset the width and height. Putting the width and height outside the img.onload function will make scaling smoother, but the image will flicker as you scale. Pick your poison.
    magCVS.width = baseDimensionX;
    magCVS.height = baseDimensionY;
    //Prevent blurring
    magCTX.imageSmoothingEnabled = false;
    magCTX.drawImage(magImg, 0, 0, magCVS.width, magCVS.height);
    console.log("Mag image posted")
  }
}

//Get the size of the parentNode which is subject to flexbox. Fit the square by making sure the dimensions are based on the smaller of the width and height.
function initializeOnScreenCanvas() {
  rect = onScreenCVS.parentNode.getBoundingClientRect();
  let rectAspectRatio = rect.height/rect.width;
  let offScreenAspectRatio = offScreenCVS.height / offScreenCVS.width
  let canvasBuffer = 4;
  let displayAspectRatio = (offScreenCVS.height)/(2*offScreenCVS.width+canvasBuffer);
  if (rectAspectRatio > displayAspectRatio) {
    baseDimensionX = ((rect.width-canvasBuffer)/2)
    baseDimensionY = Math.floor(baseDimensionX * offScreenAspectRatio)
  } else {
    baseDimensionY = rect.height
    baseDimensionX = Math.floor(baseDimensionY / offScreenAspectRatio)
  }
}

//Resize the canvas if the window is resized
function flexCanvasSize() {
  initializeOnScreenCanvas();
  renderBoth(false);
}

//Add event listeners for canvas resizing
canvasWidthInput.addEventListener('change', e => {
  offScreenCVS.width = e.target.value;
  initializeOnScreenCanvas();
  resetOffScreenCVS();
});
canvasHeightInput.addEventListener('change', e => {
  offScreenCVS.height = e.target.value;
  initializeOnScreenCanvas();
  resetOffScreenCVS();
});

//====================================//
//========= * * * Reset * * * ========//
//====================================//

//Provide image reset functionality
clearBtn.addEventListener('click', e => {
  resetOffScreenCVS();
});

function resetOffScreenCVS() {
  offScreenCTX.fillStyle = 'white';
  offScreenCTX.fillRect(0, 0, offScreenCVS.width, offScreenCVS.height);
  undoStack = [];
  redoStack = [];
  points = [];
  source = offScreenCVS.toDataURL();
  renderBoth(true);
}

//====================================//
//======= * * * Undo/Redo * * * ======//
//====================================//

//Create history stacks for the undo functionality
let undoStack = [];
let redoStack = [];
let lastX;
let lastY;
let points = [];

//Add event listeners for the undo/redo buttons
undoBtn.addEventListener("click", handleUndo);
redoBtn.addEventListener("click", handleRedo);

function handleUndo() {
  if (undoStack.length > 0) {
    actionUndoRedo(redoStack, undoStack);
  }
}

function handleRedo() {
  if (redoStack.length >= 1) {
    actionUndoRedo(undoStack, redoStack);
  }
}

//Undo or redo an action
function actionUndoRedo(pushStack, popStack) {
  pushStack.push(popStack.pop());
  offScreenCTX.fillStyle = 'white';
  offScreenCTX.fillRect(0, 0, offScreenCVS.width, offScreenCVS.height);
  redrawPoints();
  source = offScreenCVS.toDataURL();
  renderBoth(true);
}

function redrawPoints() {
  undoStack.forEach((s) => {
    s.forEach((p) => {
      if (p.type === true) {
        offScreenCTX.strokeStyle = "black";
      } else {
        offScreenCTX.strokeStyle = "white";
      }
      offScreenCTX.lineWidth = p.size;
      offScreenCTX.lineCap = 'round';
      offScreenCTX.beginPath();
      offScreenCTX.moveTo(p.x0,p.y0)
      offScreenCTX.lineTo(p.x1,p.y1);
      offScreenCTX.stroke();
      });
  });
}

//====================================//
//======== * * * Actions * * * =======//
//====================================//

let firstX;
let firstY;

//Add event listeners for the mouse moving, downclick, and upclick
onScreenCVS.addEventListener("mousemove", handleMouseMove);
onScreenCVS.addEventListener("mousedown", handleMouseDown);
onScreenCVS.addEventListener("mouseup", handleMouseUp);

//We only want the mouse to move if the mouse is down, so we need a variable to disable drawing while the mouse is not clicked.
let clicked = false;
let isDrawing = true;
let isErasing = false;
let isPanning = false;

drawBtn.addEventListener('click', e => {
  isDrawing = true;
  isErasing = false;
  isPanning = false;

});

eraseBtn.addEventListener('click', e => {
  isDrawing = false;
  isErasing = true;
  isPanning = false;
});

panBtn.addEventListener('click', e => {
  isDrawing = false;
  isErasing = false;
  isPanning = true;
});

lineWidthInput.addEventListener('change', e => {
  lineWidth = e.target.value;
});

dwThicknessInput.addEventListener('change', e => {
  dwThickness = 2*Math.round(e.target.value/2) + 1;
});

function handleMouseMove(e) {
  if (clicked) {
    //Action-based
    actionDraw(e);
    //Image-based
    // draw(e)
  }
}

function handleMouseDown(e) {
  clicked = true;
  //Action-based
  let ratio = onScreenCVS.width / offScreenCVS.width;
  firstX = Math.floor(e.offsetX / ratio);
  firstY = Math.floor(e.offsetY / ratio);
  actionDraw(e);
}

function handleMouseUp() {
  clicked = false;
  //Action-based
  undoStack.push(points);
  points = [];
  //Reset redostack
  redoStack = [];
  renderMagImage(true);
}

//Action functions
function actionDraw(e) {
  let ratio = onScreenCVS.width / offScreenCVS.width;
  let mouseX = Math.floor(e.offsetX / ratio);
  let mouseY = Math.floor(e.offsetY / ratio);
  // draw
  if (isDrawing === true) {
    offScreenCTX.strokeStyle = "black";
    offScreenCTX.lineWidth = lineWidth;
    offScreenCTX.lineCap = 'round';
    offScreenCTX.beginPath();
    offScreenCTX.moveTo(firstX,firstY)
    offScreenCTX.lineTo(mouseX,mouseY);
    offScreenCTX.stroke();
  } else if (isErasing ===true) {
    offScreenCTX.strokeStyle = "white";
    offScreenCTX.lineWidth = lineWidth;
    offScreenCTX.lineCap = 'round';
    offScreenCTX.beginPath();
    offScreenCTX.moveTo(firstX,firstY)
    offScreenCTX.lineTo(mouseX,mouseY);
    offScreenCTX.stroke();
  }

  if (lastX !== mouseX || lastY !== mouseY) {
    points.push({
      x0: firstX,
      y0: firstY,
      x1: mouseX,
      y1: mouseY,
      size: lineWidth,
      type: isDrawing
    });
    source = offScreenCVS.toDataURL();
    renderImage();
  }

  //save last point
  lastX = mouseX;
  lastY = mouseY;
  firstX = lastX;
  firstY = lastY;
}

//====================================//
//======== * * * OpenCV * * * ========//
//====================================//

let cvsource_init = false;

async function startOpenCV() {
  await waitFor(_ => cvloaded === true);
  initializeMats();
  await waitFor(_ => cvsource_init === true);
  renderMagImage();
  window.onresize = flexCanvasSize;
}

function initializeMats() {
  mats.cvsource = cv.imread(img);
  mats.mx = cv.Mat.zeros(mats.cvsource.rows,mats.cvsource.cols,cv.CV_32FC1);
  mats.my = cv.Mat.zeros(mats.cvsource.rows,mats.cvsource.cols,cv.CV_32FC1);
  mats.mz = cv.Mat.zeros(mats.cvsource.rows,mats.cvsource.cols,cv.CV_32FC1);
  cvsource_init = true;
}

function findContours() {
  // read source image
  console.log("Canvas loaded in OpenCV format...");
  // preprocess image
  cv.cvtColor(mats.cvsource, mats.cvsource, cv.COLOR_RGBA2GRAY, 0);
  cv.threshold(mats.cvsource, mats.cvsource, 120, 200, cv.THRESH_BINARY);
  console.log("Image filtered...");
  // find contours
  hierarchy = new cv.Mat();
  cv.findContours(mats.cvsource, mats.contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
  console.log("Contours found!");

  hierarchy.delete();
}

function matToImageData(mat, coolwarm = true) {
  let rgbaMat = new cv.Mat();
  if (coolwarm === false) {
    // Convert the Mat to RGBA
    cv.cvtColor(mat, rgbaMat, cv.COLOR_RGB2RGBA);
  } else if (coolwarm === true) {
    // Apply the coolwarm colormap
    let rgbMat = new cv.Mat.zeros(mats.cvsource.rows,mats.cvsource.cols,cv.CV_8UC3);
    for (let row = 0; row < mat.rows; row++) {
      for (let col = 0; col < mat.cols; col++) {
        let matVal = 255 - mat.data[row * mat.cols * mat.channels() + col * mat.channels()];
        rgbMat.data[row * mat.cols * (mat.channels()-1) + col * (mat.channels()-1)] = red[Math.round(matVal)];
        rgbMat.data[row * mat.cols * (mat.channels()-1) + col * (mat.channels()-1) + 1] = green[Math.round(matVal)];
        rgbMat.data[row * mat.cols * (mat.channels()-1) + col * (mat.channels()-1) + 2] = blue[Math.round(matVal)];
      }
    }
    // Convert the Mat to RGBA
    cv.cvtColor(rgbMat, rgbaMat, cv.COLOR_RGB2RGBA);

    rgbMat.delete()
  }

  // Create ImageData from the cv.Mat
  let imgData = new ImageData(
    new Uint8ClampedArray(rgbaMat.data),
    rgbaMat.cols,
    rgbaMat.rows
  );

  // Free memory
  rgbaMat.delete();
  return imgData
}

function imageDataToDataURL(imageData) {
  // Create a temporary canvas
  let tempcanvas = document.createElement('canvas');
  let tempctx = tempcanvas.getContext('2d');

  // Set canvas dimensions
  tempcanvas.width = imageData.width;
  tempcanvas.height = imageData.height;

  // Put the ImageData onto the canvas
  tempctx.putImageData(imageData, 0, 0);

  // Convert canvas to data URL
  let dataURL = tempcanvas.toDataURL();

  return dataURL
}

//====================================//
//==== * * * Magnetization * * * =====//
//====================================//

async function drawMagSource() {
  let previewMz = await generatePreviewMz();
  return imageDataToDataURL(matToImageData( previewMz ));
}

async function generatePreviewMz() {
  await waitFor(_ => state.updatingDone === true)
  mats.cvsource = cv.imread(img);
  mats.output = new cv.Mat();
  let ksize = new cv.Size(dwThickness, dwThickness);
  cv.GaussianBlur(mats.cvsource, mats.output, ksize, 0, 0, cv.BORDER_WRAP);
  return mats.output;
}

function generateMz() {

}

function generateMy() {

}

function generateMx() {

}

// use this line to convert cv.Mat to image
// imageSource = imageDataToDataURL(matToImageData( src ));