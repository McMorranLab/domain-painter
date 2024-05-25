//import { red, green, blue } from "./coolwarm.js"
import { state, mats, waitFor, drawArrow } from "./helpers.js"
import { onScreenCVS,onScreenCTX,offScreenCVS,offScreenCTX,magCVS,magCTX } from "./canvas.js"
import { dwAngleGenerator, findContours, findClosestContour, findClosestPoint, matToImageData, imageDataToDataURL} from "./opencv_helpers.js"

//====================================//
//======= * * * Toolbar * * * ========//
//====================================//

// * Canvas Size Input * //
const canvasWidthInput = document.getElementById("canvasWidthInput");
const canvasHeightInput = document.getElementById("canvasHeightInput");
// * All tool buttons * //
const toolBtns = document.querySelectorAll('.toolBtn');
let toolBtnImg = document.getElementById('pantoolImg');
// * Undo buttons * //
const undoBtn = document.getElementById("undo");
const redoBtn = document.getElementById("redo");
// * Reset buttons * //
const clearBtn = document.getElementById("clear");
// * Zoom buttons * //
//const zoomInBtn = document.getElementById("zoomIn")
//const zoomOutBtn = document.getElementById("zoomOut")
// * Pan button * //
//const panBtn = document.getElementById("pantool")
// * Drawing * //
const drawBtn = document.getElementById("drawtool");
const eraseBtn = document.getElementById("erasetool");
const chiralityBtn = document.getElementById("chiralitytool");
const bpBtn = document.getElementById("bptool");
// * Line Width * //
const lineWidthInput = document.getElementById("lineWidth");
let lineWidth = 32;
// * Domain Wall Width * //
const dwThicknessInput = document.getElementById("dwThickness");
let dwThickness = 31;
// * Placing Blochlines * //
const placeBlochlineBtn = document.getElementById("bltool");
// * Toggling PBC * //
const pbcBtn = document.getElementById("pbc");

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
startOpenCV();

async function renderBoth(redrawMz = true, redrawMxy = true, blur = true, highlightedContour) {
  state.updatingDone = false;
  renderImage();
  renderMagImage(redrawMz,redrawMxy,blur,highlightedContour);
}

//Once the image is loaded, draw the image onto the onscreen canvas.
async function renderImage() {
  img.src = source;
  img.onload = () => {
    //if the image is being drawn due to resizing, reset the width and height. Putting the width and height outside the img.onload function will make scaling smoother, but the image will flicker as you scale. Pick your poison.
    onScreenCVS.width = baseDimensionX;
    onScreenCVS.height = baseDimensionY;
    state.ratioX = onScreenCVS.width / offScreenCVS.width;
    state.ratioY = onScreenCVS.height / offScreenCVS.height;
    //Prevent blurring
    onScreenCTX.imageSmoothingEnabled = false;
    onScreenCTX.drawImage(img, 0, 0, onScreenCVS.width, onScreenCVS.height);
    state.updatingDone = true;
  };
}

