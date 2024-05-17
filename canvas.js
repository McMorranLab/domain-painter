//====================================//
//======= * * * Canvas * * * =========//
//====================================//

//Create an onscreen canvas. This is what the user sees and interacts with.
export const onScreenCVS = document.getElementById("onScreen");
export const onScreenCTX = onScreenCVS.getContext("2d", {willReadFrequently: true,});
//Create an offscreen canvas. This is where we will actually be drawing, in order to keep the image consistent and free of distortions.
export const offScreenCVS = document.createElement("canvas");
export const offScreenCTX = offScreenCVS.getContext("2d");
//Create a canvas for the magnetization produced by the script
export const magCVS = document.getElementById("contourDisplay");
export const magCTX = magCVS.getContext("2d", {willReadFrequently: true,});

//Set the dimensions of the drawing canvas
offScreenCVS.width = 1024;
offScreenCVS.height = 1024;
offScreenCTX.fillStyle = 'white';
offScreenCTX.fillRect(0, 0, offScreenCVS.width, offScreenCVS.height);