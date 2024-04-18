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
canvasAspectRatio = offScreenCVS.height/offScreenCVS.width

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
// * Contour Finding * //
const findContoursBtn = document.getElementById("findContour")
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

// WIP

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
let img = new Image();
let source = offScreenCVS.toDataURL();
renderImage();

//Add event listeners for canvas resizing
canvasWidthInput.addEventListener('change', e => {
  offScreenCVS.width = e.target.value;
});
canvasHeightInput.addEventListener('change', e => {
  offScreenCVS.height = e.target.value;
});

//Once the image is loaded, draw the image onto the onscreen canvas.
function renderImage() {
  img.src = source;
  img.onload = () => {
    //if the image is being drawn due to resizing, reset the width and height. Putting the width and height outside the img.onload function will make scaling smoother, but the image will flicker as you scale. Pick your poison.
    onScreenCVS.width = baseDimensionX;
    onScreenCVS.height = baseDimensionY;
    //Prevent blurring
    onScreenCTX.imageSmoothingEnabled = false;
    onScreenCTX.drawImage(img, 0, 0, onScreenCVS.width, onScreenCVS.height);
  };
}

//Get the size of the parentNode which is subject to flexbox. Fit the square by making sure the dimensions are based on the smaller of the width and height.
function initializeOnScreenCanvas() {
  rect = onScreenCVS.parentNode.getBoundingClientRect();
  let rectAspectRatio = rect.height/rect.width;
  let offScreenAspectRatio = offScreenCVS.height/offScreenCVS.width;

  if (rectAspectRatio > offScreenAspectRatio) {
    baseDimensionX = rect.width
    baseDimensionY = Math.floor(rect.width * offScreenAspectRatio)
  } else {
    baseDimensionY = rect.height
    baseDimensionX = Math.floor(rect.height / offScreenAspectRatio)
  }
}

//Resize the canvas if the window is resized
function flexCanvasSize() {
  initializeOnScreenCanvas();
  renderImage();
}

window.onresize = flexCanvasSize;

//====================================//
//========= * * * Reset * * * ========//
//====================================//

//Provide image reset functionality
clearBtn.addEventListener('click', e => {
  offScreenCTX.fillStyle = 'white';
  offScreenCTX.fillRect(0, 0, offScreenCVS.width, offScreenCVS.height);
  //offScreenCTX.clearRect(0, 0, offScreenCVS.width, offScreenCVS.height);
  undoStack = [];
  redoStack = [];
  points = [];
  source = offScreenCVS.toDataURL();
  renderImage();
});

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
  renderImage();
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
}

function handleMouseUp() {
  clicked = false;
  //Action-based
  undoStack.push(points);
  points = [];
  //Reset redostack
  redoStack = [];
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