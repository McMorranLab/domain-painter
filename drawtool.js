const canvas = document.getElementById('drawing-board');
const toolbar = document.getElementById('toolbar');
const ctx = canvas.getContext('2d');

const canvasOffsetX = canvas.offsetLeft;
const canvasOffsetY = canvas.offsetTop;

canvas.width = window.innerWidth - canvasOffsetX;
canvas.height = window.innerHeight - canvasOffsetY;

let isPainting = false;
let lineWidth = 5;
let drawingWidth = 1024;
let drawingHeight = 1024;
let startX;
let startY;

/*
toolbar.addEventListener('click', e=> {
    if (e.target.id === 'upload', e=> {

    })
})
*/

toolbar.addEventListener('click', e => {
    if (e.target.id === 'clear') {
        ctx.clearRect(0,0,canvas.width, canvas.height);
    }
});

toolbar.addEventListener('change', e => {
    if (e.target.id === 'lineWidth') {
        lineWidth = e.target.value;
    }
});

toolbar.addEventListener('change', e => {
    if (e.target.id === 'enterWidthInput') {
        drawingWidth = e.target.value;
    }
});

toolbar.addEventListener('change', e => {
    if (e.target.id === 'enterHeightInput') {
        drawingHeight = e.target.value;
    }
});

canvas.addEventListener('mousedown', (e) => {
    isPainting = true;
    startX = e.clientX;
    startY = e.clientY;
});

const draw = (e) => {
    if(!isPainting) {
        return;
    }

    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    ctx.lineTo(e.clientX - canvasOffsetX, e.clientY - canvasOffsetY);
    ctx.stroke();
}

canvas.addEventListener('mouseup', (e) => {
    isPainting = false;
    ctx.stroke();
    ctx.beginPath();
});

canvas.addEventListener('mousemove', draw);