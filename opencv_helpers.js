import { state, mats } from "./helpers.js"
import { offScreenCVS } from "./canvas.js"
import { red, green, blue } from "./coolwarm.js"

export async function dwAngleGenerator(contour,stride) {
    let pointX;
    let pointAx;
    let pointBx;
    let pointY;
    let pointAy;
    let pointBy;
    let j;
    let k;
    let ang;
    let xyAng = [];
    let lastX = contour.data32S[0];
    let lastY = contour.data32S[1];
    for (let i = 0; i < contour.rows; i++) {
        pointX = contour.data32S[i * 2];
        pointY = contour.data32S[i * 2 + 1];
        
        if ((Math.sqrt((pointX-lastX)**2+(pointY-lastY)**2) < stride) && (i !== 0)) {
            continue;
        } else {
            lastX = pointX;
            lastY = pointY;
        }
        
        if (i === 0) {
            j = contour.rows - 1;
            console.log(j);
        } else {
            j = i - 1;
            console.log(j);
        }
        if (i === contour.rows - 1) {
            k = 0;
            console.log(k);
        } else {
            k = i + 1;
            console.log(k);
        }

        pointAx = contour.data32S[j * 2];
        pointAy = contour.data32S[j * 2 + 1];
        pointBx = contour.data32S[k * 2];
        pointBy = contour.data32S[k * 2 + 1];
        ang = Math.atan2((pointBy-pointAy),(pointBx-pointAx));
        xyAng.push([pointX,pointY,ang])
    }
    return xyAng;
}

export async function findContours(mat, method = cv.CHAIN_APPROX_SIMPLE) {
    console.log("Finding contours...");
    // preprocess image
    let cloneMat = mat.clone();
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.cvtColor(cloneMat, cloneMat, cv.COLOR_RGBA2GRAY, 0);
    cv.threshold(cloneMat, cloneMat, 120, 200, cv.THRESH_BINARY);
    console.log("Image filtered...");
    // find contours
    await cv.findContours(cloneMat, contours, hierarchy, cv.RETR_CCOMP, method);
    console.log("Contours found!");
    cloneMat.delete(); //hierarchy.delete();
    mats.hierarchy = hierarchy;
    contours = await fixBoundaryContour(contours);
    return contours;
}

async function fixBoundaryContour(contours) {
    let boundaryContour = contours.get(0);
    let firstPoint = new cv.Point(boundaryContour.data32S[0], boundaryContour.data32S[1]);
    let startedOnEdge = checkEdgePoint(firstPoint);
    let firstContourRear = [];
    let points = [];

    if (startedOnEdge === true) {
        for (let i = 0; i < boundaryContour.rows; i++) {
            let startPoint = new cv.Point(boundaryContour.data32S[i * 2], boundaryContour.data32S[i * 2 + 1]);
            let endPoint = new cv.Point(boundaryContour.data32S[i * 2 + 2], boundaryContour.data32S[i * 2 + 3]);
            if ((checkEdgePoint(startPoint) === true && checkEdgePoint(endPoint) === false)
            || (checkEdgePoint(startPoint) === false && checkEdgePoint(endPoint) === false)) {
                points.push([startPoint.x,startPoint.y]);
                //console.log([startPoint.x,startPoint.y])
            } else if (checkEdgePoint(startPoint) === false && checkEdgePoint(endPoint) === true) {
                points.push([startPoint.x,startPoint.y]);
                points.push([endPoint.x,endPoint.y]);
                //console.log([startPoint.x,startPoint.y])
                let newcontour = cv.matFromArray(1, points.length, cv.CV_32SC2, points.flat(2));
                contours.push_back(newcontour);
                console.log("Cut a contour from border")
                points = [];
            }
        }
    } else if (startedOnEdge === false) {
        let stillFirstContour = true;
        for (let i = 0; i < boundaryContour.rows; i++) {
            let startPoint = new cv.Point(boundaryContour.data32S[i * 2], boundaryContour.data32S[i * 2 + 1]);
            let endPoint = new cv.Point(boundaryContour.data32S[i * 2 + 2], boundaryContour.data32S[i * 2 + 3]);
            if (stillFirstContour === true) {
                if (checkEdgePoint(startPoint) === false && checkEdgePoint(endPoint) === false) {
                    firstContourRear.push([startPoint.x,startPoint.y]);
                } else if (checkEdgePoint(startPoint) === false && checkEdgePoint(endPoint) === true) {
                    firstContourRear.push([startPoint.x,startPoint.y]);
                    firstContourRear.push([endPoint.x,endPoint.y]);
                    stillFirstContour = false;
                }
            } else if (stillFirstContour === false) {
                if ((checkEdgePoint(startPoint) === true && checkEdgePoint(endPoint) === false)
                || (checkEdgePoint(startPoint) === false && checkEdgePoint(endPoint) === false)) {
                    points.push([startPoint.x,startPoint.y]);
                } else if (checkEdgePoint(startPoint) === false && checkEdgePoint(endPoint) === true) {
                    points.push([startPoint.x,startPoint.y]);
                    points.push([endPoint.x,endPoint.y]);
                    if (i < (boundaryContour.rows - 1)) {
                        let newcontour = cv.matFromArray(1, points.length, cv.CV_32SC2, points.flat(2));
                        contours.push_back(newcontour);
                        console.log("Cut a contour from border")
                        points = [];
                    } else if (i === (boundaryContour.rows - 1)) {
                        let firstContour = points.concat(firstContourRear);
                        let newcontour = cv.matFromArray(1, firstContour.length, cv.CV_32SC2, firstContour.flat(2));
                        contours.push_back(newcontour);
                        console.log("Cut a contour from border");
                    }
                }
            }
        }
    }
    state.contour_number_noborder = contours.size()-1;
    return contours;
}

function checkEdgePoint(point) {
    if (point.x === 0 || point.y === 0 || point.x === (offScreenCVS.width - 1) || point.y === (offScreenCVS.height - 1)) {
        return true;
    } else {
        return false;
    }
}

export function matToImageData(mat, coolwarm = true) {
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
        rgbMat.delete();
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

export function imageDataToDataURL(imageData) {
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