// ==============================================
// SPINNER-MITOSIS7.JS
// Scaled Coordinates & Bottom-Locked Aspect Ratio
// ==============================================

let canvas;
let ctx;

let lastTime = 0;
let screenCenterX = 400;
let screenCenterY = 300;

// Baseline reference width used to scale particle graphics & physics
const DESIGN_WIDTH = 800;
let scale = 1.0;

// Layer Images
const bgImg = new Image();
bgImg.src = "cannonLeft.png";

const fgImg = new Image();
fgImg.src = "cannonRight.png";

const roygbivSpectrum = [
  0, 30, 60, 120, 240, 275, 300
];
let currentSpectrumIndex = 0;

let activeSpinners = [];
let activeRockets = [];

let launchCounter = 0;
let globalSpawnTimer = 0;
const LAUNCH_INTERVAL = 1.0;

// ==============================================
// GRAPHICS & PARTICLES
// ==============================================

window.drawSpinnerGraphic = function(
  x,
  y,
  radius,
  alpha,
  rotation,
  hue,
  skipRotation = false
) {
  if (alpha <= 0 || radius <= 0.1) return;

  const safeHue = Number.isFinite(hue) ? hue : 0;

  ctx.save();
  ctx.translate(x, y);
  if (!skipRotation) {
    ctx.rotate(rotation);
  }
  ctx.globalAlpha = Math.min(1.0, Math.max(0, alpha));

  const points = 5;
  const innerRadius = radius * 0.4;

  ctx.fillStyle = `hsl(${safeHue}, 100%, 65%)`;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = (i % 2 === 0) ? radius : innerRadius;
    const angle = (i * Math.PI) / points;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.restore();
};

function spawnArcBurstCluster(x, y, baseRadius, count = 3) {
  if (baseRadius <= 0.5) return;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    // Scale speed and gravity relative to canvas size
    const speed = (60 + Math.random() * 120) * scale;
    
    const randomHueIndex = Math.floor(
      Math.random() * roygbivSpectrum.length
    );
    const randomHue = roygbivSpectrum[randomHueIndex];

    activeSpinners.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity: 150 * scale,
      radius: Math.max(3 * scale, baseRadius * 0.3),
      alpha: 1.0,
      rotation: Math.random() * Math.PI,
      spinSpeed: (Math.random() - 0.5) * 8,
      hue: randomHue,
      life: 1.0,
      decay: 0.6 + Math.random() * 0.5
    });
  }
}

// ==============================================
// ROCKET SYSTEM
// ==============================================

function spawnRocket() {
  const mode = launchCounter % 3;
  launchCounter++;

  let directionMultiplier = 0;
  if (mode === 0) directionMultiplier = -1;
  else if (mode === 1) directionMultiplier = 0;
  else if (mode === 2) directionMultiplier = 1;

  const hue = roygbivSpectrum[currentSpectrumIndex];
  
  currentSpectrumIndex =
    (currentSpectrumIndex + 1) % roygbivSpectrum.length;

  activeRockets.push({
    stage: 0, 
    x: screenCenterX,
    y: canvas.height,
    vx: (180 + Math.random() * 40) * directionMultiplier * scale,
    vy: (mode === 1 ? -460 : -400) * scale,
    gravity: 350 * scale,
    radius: 14 * scale,
    rotation: 0,
    hue: hue,
    timeline: 0
  });
}

function updateRockets(deltaTime) {
  for (let i = activeRockets.length - 1; i >= 0; i--) {
    const r = activeRockets[i];

    // STAGE 0: Vertical Rocket Rise
    if (r.stage === 0) {
      r.y -= (480 * scale) * deltaTime;

      window.drawSpinnerGraphic(
        screenCenterX,
        r.y,
        10 * scale,
        1.0,
        0,
        r.hue,
        true
      );

      if (r.y <= screenCenterY) {
        r.stage = 1;
        r.x = screenCenterX;
        r.y = screenCenterY;
      }
    } 
    // STAGE 1: Parabolic Flight
    else if (r.stage === 1) {
      r.timeline += deltaTime * 0.75;
      r.vy += r.gravity * deltaTime;
      r.x += r.vx * deltaTime;
      r.y += r.vy * deltaTime;
      r.rotation += 4.0 * deltaTime;

      const maxRadius = 32 * scale;
      if (r.vy < 0) {
        if (r.radius < maxRadius) {
          r.radius += deltaTime * 20 * scale;
        }
      } else {
        r.radius = Math.max(
          0, 
          r.radius - deltaTime * 35 * scale
        );
      }

      if (r.radius > 0.5) {
        spawnArcBurstCluster(r.x, r.y, r.radius, 3);

        window.drawSpinnerGraphic(
          r.x,
          r.y,
          r.radius,
          1.0,
          r.rotation,
          r.hue,
          false
        );
      }

      // Extended boundary checks relative to scaled size
      if (
        r.timeline >= 3.0 ||
        (r.vy > 0 && r.radius <= 0) ||
        r.y < -300 * scale || 
        r.x < -200 * scale ||
        r.x > canvas.width + (200 * scale)
      ) {
        activeRockets.splice(i, 1);
      }
    }
  }
}

