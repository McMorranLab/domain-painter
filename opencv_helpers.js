import { state, mats } from "./helpers.js"
import { offScreenCVS } from "./canvas.js"
import { red, green, blue } from "./coolwarm.js"

export async function dwAngleGenerator(contour, stride = state.stride) {
    let point; let pointAx; let pointBx; let pointAy; let pointBy; let j; let k; let ang;
    let xyAng = [];
    let lastX = contour.data32S[0];
    let lastY = contour.data32S[1];

    for (let i = 0; i < contour.rows; i++) {
        point = new cv.Point(contour.data32S[i * 2], contour.data32S[i * 2 + 1]);
        if ((Math.sqrt((point.x-lastX)**2+(point.y-lastY)**2) < stride) && (i !== 0)) {
            continue;
        } else {
            lastX = point.x;
            lastY = point.y;
        }
        
        if (state.PBC === true && checkEdgePoint(point) === true) {
            if (i === 0) {
                j = i;
                k = i + 1;
            }
            if (i === contour.rows - 1) {
                j = i - 1;
                k = i;
            }
        } else {
            if (i === 0) {
                j = contour.rows - 1;
                //console.log(j);
            } else {
                j = i - 1;
                //console.log(j);
            }
            if (i === contour.rows - 1) {
                k = 0;
                //console.log(k);
            } else {
                k = i + 1;
                //console.log(k);
            }
        }

        pointAx = contour.data32S[j * 2];
        pointAy = contour.data32S[j * 2 + 1];
        pointBx = contour.data32S[k * 2];
        pointBy = contour.data32S[k * 2 + 1];
        ang = Math.atan2((pointBy-pointAy),(pointBx-pointAx));
        //console.log([point.x,point.y,ang])
        xyAng.push([point.x,point.y,ang])
    }
    return xyAng;
}

export async function findContours(mat, method = cv.CHAIN_APPROX_SIMPLE) {
    //console.log("Finding contours...");
    // preprocess image
    let cloneMat = mat.clone();
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.cvtColor(cloneMat, cloneMat, cv.COLOR_RGBA2GRAY, 0);
    // invert colors to minimize border cutting
    cv.threshold(cloneMat, cloneMat, 120, 200, cv.THRESH_BINARY_INV);
    //console.log("Image filtered...");
    
    // find contours
    await cv.findContours(cloneMat, contours, hierarchy, cv.RETR_CCOMP, method);
    //console.log("Contours found!");
    cloneMat.delete(); hierarchy.delete();
    //mats.hierarchy = hierarchy;
    
    // cut borders from contours
    contours = await fixBoundaryContour(contours);
    state.contour_number_noborder = contours.size();
    return contours;
}

async function fixBoundaryContour(contours) {
    let newContours = new cv.MatVector();
    let borderContourIndices = [];
    let testContour;
    let boundingRect;

    for (let i = 0; i < contours.size(); i++) {
        testContour = contours.get(i);
        boundingRect = cv.boundingRect(testContour);
        if (boundingRect.x === 0 || boundingRect.y === 0 ||
            (boundingRect.x + boundingRect.width) === (offScreenCVS.width) ||
            (boundingRect.y + boundingRect.height) === (offScreenCVS.height)) {
            borderContourIndices.push(i);
            console.log("Contour "+i+" sits on the boundary");
        } else {
            newContours.push_back(testContour);
        }
    }

    for (let i = 0; i < borderContourIndices.length; i++) {
        let boundaryContour = contours.get(borderContourIndices[i]);
        spliceBoundaryContour(boundaryContour,newContours);
    }
    contours.delete();
    return newContours;
}

function checkEdgePoint(point) {
    if (point.x === 0 || point.y === 0 || point.x === (offScreenCVS.width - 1) || point.y === (offScreenCVS.height - 1)) {
        return true;
    } else {
        return false;
    }
}