//Once the image is loaded, draw the image onto the onscreen canvas.
async function renderMagImage(redrawMz = true, redrawMxy = true, blur = true, highlightedContour) {
  if (redrawMz === true) {
    generatePreviewArrows();
    magSource = await drawMagSource(blur);
    magImg.src = magSource;
    magImg.onload = () => {
      //if the image is being drawn due to resizing, reset the width and height. Putting the width and height outside the img.onload function will make scaling smoother, but the image will flicker as you scale. Pick your poison.
      magCVS.width = baseDimensionX;
      magCVS.height = baseDimensionY;
      //Prevent blurring
      magCTX.imageSmoothingEnabled = false;
      magCTX.drawImage(magImg, 0, 0, magCVS.width, magCVS.height);
      if (redrawMxy === true) {
        renderPreviewArrows(highlightedContour);
      }
      console.log("Mag image posted")
    };
  } else if (redrawMz === false) {
    //if the image is being drawn due to resizing, reset the width and height. Putting the width and height outside the img.onload function will make scaling smoother, but the image will flicker as you scale. Pick your poison.
    magCVS.width = baseDimensionX;
    magCVS.height = baseDimensionY;
    //Prevent blurring
    magCTX.imageSmoothingEnabled = false;
    magCTX.drawImage(magImg, 0, 0, magCVS.width, magCVS.height);
    if (redrawMxy === true) {
      renderPreviewArrows(highlightedContour);
    }
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
  state.stride = state.stride_default;
}

//Resize the canvas if the window is resized
function flexCanvasSize() {
  initializeOnScreenCanvas();
  state.ratioX = onScreenCVS.width / offScreenCVS.width;
  state.ratioY = onScreenCVS.height / offScreenCVS.height;
  renderBoth(false, true, false);
}

//Add event listeners for canvas resizing
canvasWidthInput.addEventListener('change', e => {
  offScreenCVS.width = e.target.value;
  state.stride = state.stride_default * (offScreenCVS.width * offScreenCVS.height) / (1024*1024);
  initializeOnScreenCanvas();
  resetOffScreenCVS();
});
canvasHeightInput.addEventListener('change', e => {
  offScreenCVS.height = e.target.value;
  state.stride = state.stride_default * (offScreenCVS.width * offScreenCVS.height) / (1024*1024);
  initializeOnScreenCanvas();
  resetOffScreenCVS();
});

onScreenCVS.addEventListener('mousemove', e => {
  if (isFlipping === true) {
    let mouseX = Math.floor(e.offsetX / state.ratioX);
    let mouseY = Math.floor(e.offsetY / state.ratioY);
    let targetContourIndex = findClosestContour(mouseX,mouseY);
    renderBoth(false,true,false,targetContourIndex);
  }
});

onScreenCVS.addEventListener('mouseout', e => {
  if (isFlipping === true) {
    renderBoth(false,true);
  }
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
  renderBoth(true, true, false); // set to redraw true and redrawArrows true when domain wall rendering is finished
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
  renderBoth(true, true, true);
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
      /*
      offScreenCTX.beginPath();
      offScreenCTX.moveTo(p.x0,p.y0)
      offScreenCTX.lineTo(p.x1,p.y1);
      offScreenCTX.stroke();
      */
      handleStroke(p.x0,p.y0,p.x1,p.y1,p.size)
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

pbcBtn.addEventListener('change', e => {
  state.PBC = !state.PBC;
});

//We only want the mouse to move if the mouse is down, so we need a variable to disable drawing while the mouse is not clicked.
let clicked = false;
let isDrawing = true;
let isErasing = false;
let isFlipping = false;
let isPlacingBP = false;

drawBtn.addEventListener('click', e => {
  isDrawing = true;
  isErasing = false;
  isFlipping = false;
  isPlacingBP = false;
});

eraseBtn.addEventListener('click', e => {
  isDrawing = false;
  isErasing = true;
  isFlipping = false;
  isPlacingBP = false;
});

chiralityBtn.addEventListener('click', e => {
  isDrawing = false;
  isErasing = false;
  isFlipping = true;
  isPlacingBP = false;
});

bpBtn.addEventListener('click', e => {
  isDrawing = false;
  isErasing = false;
  isFlipping = false;
  isPlacingBP = true;
});

lineWidthInput.addEventListener('change', e => {
  lineWidth = e.target.value;
});

dwThicknessInput.addEventListener('change', e => {
  dwThickness = 2*Math.round(e.target.value/2) + 1;
  mats.ksize = new cv.Size(dwThickness, dwThickness);
  renderBoth(true,true,true);
});

function handleMouseMove(e) {
  if (clicked) {
    actionDraw(e);
  }
}

function handleMouseDown(e) {
  if (isDrawing === true || isErasing === true) {
    clicked = true;
    //Action-based
    firstX = Math.floor(e.offsetX / state.ratioX);
    firstY = Math.floor(e.offsetY / state.ratioY);
    actionDraw(e);
  }
  if (isFlipping === true) {
    flipChirality(e);
  }
}

function handleMouseUp() {
  if (isDrawing === true || isErasing === true) {
    clicked = false;
    //Action-based
    undoStack.push(points);
    points = [];
    //Reset redostack
    redoStack = [];
    renderBoth(true, true, true);
  }
}

//Action functions
function actionDraw(e) {
  let mouseX = Math.floor(e.offsetX / state.ratioX);
  let mouseY = Math.floor(e.offsetY / state.ratioY);
  // draw
  offScreenCTX.lineWidth = lineWidth;
  offScreenCTX.lineCap = 'round';
  if (isDrawing === true) {
    offScreenCTX.strokeStyle = "black";
  } else if (isErasing ===true) {
    offScreenCTX.strokeStyle = "white";
  }
  /*
  offScreenCTX.beginPath();
  offScreenCTX.moveTo(firstX,firstY)
  offScreenCTX.lineTo(mouseX,mouseY);
  offScreenCTX.stroke();
  */
  handleStroke(firstX,firstY,mouseX,mouseY,lineWidth)

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

function handleStroke(firstX,firstY,lastX,lastY,linewidth) {
  offScreenCTX.beginPath();
  offScreenCTX.moveTo(firstX,firstY);
  offScreenCTX.lineTo(lastX,lastY);
  offScreenCTX.stroke();
  if (state.PBC === true) {
    if (firstX < linewidth/2 || lastX < linewidth/2) {
      offScreenCTX.beginPath();
      offScreenCTX.moveTo(firstX+offScreenCVS.width,firstY);
      offScreenCTX.lineTo(lastX+offScreenCVS.width,lastY);
      offScreenCTX.stroke();
    }
    if (firstX > (offScreenCVS.width - linewidth/2) || lastX > (offScreenCVS.width - linewidth/2)) {
      offScreenCTX.beginPath();
      offScreenCTX.moveTo(firstX-offScreenCVS.width,firstY);
      offScreenCTX.lineTo(lastX-offScreenCVS.width,lastY);
      offScreenCTX.stroke();
    }
    if (firstY < linewidth/2 || lastY < linewidth/2) {
      offScreenCTX.beginPath();
      offScreenCTX.moveTo(firstX,firstY+offScreenCVS.height);
      offScreenCTX.lineTo(lastX,lastY+offScreenCVS.height);
      offScreenCTX.stroke();
    }
    if (firstY > (offScreenCVS.height - linewidth/2) || lastY > (offScreenCVS.height - linewidth/2)) {
      offScreenCTX.beginPath();
      offScreenCTX.moveTo(firstX,firstY-offScreenCVS.height);
      offScreenCTX.lineTo(lastX,lastY-offScreenCVS.height);
      offScreenCTX.stroke();
    }
    if ((firstX < linewidth/2 || lastX < linewidth/2) && (firstY < linewidth/2 || lastY < linewidth/2)) {
      offScreenCTX.beginPath();
      offScreenCTX.moveTo(firstX+offScreenCVS.width,firstY+offScreenCVS.height);
      offScreenCTX.lineTo(lastX+offScreenCVS.width,lastY+offScreenCVS.height);
      offScreenCTX.stroke();
    }
    if ((firstX < (offScreenCVS.width - linewidth/2) || lastX < (offScreenCVS.width - linewidth/2)) && (firstY > (offScreenCVS.height - linewidth/2) || lastY > (offScreenCVS.height - linewidth/2))) {
      offScreenCTX.beginPath();
      offScreenCTX.moveTo(firstX-offScreenCVS.width,firstY-offScreenCVS.height);
      offScreenCTX.lineTo(lastX-offScreenCVS.width,lastY-offScreenCVS.height);
      offScreenCTX.stroke();
    }
  }
}

//====================================//
//======== * * * OpenCV * * * ========//
//====================================//

async function startOpenCV() {
  source = offScreenCVS.toDataURL();
  await waitFor(_ => cvloaded === true);
  mats.ksize = new cv.Size(dwThickness, dwThickness);
  mats.mz = new cv.Mat();
  mats.hierarchy = new cv.Mat();
  mats.xyAngs = [];
  mats.bps = [];
  renderBoth(false, false, false);
  window.onresize = flexCanvasSize;
}

//====================================//
//==== * * * Magnetization * * * =====//
//====================================//

async function drawMagSource(blur) {
  await generateMz(blur);
  console.log("Mz generated! Posting image...")
  return imageDataToDataURL(matToImageData( mats.mz ));
}

async function generateMz(blur) {
  await waitFor(_ => state.updatingDone === true)
  mats.cvsource = cv.imread(img);
  if (blur === true) {
    console.log("Blurring image, this may take a while...")
    if (state.PBC === true) {
      cv.GaussianBlur(mats.cvsource, mats.mz, mats.ksize, 0, 0, cv.BORDER_WRAP);
    } else if (state.PBC === false) {
      cv.GaussianBlur(mats.cvsource, mats.mz, mats.ksize, 0, 0, cv.BORDER_REPLICATE);
    }
  } else if (blur === false) {
    console.log("Skipped gaussian blur...")
    mats.mz = mats.cvsource;
  }
  return mats.mz;
}

async function generatePreviewArrows(stride = state.stride) {
  await waitFor(_ => state.updatingDone === true)
  mats.cvsource = cv.imread(img);
  mats.contours = await findContours(mats.cvsource,cv.CHAIN_APPROX_NONE);
  mats.xyAngs = [];
  mats.chirality = [];
  mats.bps = [];
  console.log("Found "+state.contour_number_noborder+" contour(s)");
  for (var i = 0; i < mats.contours.size(); i++) {
    var xyAng = await dwAngleGenerator(mats.contours.get(i),stride);
    mats.xyAngs.push(xyAng);
    mats.chirality.push(new Array(xyAng.length).fill(0));
    mats.bps.push([]);
    console.log("Contour "+i+": "+mats.contours.get(i).rows+" pxs");
  }
}

async function renderPreviewArrows(targetContourIndex) {
  let arrowColor;
  for (var i = 0; i < mats.xyAngs.length; i++) {
    if (i === targetContourIndex) {
      arrowColor = "magenta";
    } else {
      arrowColor = "black";
    }
    let xyAng = mats.xyAngs[i];
    let angle;
    let arrowLength = state.stride*Math.sqrt(state.ratioX*state.ratioY);
    let arrowThickness = Math.sqrt(1024*1024/offScreenCVS.width/offScreenCVS.width);
    //console.log("Drawing arrows for contour "+i)
    for (var j = 0; j < xyAng.length; j++) {
      angle = xyAng[j][2] + Math.PI*mats.chirality[i][j];
      drawArrow(magCTX,(xyAng[j][0]+0.5)*state.ratioX,(xyAng[j][1]+0.5)*state.ratioY,
                arrowLength,arrowLength/2, arrowThickness, arrowColor, angle);
    }
  }
}

async function flipChirality(e) {
  let mouseX = Math.floor(e.offsetX / state.ratioX);
  let mouseY = Math.floor(e.offsetY / state.ratioY);
  let targetContourIndex = findClosestContour(mouseX,mouseY);
  for (var i = 0; i < mats.xyAngs[targetContourIndex].length; i++) {
    mats.chirality[targetContourIndex][i] = (mats.chirality[targetContourIndex][i]+1)%2;
  }
  renderBoth(false,true,false,targetContourIndex);
}

async function placeBP(e) {
  let mouseX = Math.floor(e.offsetX / state.ratioX);
  let mouseY = Math.floor(e.offsetY / state.ratioY);
  let testdist;
  let removedBP = false;
  for (var i = 0; i < mats.bps.length; i++) {
    testdist = Math.sqrt((mouseX-mats.bps[i][0])**2+(mouseY-mats.bps[i][1])**2)
    if (testdist < state.bpClickZone) {
      mats.bps.splice(i,1)
      removedBP = true;
    }
  }
  if (removedBP === false) {
    let targetContourIndex = findClosestContour(mouseX,mouseY) - 1;
    let targetPointIndex = findClosestPoint(mats.contours.get(targetContourIndex), mouseX, mouseY);
    //mats.bps[targetContourIndex][] = []
  }

}