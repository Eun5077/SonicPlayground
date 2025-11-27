// =========================
// Canvas, Global
// =========================
const canvas = document.getElementById("SonicPlayground");
const ctx = canvas.getContext("2d");

// Tool: polygon | ball | brush | arrow | shape | eraser
let tool = "polygon";
const polygons = [];
const balls = [];
const brushes = [];
const arrows = [];
const shapes = [];
const toolDescriptions = {
  polygon: "🔷 Polygon: Click on the canvas to place points, then press Enter to complete the shape.",
  ball: "⚽ Ball: Click on the canvas to create a ball. The ball bounces off walls and shapes.",
  brush: "🎨 Brush: Click and drag to paint. Balls slow down inside painted areas.",
  arrow: "➡️ Arrow: Click and drag to set a direction and length. Horizontal drag changes volume, and vertical drag shifts pitch.",
  shape: "⚪️🔺🟦 Shape: Click and drag to place an obstacle (1: circle, 2: triangle, 3: square). They don’t make sound.",
  eraser: "🧽 Eraser: Click and drag to erase objects in that area."
};
const desc = document.getElementById("toolDescription");
if (desc) {
  desc.textContent = toolDescriptions[tool];
}

let currentPoints = [];
let isDrawingBrush = false;
let brushCurrent = null;
let arrowStart = null;
let isCreatingShape = false;
let shapeStart = null;
let shapePreview = null;
let isErasing = false;
let eraseStart = null;
let eraseEnd = null;

let currentBallType = "type1";
let currentShapeType = "circle";

const bounceFactor = 1;
const BALL_STYLES = {
  type1: { color: "#ff5ebc" },
  type2: { color: "#5cffd7" },
  type3: { color: "#b085ff" },
};
// Envelope defaults
const ballEnvelopeByType = {
  type1: { attack: 0.001, decay: 0.12, sustain: 0.0, release: 0.15 },  // pluckSynth
  type2: { attack: 0.001, decay: 0.2,  sustain: 0.0, release: 0.15 },  // metalSynth
  type3: { attack: 0.4,   decay: 1.0,  sustain: 0.6, release: 1.8 },   // padSynth
};
let currentEnvelopeType = "type1";

const ARROW_LIFETIME_MS = 1500;
// Arrow control(volume/pitch)
let arrowVolumeDb = 0;
let arrowPitchSemitone = 0;

// =========================
// Audio Setup
// =========================
const synth = new Tone.PolySynth(Tone.Synth);
synth.volume.value = -6; 

synth.set({
  oscillator: { type: "sine" },
  envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.2 }
});

const quadBusFL = new Tone.Gain(0);
const quadBusFR = new Tone.Gain(0);
const quadBusBL = new Tone.Gain(0);
const quadBusBR = new Tone.Gain(0);

const quadBusLeft  = new Tone.Gain(1);
const quadBusRight = new Tone.Gain(1);
const pannerLeft   = new Tone.Panner(-1).toDestination();
const pannerRight  = new Tone.Panner(1).toDestination();

quadBusFL.connect(quadBusLeft);
quadBusBL.connect(quadBusLeft);
quadBusFR.connect(quadBusRight);
quadBusBR.connect(quadBusRight);

quadBusLeft.connect(pannerLeft);
quadBusRight.connect(pannerRight);

function setQuadBusGains(FL, FR, BL, BR) {
  quadBusFL.gain.rampTo(FL, 0.01);
  quadBusFR.gain.rampTo(FR, 0.01);
  quadBusBL.gain.rampTo(BL, 0.01);
  quadBusBR.gain.rampTo(BR, 0.01);
}

synth.connect(quadBusFL);
synth.connect(quadBusFR);
synth.connect(quadBusBL);
synth.connect(quadBusBR);

const reverb = new Tone.Reverb({
  decay: 3,
  preDelay: 0.05
});
reverb.toDestination();

const reverbSend = new Tone.Gain(0.3);

quadBusLeft.connect(reverbSend);
quadBusRight.connect(reverbSend);
reverbSend.connect(reverb);

reverb.wet.value = 0.4;