function updateDebris(deltaTime) {
  for (let i = activeSpinners.length - 1; i >= 0; i--) {
    const p = activeSpinners[i];
    p.vy += p.gravity * deltaTime;
    p.x += p.vx * deltaTime;
    p.y += p.vy * deltaTime;
    p.rotation += p.spinSpeed * deltaTime;
    p.life -= p.decay * deltaTime;
    p.alpha = Math.max(0, p.life);

    if (p.life <= 0) {
      activeSpinners.splice(i, 1);
      continue;
    }

    window.drawSpinnerGraphic(
      p.x,
      p.y,
      p.radius,
      p.alpha,
      p.rotation,
      p.hue,
      false
    );
  }
}

// ==============================================
// RENDER LOOP & IMAGE LOCKING
// ==============================================

function drawLockedImage(img) {
  if (!img.complete || img.naturalWidth === 0) return;
  
  // Calculate scaled height to keep full picture locked to the bottom
  const imgAspectRatio = img.naturalHeight / img.naturalWidth;
  const drawWidth = canvas.width;
  const drawHeight = drawWidth * imgAspectRatio;
  
  // Draw aligned to the bottom (canvas.height - drawHeight)
  ctx.drawImage(
    img, 
    0, 
    canvas.height - drawHeight, 
    drawWidth, 
    drawHeight
  );
}

function renderLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. BACKGROUND LAYER (Locked to Bottom)
  if (bgImg.complete && bgImg.naturalWidth > 0) {
    drawLockedImage(bgImg);
  } else {
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // SPAWN TIMER
  globalSpawnTimer += deltaTime;
  if (globalSpawnTimer >= LAUNCH_INTERVAL) {
    globalSpawnTimer = 0;
    spawnRocket();
  }

  // 2. MIDDLE LAYER: ANIMATION
  updateRockets(deltaTime);
  updateDebris(deltaTime);

  // 3. FOREGROUND LAYER (Locked to Bottom)
  drawLockedImage(fgImg);

  requestAnimationFrame(renderLoop);
}

// ==============================================
// INITIALIZATION & DYNAMIC RESPONSIVE SIZING
// ==============================================

function resizeCanvasToImage() {
  if (!canvas) return;

  // Determine width based on parent container or viewport
  const parentWidth = canvas.parentElement 
    ? canvas.parentElement.clientWidth 
    : window.innerWidth;

  // Set canvas render resolution
  canvas.width = Math.min(parentWidth, window.innerWidth);

  // Calculate dynamic scaling ratio relative to base design width
  scale = canvas.width / DESIGN_WIDTH;

  // Lock canvas height to background image aspect ratio
  if (bgImg.complete && bgImg.naturalWidth > 0) {
    const aspectRatio = bgImg.naturalHeight / bgImg.naturalWidth;
    canvas.height = canvas.width * aspectRatio;
  } else {
    canvas.height = canvas.width * 0.75; // Standard 4:3 fallback
  }

  screenCenterX = canvas.width / 2;
  screenCenterY = canvas.height / 2;
}

function init() {
  canvas = document.getElementById("canvas");
  if (!canvas) {
    console.error("Canvas element #canvas not found!");
    return;
  }
  ctx = canvas.getContext("2d");

  // CSS setup to prevent clipped overflow and ensure clean response
  canvas.style.overflow = "visible";
  canvas.style.display = "block";
  canvas.style.margin = "0 auto";

  window.addEventListener("resize", resizeCanvasToImage);

  if (bgImg.complete) {
    resizeCanvasToImage();
  } else {
    bgImg.onload = resizeCanvasToImage;
  }

  spawnRocket();
  requestAnimationFrame(renderLoop);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
