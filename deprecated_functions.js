export async function findContours(mat, method = cv.CHAIN_APPROX_SIMPLE) {
    console.log("Finding contours...");
    // preprocess image
    let cloneMat = mat.clone();
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.cvtColor(cloneMat, cloneMat, cv.COLOR_RGBA2GRAY, 0);
    // option 1: no in-plane components on boundary
    cv.threshold(cloneMat, cloneMat, 120, 200, cv.THRESH_BINARY_INV);
    // option 2: in-plane components on boundary (WIP)
    /*
    if (state.PBC === true) {
        cv.threshold(cloneMat, cloneMat, 120, 200, cv.THRESH_BINARY);
    } else if (state.PBC === false) {
        cv.threshold(cloneMat, cloneMat, 120, 200, cv.THRESH_BINARY_INV);
    }
    */
    console.log("Image filtered...");
    // find contours
    await cv.findContours(cloneMat, contours, hierarchy, cv.RETR_CCOMP, method);
    console.log("Contours found!");
    cloneMat.delete(); hierarchy.delete();
    //mats.hierarchy = hierarchy;
    // option 1: no in-plane components on boundary
    contours = await fixBoundaryContour(contours);
    // option 2: in-plane components on boundary (WIP)
    /*
    if (state.PBC === true) {
    contours = await fixBoundaryContour(contours);
    }
    */
    state.contour_number_noborder = contours.size();
    return contours;
}

function spliceBoundaryContour(boundaryContour, newContours) {
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
                //console.log([startPoint.x,startPoint.y]);
            } else if (checkEdgePoint(startPoint) === false && checkEdgePoint(endPoint) === true) {
                points.push([startPoint.x,startPoint.y]);
                points.push([endPoint.x,endPoint.y]);
                //console.log([startPoint.x,startPoint.y]);
                let newcontour = cv.matFromArray(points.length, 1, cv.CV_32SC2, points.flat(2));
                newContours.push_back(newcontour);
                console.log("Cut a contour from border (started on edge)")
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
                        newContours.push_back(newcontour);
                        console.log("Cut a contour from border")
                        points = [];
                    } else if (i === (boundaryContour.rows - 1)) {
                        let firstContour = points.concat(firstContourRear);
                        let newcontour = cv.matFromArray(1, firstContour.length, cv.CV_32SC2, firstContour.flat(2));
                        newContours.push_back(newcontour);
                        console.log("Cut a contour from border");
                    }
                }
            }
        }
    }
}