function getQuadGains(x, y) {
  if (!canvas || canvas.width === 0 || canvas.height === 0) {
    return { FL: 0.25, FR: 0.25, BL: 0.25, BR: 0.25 };
  }

  const xNorm = x / canvas.width;
  const yNorm = y / canvas.height;

  const left   = 1 - xNorm;
  const right  = xNorm;
  const top    = 1 - yNorm;
  const bottom = yNorm;

  let FL = left  * top;
  let FR = right * top;
  let BL = left  * bottom;
  let BR = right * bottom;

  const sum = FL + FR + BL + BR;
  if (sum > 0) {
    FL /= sum;
    FR /= sum;
    BL /= sum;
    BR /= sum;
  }

  return { FL, FR, BL, BR };
}

// Ball Type 1
const pluckSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "triangle" },
  envelope: {
    attack: 0.001,
    decay: 0.12,
    sustain: 0.3,
    release: 0.15,
  },
});
pluckSynth.connect(quadBusFL);
pluckSynth.connect(quadBusFR);
pluckSynth.connect(quadBusBL);
pluckSynth.connect(quadBusBR);

// Ball Type 2
const metalSynth = new Tone.PolySynth(Tone.FMSynth, {
  harmonicity: 3,
  modulationIndex: 40,
  oscillator: { type: "square" },
  modulation: { type: "square" },
  envelope: {
    attack: 0.001,
    decay: 0.2,
    sustain: 0.0,
    release: 0.15,
  },
  modulationEnvelope: {
    attack: 0.001,
    decay: 0.15,
    sustain: 0,
    release: 0.15,
  },
});
metalSynth.connect(quadBusFL);
metalSynth.connect(quadBusFR);
metalSynth.connect(quadBusBL);
metalSynth.connect(quadBusBR);

// Ball Type 3
const padSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "sine" },
  envelope: {
    attack: 0.4,
    decay: 1.0,
    sustain: 0.6,
    release: 1.8,
  },
});
padSynth.volume.value = -12;
padSynth.connect(quadBusFL);
padSynth.connect(quadBusFR);
padSynth.connect(quadBusBL);
padSynth.connect(quadBusBR);

function getSynthForBall(ball) {
  if (ball.type === "type1") return pluckSynth;
  if (ball.type === "type2") return metalSynth;
  if (ball.type === "type3") return padSynth;
  return pluckSynth;
}

function applyEnvelopeToSynthForBall(ball) {
  const env = ballEnvelopeByType[ball.type] || ballEnvelopeByType.type1;
  const s = getSynthForBall(ball);
  if (!s) return;

  s.set({
    envelope: {
      attack:  env.attack,
      decay:   env.decay,
      sustain: env.sustain,
      release: env.release,
    }
  });
}

function getBallColor(type) {
  const style = BALL_STYLES[type] || BALL_STYLES.type1;
  return style.color;
}

// =========================
// Tool, UI
// =========================
function setBallType(type) {
  currentBallType = type;

  document.querySelectorAll(".ball-option").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.ball === type);
  });

  currentEnvelopeType = type;
  refreshBallEnvelopeSlidersFromState();
}

function setShapeType(type) {
  currentShapeType = type;

  document.querySelectorAll(".shape-option").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.shape === type);
  });
}

