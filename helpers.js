export let mats = {};
export let state = {
  PBC: true,
  bpClickZone: 20,
  stride_default: 20,
};

// useful function for async behavior
export function waitFor(conditionFunction) {

  const poll = resolve => {
    if(conditionFunction()) resolve();
    else setTimeout(_ => poll(resolve), 100);
  }

  return new Promise(poll);
}

// tool for arrow drawing function
function lineToAngle(ctx, x0, y0, length, thickness, color, angle, isHead) {
  if (isHead === false) {
    // angle = (angle - 90) * Math.PI / 180;
    var x1 = x0 - (length * Math.cos(angle))/2,
      y1 = y0 - (length * Math.sin(angle))/2;
    var x2 = x0 + (length * Math.cos(angle))/2,
      y2 = y0 + (length * Math.sin(angle))/2;
  } else if (isHead === true) {
    // angle = (angle - 90) * Math.PI / 180;
    var x1 = x0,
      y1 = y0;
    var x2 = x0 + length * Math.cos(angle),
      y2 = y0 + length * Math.sin(angle);
  }
  ctx.lineWidth = thickness;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.fill();

  return {
    x: x2,
    y: y2
  };
}

// arrow drawing function
export function drawArrow(ctx, x0, y0, arrowLength, headLength, thickness, color, angle) {
  var pos = lineToAngle(ctx, x0, y0, arrowLength, thickness, color, angle, false);
  lineToAngle(ctx, pos.x, pos.y, headLength, thickness, color, angle - (5*Math.PI/6), true);
  lineToAngle(ctx, pos.x, pos.y, headLength, thickness, color, angle + (5*Math.PI/6), true);
}