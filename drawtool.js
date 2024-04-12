//Get the onscreen canvas and its context
const onScreenCVS = document.getElementById("onScreen");
const onScreenCTX = onScreenCVS.getContext("2d");

//Get the reset button
let resetBtn = document.getElementById("clear");

//Get the pan button
let panTool = document.getElementById("pantool");

//Get the zoom buttons
let zoomIn = document.getElementById("zoomIn");
let zoomOut = document.getElementById("zoomOut");

//Get the undo/redo buttons
let undoBtn = document.getElementById("undo");
let redoBtn = document.getElementById("redo");

//Get the draw and erase buttons
let pen = document.getElementById("drawtool");
let eraser = document.getElementById("erasetool");

//Get the line width input
let lineWidthInput = document.getElementById('lineWidth');
let lineWidth = 32;

//Get the canvas size inputs
let canvasWidthInput = document.getElementById('enterWidthInput');
let canvasHeightInput = document.getElementById('enterHeightInput');

//Set initial size of canvas. If using a non-square, make sure to set the ratio the same as the offscreen canvas by multiplying either the height or width by the correct ratio.
let baseDimension;
//let baseDimension;
let rect;
setSize();
onScreenCVS.width = baseDimension;
onScreenCVS.height = baseDimension;

//Create history stacks for the undo functionality
//Image based
// let undoStack = [onScreenCVS.toDataURL()];
//Action based
let undoStack = [];
let redoStack = [];

let lastX;
let lastY;
let points = [];

//Create an offscreen canvas. This is where we will actually be drawing, in order to keep the image consistent and free of distortions.
let offScreenCVS = document.createElement("canvas");
let offScreenCTX = offScreenCVS.getContext("2d");
//Set the dimensions of the drawing canvas
offScreenCVS.width = 1024;
offScreenCVS.height = 1024;
offScreenCTX.fillStyle = 'white';
offScreenCTX.fillRect(0, 0, offScreenCVS.width, offScreenCVS.height);
canvasAspectRatio = Math.floor(offScreenCVS.height/offScreenCVS.width)

//Add event listeners for canvas resizing
canvasWidthInput.addEventListener('change', e => {
  offScreenCVS.width = e.target.value;
});
canvasHeightInput.addEventListener('change', e => {
  offScreenCVS.height = e.target.value;
});

//Create an Image with a default source of the existing onscreen canvas
let img = new Image();
let source = offScreenCVS.toDataURL();

//Add event listeners for the mouse moving, downclick, and upclick
onScreenCVS.addEventListener("mousemove", handleMouseMove);
onScreenCVS.addEventListener("mousedown", handleMouseDown);
onScreenCVS.addEventListener("mouseup", handleMouseUp);

//Add event listeners for the undo/redo buttons
undoBtn.addEventListener("click", handleUndo);
redoBtn.addEventListener("click", handleRedo);

//We only want the mouse to move if the mouse is down, so we need a variable to disable drawing while the mouse is not clicked.
let clicked = false;
let isDrawing = true;
let isErasing = false;
let isPanning = false;

pen.addEventListener('click', e => {
  isDrawing = true;
  isErasing = false;
  isPanning = false;

});

eraser.addEventListener('click', e => {
  isDrawing = false;
  isErasing = true;
  isPanning = false;
});

panTool.addEventListener('click', e => {
  isDrawing = false;
  isErasing = false;
  isPanning = true;
});

lineWidthInput.addEventListener('change', e => {
  lineWidth = e.target.value;
});

//Provide image reset functionality
resetBtn.addEventListener('click', e => {
  offScreenCTX.fillStyle = 'white';
  offScreenCTX.fillRect(0, 0, offScreenCVS.width, offScreenCVS.height);
  //offScreenCTX.clearRect(0, 0, offScreenCVS.width, offScreenCVS.height);
  undoStack = [];
  redoStack = [];
  points = [];
  source = offScreenCVS.toDataURL();
  renderImage();
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
  actionDraw(e);
}

function handleMouseUp() {
  clicked = false;
  //Action-based
  undoStack.push(points);
  points = [];
  //Reset redostack
  redoStack = [];
}

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

//Action functions
function actionDraw(e) {
  let ratio = onScreenCVS.width / offScreenCVS.width;
  let mouseX = Math.floor(e.offsetX / ratio);
  let mouseY = Math.floor(e.offsetY / ratio);
  // draw
  if (isDrawing === true) {
    offScreenCTX.fillStyle = "black";
    offScreenCTX.beginPath();
    offScreenCTX.arc(mouseX, mouseY, lineWidth, 0, 2 * Math.PI);
    offScreenCTX.fill();
  }
  // erase
  if (isErasing === true) {
    offScreenCTX.fillStyle = "white";
    offScreenCTX.beginPath();
    offScreenCTX.arc(mouseX, mouseY, lineWidth, 0, 2 * Math.PI);
    offScreenCTX.fill();
  }

  if (lastX !== mouseX || lastY !== mouseY) {
    points.push({
      x: mouseX,
      y: mouseY,
      size: lineWidth,
      type: isDrawing
    });
    source = offScreenCVS.toDataURL();
    renderImage();
  }

  //save last point
  lastX = mouseX;
  lastY = mouseY;
}

//Undo or redo an action
function actionUndoRedo(pushStack, popStack) {
  pushStack.push(popStack.pop());
  offScreenCTX.clearRect(0, 0, offScreenCVS.width, offScreenCVS.height);
  redrawPoints();
  source = offScreenCVS.toDataURL();
  renderImage();
}

function redrawPoints() {
  undoStack.forEach((s) => {
    s.forEach((p) => {
      if (p.type === true) {
        offScreenCTX.fillStyle = "black";
      } else {
        offScreenCTX.fillStyle = "white";
      }
      offScreenCTX.beginPath();
      offScreenCTX.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
      offScreenCTX.fill();
    });
  });
}

//Once the image is loaded, draw the image onto the onscreen canvas.
function renderImage() {
  img.src = source;
  img.onload = () => {
    //if the image is being drawn due to resizing, reset the width and height. Putting the width and height outside the img.onload function will make scaling smoother, but the image will flicker as you scale. Pick your poison.
    onScreenCVS.width = baseDimension;
    onScreenCVS.height = baseDimension;
    //Prevent blurring
    onScreenCTX.imageSmoothingEnabled = false;
    onScreenCTX.drawImage(img, 0, 0, onScreenCVS.width, onScreenCVS.height);
  };
}


//Get the size of the parentNode which is subject to flexbox. Fit the square by making sure the dimensions are based on the smaller of the width and height.
function setSize() {
  rect = onScreenCVS.parentNode.getBoundingClientRect();
  rect.height > rect.width
    ? (baseDimension = rect.width)
    : (baseDimension = rect.height);
}

//Resize the canvas if the window is resized
function flexCanvasSize() {
  setSize();
  renderImage();
}

window.onresize = flexCanvasSize;

