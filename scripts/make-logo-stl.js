// Generates a 3D-printable STL of the PrintSlice icon (the four-square
// pinwheel + center diamond mark) — a flat plaque, not a photo-realistic
// extrusion of logo-icon.png. Built directly from the icon's actual
// geometry (four squares in a 2x2 grid with a cross-shaped gap, chamfered
// corners standing in for the true rounded corners — an octagon-style cut
// is far more reliable to produce as clean, valid solid geometry than
// approximating a true arc, and reads visually close enough at print
// scale) rather than tracing the PNG pixel-by-pixel, which would need an
// image-decoding dependency and produce jagged stair-stepped edges at
// any reasonable resolution.
//
// Usage: node scripts/make-logo-stl.js [outputPath]

const fs = require('fs');

function sub3(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function cross3(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function normalize3(a) {
  const len = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0]/len, a[1]/len, a[2]/len];
}

// Extrudes a closed 2D polygon (array of [x,y], counter-clockwise, viewed
// from +Z) into a solid prism from zMin to zMax: a fan-triangulated bottom
// cap, a fan-triangulated top cap, and a quad (as 2 triangles) per side
// wall. Fan triangulation is only valid for convex polygons, which every
// shape used below is (rectangles and chamfered-corner octagons are both
// convex), so no more general triangulation is needed here.
function extrudePolygon(poly2d, zMin, zMax) {
  const tris = [];
  const bottom = poly2d.map(p => [p[0], p[1], zMin]);
  const top = poly2d.map(p => [p[0], p[1], zMax]);
  const n = poly2d.length;

  for (let i = 1; i < n - 1; i++) {
    tris.push([bottom[0], bottom[i+1], bottom[i]]); // downward-facing, reversed winding
    tris.push([top[0], top[i], top[i+1]]);           // upward-facing
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    tris.push([bottom[i], bottom[j], top[j]]);
    tris.push([bottom[i], top[j], top[i]]);
  }
  return tris;
}

// A square of the given half-size centered at (cx, cy), with its outer
// corner (the one furthest from the icon's center at the origin) chamfered
// — matching the icon's rounded-corner look on the corner that's actually
// visible, while keeping the two corners against the cross gap sharp
// (they're partially hidden by the gap anyway, and staying square there
// keeps the gap a clean straight line).
function chamferedSquare(cx, cy, half, outerCornerSign, chamfer) {
  const x0 = cx - half, x1 = cx + half;
  const y0 = cy - half, y1 = cy + half;
  const [sx, sy] = outerCornerSign; // which corner is "outer", e.g. [1,1] = top-right
  const ox = sx > 0 ? x1 : x0;
  const oy = sy > 0 ? y1 : y0;
  const vertPt = [ox, oy - sy*chamfer];   // point on the vertical edge (x = ox)
  const horizPt = [ox - sx*chamfer, oy];  // point on the horizontal edge (y = oy)
  // Which of the two edges meeting at this corner is the INCOMING one (in
  // the polygon's counter-clockwise BL->BR->TR->TL walk) determines which
  // chamfer point must be listed first — get this backwards and the two
  // points cross over each other into a self-intersecting bowtie notch
  // instead of a clean cut (confirmed by direct testing: exactly this
  // happened on the top-right and bottom-left corners before this fix,
  // visible as a stray triangular spike in a top-down render). For BL/TR
  // (sx === sy) the incoming edge is vertical; for BR/TL (sx !== sy) it's
  // horizontal.
  const chamferPts = (sx === sy) ? [vertPt, horizPt] : [horizPt, vertPt];
  const pts = [];
  // Walk the square's perimeter counter-clockwise starting bottom-left,
  // replacing the outer corner with the two chamfer points in the order
  // determined above.
  const corners = [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  for (const [cxp, cyp] of corners) {
    if (cxp === ox && cyp === oy) {
      pts.push(chamferPts[0]);
      pts.push(chamferPts[1]);
    } else {
      pts.push([cxp, cyp]);
    }
  }
  return pts;
}

function diamond(cx, cy, halfDiag) {
  return [
    [cx, cy - halfDiag],
    [cx + halfDiag, cy],
    [cx, cy + halfDiag],
    [cx - halfDiag, cy],
  ];
}

// --- Build the icon ---
const OUTER = 25;      // half-width of the whole icon footprint (50mm square overall)
const GAP = 1.6;        // half-gap between the four squares, for the cross divider
const CHAMFER = 4.2;    // chamfer cut size on each square's outer corner
const BASE_Z = 3.0;     // thickness of the four square blocks
const DIAMOND_HALF_DIAG = 6.2;
const DIAMOND_TOP_Z = 5.0; // diamond stands proud of the squares

const half = (OUTER - GAP) / 2;
const quadrants = [
  { cx:  half + GAP, cy:  half + GAP, corner: [ 1,  1] }, // top-right
  { cx: -half - GAP, cy:  half + GAP, corner: [-1,  1] }, // top-left
  { cx: -half - GAP, cy: -half - GAP, corner: [-1, -1] }, // bottom-left
  { cx:  half + GAP, cy: -half - GAP, corner: [ 1, -1] }, // bottom-right
];

let triangles = [];
for (const q of quadrants) {
  const poly = chamferedSquare(q.cx, q.cy, half, q.corner, CHAMFER);
  triangles = triangles.concat(extrudePolygon(poly, 0, BASE_Z));
}
triangles = triangles.concat(extrudePolygon(diamond(0, 0, DIAMOND_HALF_DIAG), 0, DIAMOND_TOP_Z));

// --- Write binary STL ---
function writeBinarySTL(tris, outPath) {
  const buf = Buffer.alloc(84 + tris.length * 50);
  buf.write('PrintSlice logo plaque'.padEnd(80, ' ').slice(0, 80), 0, 'ascii');
  buf.writeUInt32LE(tris.length, 80);
  let offset = 84;
  for (const tri of tris) {
    const e1 = sub3(tri[1], tri[0]);
    const e2 = sub3(tri[2], tri[0]);
    const n = normalize3(cross3(e1, e2));
    buf.writeFloatLE(n[0], offset); buf.writeFloatLE(n[1], offset+4); buf.writeFloatLE(n[2], offset+8);
    offset += 12;
    for (const v of tri) {
      buf.writeFloatLE(v[0], offset); buf.writeFloatLE(v[1], offset+4); buf.writeFloatLE(v[2], offset+8);
      offset += 12;
    }
    buf.writeUInt16LE(0, offset);
    offset += 2;
  }
  fs.writeFileSync(outPath, buf);
}

const outPath = process.argv[2] || 'printslice-logo.stl';
writeBinarySTL(triangles, outPath);
console.log(`Wrote ${triangles.length} triangles to ${outPath}`);