function spliceBoundaryContour(boundaryContour, newContours) {
    let firstPoint = new cv.Point(boundaryContour.data32S[0], boundaryContour.data32S[1]);
    let startedOnEdge = checkEdgePoint(firstPoint);
    let stillFirstContour = true;
    let firstContourRear = [];
    let points = [];

    for (let i = 0; i < boundaryContour.rows; i++) {
        let startPoint = new cv.Point(boundaryContour.data32S[i * 2], boundaryContour.data32S[i * 2 + 1]);
        let endPoint;
        if (i < boundaryContour.rows - 1){
            endPoint = new cv.Point(boundaryContour.data32S[i * 2 + 2], boundaryContour.data32S[i * 2 + 3]);
        } else if (i === boundaryContour.rows - 1) {
            endPoint = new cv.Point(boundaryContour.data32S[0], boundaryContour.data32S[1]);
        }
        //console.log([startPoint.x,startPoint.y,checkEdgePoint(startPoint),endPoint.x,endPoint.y,checkEdgePoint(endPoint)]);

        if (startedOnEdge === true) {
            if ((checkEdgePoint(startPoint) === true && checkEdgePoint(endPoint) === false)
            || (checkEdgePoint(startPoint) === false && checkEdgePoint(endPoint) === false)) {
                points.push([startPoint.x,startPoint.y]);
                //console.log([startPoint.x,startPoint.y]);
            } else if (checkEdgePoint(startPoint) === false && checkEdgePoint(endPoint) === true) {
                points.push([startPoint.x,startPoint.y]);
                points.push([endPoint.x,endPoint.y]);
                //console.log([startPoint.x,startPoint.y]);
                let newcontour = cv.matFromArray(points.length, 1, cv.CV_32SC2, points.flat(2));
                newContours.push_back(newcontour);
                console.log("Cut out contour from border (started on edge)")
                points = [];
            }
        } else if (startedOnEdge === false) {
            if (stillFirstContour === true) {
                if (checkEdgePoint(startPoint) === false && checkEdgePoint(endPoint) === false) {
                    firstContourRear.push([startPoint.x,startPoint.y]);
                }
                if (checkEdgePoint(startPoint) === false && checkEdgePoint(endPoint) === true) {
                    firstContourRear.push([startPoint.x,startPoint.y]);
                    firstContourRear.push([endPoint.x,endPoint.y]);
                    console.log("First contour terminated at pixel "+i);
                    stillFirstContour = false;
                }
            } else if (stillFirstContour === false) {
                if ((checkEdgePoint(startPoint) === true) && (checkEdgePoint(endPoint) === true)) {
                    continue;
                }
                if (checkEdgePoint(startPoint) === true && checkEdgePoint(endPoint) === false) {
                    console.log("Found new contour after hitting boundary");
                    points.push([startPoint.x,startPoint.y]);
                }
                if (checkEdgePoint(startPoint) === false && checkEdgePoint(endPoint) === false) {
                    if (i < (boundaryContour.rows - 1)) {
                        points.push([startPoint.x,startPoint.y]);
                    } else if (i === (boundaryContour.rows - 1)) {
                        let firstContour = points.concat(firstContourRear);
                        let newContour = cv.matFromArray(firstContour.length, 1, cv.CV_32SC2, firstContour.flat(2));
                        newContours.push_back(newContour);
                        console.log(firstContour);
                        console.log("Start and end of first contour cut from border and pieced together");
                    }
                }
                if (checkEdgePoint(startPoint) === false && checkEdgePoint(endPoint) === true) {
                    points.push([startPoint.x,startPoint.y]);
                    points.push([endPoint.x,endPoint.y]);
                    if (i < (boundaryContour.rows - 1)) {
                        let newContour = cv.matFromArray(points.length, 1, cv.CV_32SC2, points.flat(2));
                        newContours.push_back(newContour);
                        console.log("Cut out unique contour from border")
                        points = [];
                    } else if (i === (boundaryContour.rows - 1)) {
                        let firstContour = points.concat(firstContourRear);
                        let newContour = cv.matFromArray(firstContour.length, 1, cv.CV_32SC2, firstContour.flat(2));
                        newContours.push_back(newContour);
                        console.log(firstContour);
                        console.log("Start and end of first contour cut from border and pieced together");
                    }
                }
            }
        }
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

export function findClosestContour(pointX, pointY) {
    let contourIndex;
    let dist;
    let smallestDist = Infinity;
    for (var i = 0; i < mats.contours.size(); i++) {
        dist = cv.pointPolygonTest(mats.contours.get(i), new cv.Point(pointX, pointY), true);
        if (Math.abs(dist) < smallestDist) {
            smallestDist = Math.abs(dist);
            contourIndex = i;
        }
    }
    return contourIndex;
}

export function findClosestPoint(contour, pointX, pointY) {
    let closestPointX;
    let closestPointY;
    let contourPointX;
    let contourPointY;
    let dist;
    let smallestDist = Infinity;
    for (let i = 0; i < contour.data32S.length / 2; i++) {
        contourPointX = contour.data32S[i*2];
        contourPointY = contour.data32S[i*2 + 1];
        dist = Math.sqrt(
            Math.pow((contourPointX - pointX), 2) +
            Math.pow((contourPointY - pointY), 2)
        );
        if (dist < smallestDist) {
            smallestDist = dist;
            closestPointX = contourPointX;
            closestPointY = contourPointY;
        }
    }
    return i;
}