function getBallCursor(type) {
  const style = BALL_STYLES[type] || BALL_STYLES.type1;
  const color = style.color;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
      <circle cx="16" cy="16" r="8" fill="${color}" stroke="grey" stroke-width="2" />
    </svg>
  `;
  const encoded = encodeURIComponent(svg.trim());
  return `url("data:image/svg+xml;utf8,${encoded}") 16 16, auto`;
}

function updateBallCursor() {
  if (tool === "ball") {
    canvas.style.cursor = getBallCursor(currentBallType);
  }
}

function updateBallOptionButtonColors() {
  document.querySelectorAll(".ball-option").forEach(btn => {
    const type = btn.dataset.ball;
    const color = BALL_STYLES[type].color;
    const dot = btn.querySelector(".ball-dot");
    if (dot) {
      dot.style.backgroundColor = color;
    }
  });
}

// =========================
// DOM event wiring(toolbar, options)
// =========================
document.querySelectorAll(".tool-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    tool = btn.dataset.tool;

    const desc = document.getElementById("toolDescription");
    if (desc) desc.textContent = toolDescriptions[tool] || "";

    const ballOptions = document.getElementById("ballOptions");
    if (ballOptions) {
      ballOptions.style.display = tool === "ball" ? "flex" : "none";
    }


    const shapeOptions = document.getElementById("shapeOptions");
    if (shapeOptions) {
      shapeOptions.style.display = tool === "shape" ? "flex" : "none";
    }

    switch (tool) {
      case "polygon":
        canvas.style.cursor = "crosshair";
        break;
      case "ball":
        updateBallCursor();
        break;
      case "brush":
        canvas.style.cursor = "url('cursors/brush_black.png') 8 8, auto";
        break;
      case "arrow":
        canvas.style.cursor = "pointer";
        break;
      case "shape":
        canvas.style.cursor = "crosshair";
        break;
      case "eraser":
        canvas.style.cursor = "url('cursors/eraser_black.png') 8 8, auto";
        break;
      default:
        canvas.style.cursor = "default";
    }

    currentPoints = [];
    isDrawingBrush = false;
    isErasing = false;
    brushCurrent = null;
    arrowStart = null;
  });
});

document.querySelectorAll(".ball-option").forEach(btn => {
  btn.addEventListener("click", () => {
    const type = btn.dataset.ball;
    setBallType(type);
    updateBallCursor();
  });
});

document.querySelectorAll(".shape-option[data-shape]").forEach(btn => {
  btn.addEventListener("click", () => {
    const type = btn.dataset.shape;
    setShapeType(type);
  });
});

// =========================
// Mouse, keyboard events
// =========================
function getMousePos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener("mousedown", (e) => {
  const pos = getMousePos(e);
  const x = e.offsetX;
  const y = e.offsetY;

  if (tool === "polygon") {
    currentPoints.push(pos);

  } else if (tool === "ball") {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3;
    const color = getBallColor(currentBallType);

    balls.push({
      x: pos.x,
      y: pos.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 10,
      color,
      type: currentBallType,
    });

  } else if (tool === "brush") {
    isDrawingBrush = true;
    brushCurrent = { points: [pos], alpha: 0.5, size: 50, color: "#6cf" };
    brushes.push(brushCurrent);

  } else if (tool === "arrow") {
    arrowStart = { x, y };

  } else if (tool === "shape") {
    isCreatingShape = true;
    shapeStart = pos;
    shapePreview = { x: pos.x, y: pos.y, r: 0 };

  } else if (tool === "eraser") {
    isErasing = true;
    eraseStart = pos;
    eraseEnd = pos;
  }
});

canvas.addEventListener("mousemove", (e) => {
  const pos = getMousePos(e);
  if (tool === "brush" && isDrawingBrush && brushCurrent) {
    brushCurrent.points.push(pos);
  }
  if (tool === "eraser" && isErasing) {
    eraseEnd = pos;
  }
  if (tool === "shape" && isCreatingShape && shapePreview) {
    const dx = pos.x - shapeStart.x;
    const dy = pos.y - shapeStart.y;
    shapePreview.r = Math.sqrt(dx * dx + dy * dy);
  }
});

canvas.addEventListener("mouseup", (e) => {
  const pos = getMousePos(e);
  const x = e.offsetX;
  const y = e.offsetY;

  if (tool === "brush") {
    isDrawingBrush = false;
    brushCurrent = null;
  }

  if (tool === "arrow" && arrowStart) {
    const dx = x - arrowStart.x;
    const dy = y - arrowStart.y;
    const length = Math.hypot(dx, dy);

    const arrowObj = {
      x1: arrowStart.x,
      y1: arrowStart.y,
      x2: x,
      y2: y,
      dx,
      dy,
      length,
      createdAt: performance.now(),
      lifeMs: ARROW_LIFETIME_MS,
    };

    arrows.push(arrowObj);
    applyArrowControlFromArrow(arrowObj);
    arrowStart = null;
  }

  if (tool === "eraser" && isErasing) {
    eraseEnd = pos;
    isErasing = false;
    if (eraseStart && eraseEnd) {
      eraseRectArea(eraseStart, eraseEnd);
    }
    eraseStart = null;
    eraseEnd = null;
  }

  if (tool === "shape" && isCreatingShape && shapePreview) {
    if (shapePreview.r > 5) {
      const cx = shapeStart.x;
      const cy = shapeStart.y;
      const r = shapePreview.r;

      const shape = { x: cx, y: cy, r, type: currentShapeType };

      if (currentShapeType === "triangle") {
        const pts = [];
        const R = r;
        for (let i = 0; i < 3; i++) {
          const ang = -Math.PI / 2 + i * (2 * Math.PI / 3);
          pts.push({
            x: cx + R * Math.cos(ang),
            y: cy + R * Math.sin(ang),
          });
        }
        shape.points = pts;
      } else if (currentShapeType === "square") {
        const w = r;
        const h = r;
        shape.points = [
          { x: cx - w / 2, y: cy - h / 2 },
          { x: cx + w / 2, y: cy - h / 2 },
          { x: cx + w / 2, y: cy + h / 2 },
          { x: cx - w / 2, y: cy + h / 2 },
        ];
      }

      shapes.push(shape);
    }
    isCreatingShape = false;
    shapePreview = null;
    shapeStart = null;
  }
});

canvas.addEventListener("mouseleave", () => {
  if (tool === "eraser" && isErasing) {
    isErasing = false;
    if (eraseStart && eraseEnd) {
      eraseRectArea(eraseStart, eraseEnd);
    }
    eraseStart = null;
    eraseEnd = null;
  }
});


window.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    if (currentPoints.length >= 3) {
      const finalized = makePolygonObject([...currentPoints]);
      polygons.push(finalized);
    }
    currentPoints = [];
  }
  if (tool === "shape") {
    if (e.key === "1") setShapeType("circle");
    if (e.key === "2") setShapeType("triangle");
    if (e.key === "3") setShapeType("square");
  }
});

// =========================
// Geometry & erase helpers
// =========================
function eraseRectArea(start, end) {
  const x1 = Math.min(start.x, end.x);
  const y1 = Math.min(start.y, end.y);
  const x2 = Math.max(start.x, end.x);
  const y2 = Math.max(start.y, end.y);

  function inRect(p) {
    return p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2;
  }

  for (let i = balls.length - 1; i >= 0; i--) {
    if (inRect(balls[i])) balls.splice(i, 1);
  }

  for (let i = shapes.length - 1; i >= 0; i--) {
    if (inRect(shapes[i])) shapes.splice(i, 1);
  }

  for (let i = polygons.length - 1; i >= 0; i--) {
    const pts = polygons[i].points;
    if (pts.some(inRect)) polygons.splice(i, 1);
  }

  for (let i = brushes.length - 1; i >= 0; i--) {
    const pts = brushes[i].points;
    if (pts.some(inRect)) brushes.splice(i, 1);
  }

  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i];
    const mid = { x: (a.x1 + a.x2) / 2, y: (a.y1 + a.y2) / 2 };
    if ((inRect({ x: a.x1, y: a.y1 }) && inRect({ x: a.x2, y: a.y2 })) || inRect(mid)) {
      arrows.splice(i, 1);
    }
  }
}

function dist2D(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function polygonPerimeter(points) {
  let per = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    per += dist2D(a, b);
  }
  return per;
}

function pointInPolygon(p, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y;
    const xj = pts[j].x, yj = pts[j].y;
    const intersect =
      ((yi > p.y) !== (yj > p.y)) &&
      (p.x < (xj - xi) * (p.y - yi) / (yj - yi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointSegDist(p, a, b) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = p.x - a.x;
  const wy = p.y - a.y;

  const c1 = wx * vx + wy * vy;
  if (c1 <= 0) return Math.hypot(p.x - a.x, p.y - a.y);

  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(p.x - b.x, p.y - b.y);

  const t = c1 / c2;
  const proj = { x: a.x + t * vx, y: a.y + t * vy };
  return Math.hypot(p.x - proj.x, p.y - proj.y);
}

function nearestPointOnPolylineDist(p, polyline) {
  let best = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];
    const d = pointSegDist(p, a, b);
    if (d < best) best = d;
  }
  return best;
}

// =========================
// Brush slowdown
// =========================
function getBrushSlowFactor(x, y) {
  if (brushes.length === 0) return 1;

  const p = { x, y };
  let hits = 0;

  for (const b of brushes) {
    if (!b.points || b.points.length < 2) continue;
    const dist = nearestPointOnPolylineDist(p, b.points);
    const radius = (b.size || 10) / 2;
    if (dist <= radius) hits += 1;
  }

  if (hits === 0) return 1;

  const base = 0.7;
  let factor = Math.pow(base, hits);
  const minFactor = 0.25;
  if (factor < minFactor) factor = minFactor;
  return factor;
}


// =========================
// Pitch & sound
// =========================
function yToPitch(y) {
  const ratio = 1 - (y / canvas.height);
  let midi = 48 + ratio * (84 - 48);
  midi += arrowPitchSemitone;
  return Tone.Frequency(midi, "midi").toFrequency();
}

function triggerBallSound(ball, y) {
  const freq = yToPitch(y);
  applyEnvelopeToSynthForBall(ball);

  const { FL, FR, BL, BR } = getQuadGains(ball.x, ball.y);

  setQuadBusGains(FL, FR, BL, BR);

  switch (ball.type) {
    case "type1":
      pluckSynth.triggerAttackRelease(freq * Math.pow(2, -18 / 12), "8n", undefined, 0.9);
      break;
    case "type2":
      metalSynth.triggerAttackRelease(freq, "4n");
      break;
    case "type3":
      padSynth.triggerAttackRelease(freq * Math.pow(2, 6 / 12), "2n");
      break;
    default:
      synth.triggerAttackRelease(freq, "8n");
  }
}


function applyArrowControlFromArrow(a) {
  const maxDist = 300;

  const clampedDx = Math.max(-maxDist, Math.min(maxDist, a.dx));
  const clampedDy = Math.max(-maxDist, Math.min(maxDist, a.dy));

  const maxVolumeDbPerGesture = 6;
  const maxPitchSemitonePerGesture = 3;

  const deltaVolume = (clampedDx / maxDist) * maxVolumeDbPerGesture;
  const deltaPitch = (-clampedDy / maxDist) * maxPitchSemitonePerGesture;

  const totalVolumeMin = -18;
  const totalVolumeMax = 6;
  const totalPitchMin = -12;
  const totalPitchMax = 12;

  arrowVolumeDb = Math.max(
    totalVolumeMin,
    Math.min(totalVolumeMax, arrowVolumeDb + deltaVolume)
  );

  arrowPitchSemitone = Math.max(
    totalPitchMin,
    Math.min(totalPitchMax, arrowPitchSemitone + deltaPitch)
  );
}

// =========================
// Polygon playhead
// =========================
function makePolygonObject(points) {
  const per = polygonPerimeter(points);
  return {
    points,
    perimeter: per,
    t: 0,
    speed: 120,
    lastVertexIdx: -1,
    playheadX: points[0].x,
    playheadY: points[0].y,
  };
}

function pointOnPolygon(poly, distAlong) {
  distAlong = distAlong % poly.perimeter;

  const pts = poly.points;
  let acc = 0;

  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const segLen = Math.sqrt(dx * dx + dy * dy);

    if (acc + segLen >= distAlong) {
      const local = distAlong - acc;
      const ratio = segLen === 0 ? 0 : local / segLen;
      return {
        x: a.x + dx * ratio,
        y: a.y + dy * ratio,
        segmentIndex: i,
        atVertexStart: (local < 4),
      };
    }
    acc += segLen;
  }

  return {
    x: pts[0].x,
    y: pts[0].y,
    segmentIndex: 0,
    atVertexStart: true,
  };
}

// =========================
// Physics & collisions
// =========================
function handleBallBallCollisions() {
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const b1 = balls[i];
      const b2 = balls[j];

      const dx = b2.x - b1.x;
      const dy = b2.y - b1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = b1.r + b2.r;

      if (dist < minDist && dist > 0) {
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        const pushAmount = overlap / 2;

        b1.x -= nx * pushAmount;
        b1.y -= ny * pushAmount;
        b2.x += nx * pushAmount;
        b2.y += ny * pushAmount;

        const rvx = b2.vx - b1.vx;
        const rvy = b2.vy - b1.vy;
        const relVelAlongNormal = rvx * nx + rvy * ny;

        if (relVelAlongNormal < 0) {
          const e = bounceFactor;
          const jImpulse = -(1 + e) * relVelAlongNormal / 2;
          const impulseX = jImpulse * nx;
          const impulseY = jImpulse * ny;

          b1.vx -= impulseX;
          b1.vy -= impulseY;
          b2.vx += impulseX;
          b2.vy += impulseY;
        }

        const impactY = (b1.y + b2.y) / 2;
        triggerBallSound(b1, impactY);
        triggerBallSound(b2, impactY);
      }
    }
  }
}

function checkBallPolygonCollision(ball, poly) {
  if (!poly.points || poly.points.length < 2) return;

  const pts = poly.points;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    if (segLen === 0) continue;

    const nx = -dy / segLen;
    const ny = dx / segLen;

    const dist = (ball.x - p1.x) * nx + (ball.y - p1.y) * ny;
    if (Math.abs(dist) < ball.r) {
      const proj = (ball.x - p1.x) * dx + (ball.y - p1.y) * dy;
      if (proj >= 0 && proj <= segLen * segLen) {
        const penetration = ball.r - Math.abs(dist);
        if (penetration > 0) {
          const pushDir = dist > 0 ? 1 : -1;
          ball.x += nx * pushDir * penetration;
          ball.y += ny * pushDir * penetration;
        }

        const dot = ball.vx * nx + ball.vy * ny;
        ball.vx -= 2 * dot * nx;
        ball.vy -= 2 * dot * ny;

        ball.vx *= bounceFactor;
        ball.vy *= bounceFactor;

        triggerBallSound(ball, ball.y);
      }
    }
  }
}

function checkBallArrowCollision(ball, arrow) {
  const p1 = { x: arrow.x1, y: arrow.y1 };
  const p2 = { x: arrow.x2, y: arrow.y2 };

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;

  const nx = -dy / len;
  const ny = dx / len;

  const dist = (ball.x - p1.x) * nx + (ball.y - p1.y) * ny;
  const proj = (ball.x - p1.x) * dx + (ball.y - p1.y) * dy;

  if (Math.abs(dist) < ball.r && proj >= 0 && proj <= len * len) {
    ball.x -= nx * (ball.r - dist);
    ball.y -= ny * (ball.r - dist);

    const dot = ball.vx * nx + ball.vy * ny;
    ball.vx -= 2 * dot * nx;
    ball.vy -= 2 * dot * ny;

    ball.vx *= bounceFactor;
    ball.vy *= bounceFactor;

    triggerBallSound(ball, ball.y);
  }
}

function checkBallShapeCollision(ball, shape) {
  if (shape.type === "circle") {
    const dx = ball.x - shape.x;
    const dy = ball.y - shape.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    const R = shape.r;
    const r = ball.r;

    if (Math.abs(dist - R) > r) return;

    const nx = dx / dist;
    const ny = dy / dist;

    if (dist > R) {
      const targetDist = R + r;
      const penetration = targetDist - dist;
      ball.x += nx * penetration;
      ball.y += ny * penetration;
    } else {
      const targetDist = R - r;
      const penetration = dist - targetDist;
      ball.x -= nx * penetration;
      ball.y -= ny * penetration;
    }

    const dot = ball.vx * nx + ball.vy * ny;
    ball.vx -= 2 * dot * nx;
    ball.vy -= 2 * dot * ny;

    ball.vx *= bounceFactor;
    ball.vy *= bounceFactor;

    triggerBallSound(ball, ball.y);
  } else {
    if (!shape.points) return;
    checkBallPolygonCollision(ball, { points: shape.points });
  }
}

// =========================
// Update loop
// =========================
function updateBalls() {
  for (let b of balls) {
    const slowFactor = getBrushSlowFactor(b.x, b.y);

    b.x += b.vx * slowFactor;
    b.y += b.vy * slowFactor;

    if (b.y - b.r < 0) {
      b.y = b.r;
      b.vy *= -bounceFactor;
      triggerBallSound(b, b.y);
    }

    if (b.y + b.r > canvas.height) {
      b.y = canvas.height - b.r;
      b.vy *= -bounceFactor;
      triggerBallSound(b, b.y);
    }

    if (b.x - b.r < 0) {
      b.x = b.r;
      b.vx *= -bounceFactor;
      triggerBallSound(b, b.y);
    }

    if (b.x + b.r > canvas.width) {
      b.x = canvas.width - b.r;
      b.vx *= -bounceFactor;
      triggerBallSound(b, b.y);
    }

    for (let poly of polygons) {
      checkBallPolygonCollision(b, poly);
    }

    for (let arrow of arrows) {
      checkBallArrowCollision(b, arrow);
    }

    for (let shape of shapes) {
      checkBallShapeCollision(b, shape);
    }
  }

  handleBallBallCollisions();
}

function updatePolygons(deltaTimeSec) {
  for (let poly of polygons) {
    const px = (poly.playheadX !== undefined) ? poly.playheadX : poly.points[0].x;
    const py = (poly.playheadY !== undefined) ? poly.playheadY : poly.points[0].y;
    const slowFactor = getBrushSlowFactor(px, py);

    poly.t += poly.speed * slowFactor * deltaTimeSec;

    if (poly.t > poly.perimeter) {
      poly.t = poly.t % poly.perimeter;
      poly.lastVertexIdx = -1;
    }

    const info = pointOnPolygon(poly, poly.t);
    poly.playheadX = info.x;
    poly.playheadY = info.y;

    const currentVertexIdx = info.segmentIndex;
    const atExactVertex = info.atVertexStart;

    if (atExactVertex && currentVertexIdx !== poly.lastVertexIdx) {
      const note = yToPitch(info.y);

      const { FL, FR, BL, BR } = getQuadGains(info.x, info.y);

      setQuadBusGains(FL, FR, BL, BR);

      synth.triggerAttackRelease(note, "8n");

      poly.lastVertexIdx = currentVertexIdx;
    }
  }
}

// =========================
// Drawing
// =========================
function drawBrushes() {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const s of brushes) {
    if (s.points.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) {
      ctx.lineTo(s.points[i].x, s.points[i].y);
    }
    ctx.strokeStyle = s.color;
    ctx.globalAlpha = s.alpha;
    ctx.lineWidth = s.size;
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }
}

function drawArrows() {
  const now = performance.now();
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i];
    const t = now - a.createdAt;
    const life = Math.max(0, 1 - t / a.lifeMs);
    if (life <= 0) {
      arrows.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = 0.3 + 0.7 * life;
    ctx.strokeStyle = "#ffd36e";
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.moveTo(a.x1, a.y1);
    ctx.lineTo(a.x2, a.y2);
    ctx.stroke();

    const ang = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
    const L = 10;
    ctx.beginPath();
    ctx.moveTo(a.x2, a.y2);
    ctx.lineTo(a.x2 - L * Math.cos(ang - Math.PI / 6), a.y2 - L * Math.sin(ang - Math.PI / 6));
    ctx.moveTo(a.x2, a.y2);
    ctx.lineTo(a.x2 - L * Math.cos(ang + Math.PI / 6), a.y2 - L * Math.sin(ang + Math.PI / 6));
    ctx.stroke();
    ctx.restore();
  }
}

function drawShapes() {
  // fill
  for (const s of shapes) {
    ctx.beginPath();

    if (s.type === "circle") {
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    } else if ((s.type === "triangle" || s.type === "square") && s.points && s.points.length >= 3) {
      const pts = s.points;
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();
    } else {
      continue;
    }

    ctx.fillStyle = "#2a3242";
    ctx.fill();
  }

  // stroke
  for (const s of shapes) {
    ctx.beginPath();

    if (s.type === "circle") {
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    } else if ((s.type === "triangle" || s.type === "square") && s.points && s.points.length >= 3) {
      const pts = s.points;
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();
    } else {
      continue;
    }

    ctx.strokeStyle = "#9ab6ff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawPolygon(points, fillStyle, strokeStyle, isPreview = false) {
  if (points.length === 0) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  if (!isPreview && points.length >= 3) {
    ctx.closePath();
  }

  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();

  for (let p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = strokeStyle;
    ctx.fill();
  }
}

function drawBalls() {
  for (let b of balls) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();
  }
}

// =========================
// Main render loop
// =========================
let lastTime = performance.now();

function draw() {
  const now = performance.now();
  const deltaMs = now - lastTime;
  lastTime = now;
  const deltaSec = deltaMs / 1000;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const baseVolumeDb = -6;
  Tone.getDestination().volume.value = baseVolumeDb + arrowVolumeDb;

  updatePolygons(deltaSec);
  updateBalls();
  drawShapes();

  polygons.forEach(poly => {
    drawPolygon(poly.points, "#e1edf8ff", "#1d6adf");
  });

  polygons.forEach(poly => {
    if (poly.playheadX !== undefined) {
      ctx.beginPath();
      ctx.arc(poly.playheadX, poly.playheadY, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#6a95e4ff";
      ctx.fill();
    }
  });

  drawBrushes();
  drawArrows();

  if (tool === "polygon" && currentPoints.length > 0) {
    drawPolygon(currentPoints, "rgba(255,255,255,0.2)", "#1d6adf", true);
  }

  drawBalls();

  if (tool === "eraser" && isErasing && eraseStart && eraseEnd) {
    const x = Math.min(eraseStart.x, eraseEnd.x);
    const y = Math.min(eraseStart.y, eraseEnd.y);
    const w = Math.abs(eraseEnd.x - eraseStart.x);
    const h = Math.abs(eraseEnd.y - eraseStart.y);

    ctx.save();
    ctx.strokeStyle = "#29364b";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = "rgba(0,0,0,0.05)";
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  if (tool === "shape" && isCreatingShape && shapePreview) {
    const cx = shapePreview.x;
    const cy = shapePreview.y;
    const r = shapePreview.r;

    ctx.beginPath();

    if (currentShapeType === "circle") {
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    } else if (currentShapeType === "triangle") {
      const R = r;
      for (let i = 0; i < 3; i++) {
        const ang = -Math.PI / 2 + i * (2 * Math.PI / 3);
        const px = cx + R * Math.cos(ang);
        const py = cy + R * Math.sin(ang);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (currentShapeType === "square") {
      const w = r;
      const h = r;
      ctx.rect(cx - w / 2, cy - h / 2, w, h);
    }

    ctx.strokeStyle = "rgba(200, 220, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(180, 200, 255, 0.15)";
    ctx.fill();
  }

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);


// =========================
// Ball envelope UI
// =========================
function refreshBallEnvelopeSlidersFromState() {
  const attackSlider = document.getElementById("ballAttack");
  const decaySlider = document.getElementById("ballDecay");
  const sustainSlider = document.getElementById("ballSustain");
  const releaseSlider = document.getElementById("ballRelease");
  const labelSpan = document.getElementById("ballEnvelopeCurrent");

  if (!attackSlider) return;

  const env = ballEnvelopeByType[currentEnvelopeType];

  attackSlider.value = env.attack;
  decaySlider.value = env.decay;
  sustainSlider.value = env.sustain;
  releaseSlider.value = env.release;

  if (labelSpan) {
    const pretty = currentEnvelopeType.replace("type", "Type ");
    labelSpan.textContent = pretty;
  }
}

function initBallEnvelopeUI() {

  ["type1", "type2", "type3"].forEach(type => {
    const prefix = `ball`;

    const attack = document.getElementById(`ballAttack_${type}`);
    const decay = document.getElementById(`ballDecay_${type}`);
    const sustain = document.getElementById(`ballSustain_${type}`);
    const release = document.getElementById(`ballRelease_${type}`);

    const env = ballEnvelopeByType[type];

    attack.value = env.attack;
    decay.value = env.decay;
    sustain.value = env.sustain;
    release.value = env.release;

    attack.addEventListener("input", (e) => {
      ballEnvelopeByType[type].attack = parseFloat(e.target.value);
    });
    decay.addEventListener("input", (e) => {
      ballEnvelopeByType[type].decay = parseFloat(e.target.value);
    });
    sustain.addEventListener("input", (e) => {
      ballEnvelopeByType[type].sustain = parseFloat(e.target.value);
    });
    release.addEventListener("input", (e) => {
      ballEnvelopeByType[type].release = parseFloat(e.target.value);
    });
  });
}


function initReverbUI() {
  const decaySlider     = document.getElementById("reverbDecay");
  const preDelaySlider  = document.getElementById("reverbPreDelay");
  const wetSlider       = document.getElementById("reverbWet");

  const decayLabel    = document.getElementById("reverbDecayValue");
  const preDelayLabel = document.getElementById("reverbPreDelayValue");
  const wetLabel      = document.getElementById("reverbWetValue");

  if (!decaySlider || !preDelaySlider || !wetSlider) return;

  decaySlider.value    = reverb.decay;
  preDelaySlider.value = reverb.preDelay;
  wetSlider.value      = reverb.wet.value;

  if (decayLabel)    decayLabel.textContent    = Number(decaySlider.value).toFixed(1);
  if (preDelayLabel) preDelayLabel.textContent = Number(preDelaySlider.value).toFixed(2);
  if (wetLabel)      wetLabel.textContent      = Number(wetSlider.value).toFixed(2);

  decaySlider.addEventListener("input", (e) => {
    const v = parseFloat(e.target.value);
    reverb.decay = v;
    if (decayLabel) decayLabel.textContent = v.toFixed(1);
  });

  preDelaySlider.addEventListener("input", (e) => {
    const v = parseFloat(e.target.value);
    reverb.preDelay = v;
    if (preDelayLabel) preDelayLabel.textContent = v.toFixed(2);
  });

  wetSlider.addEventListener("input", (e) => {
    const v = parseFloat(e.target.value);
    reverb.wet.value = v;
    if (wetLabel) wetLabel.textContent = v.toFixed(2);
  });
}

window.addEventListener("load", () => {
  initBallEnvelopeUI();
  updateBallOptionButtonColors();
  initReverbUI();
});
