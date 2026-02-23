const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const rootStyle = document.documentElement.style;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const modeToggle = document.querySelector(".mode-toggle");
const MOTION_MODE_KEY = "cv_motion_mode";

let parallaxAnimationId = null;
let cursorAnimationId = null;
let motionMode = "showcase";

if (reducedMotion) {
  motionMode = "quiet";
} else {
  const storedMode = window.localStorage.getItem(MOTION_MODE_KEY);
  motionMode = storedMode === "quiet" ? "quiet" : "showcase";
}

function applyMotionMode(nextMode, persist = true) {
  motionMode = nextMode === "quiet" ? "quiet" : "showcase";
  document.body.classList.toggle("motion-quiet", motionMode === "quiet");
  document.body.classList.toggle("motion-showcase", motionMode === "showcase");
  document.body.dataset.motionMode = motionMode;

  if (modeToggle) {
    modeToggle.classList.toggle("is-quiet", motionMode === "quiet");
    modeToggle.setAttribute("aria-pressed", String(motionMode === "quiet"));
    modeToggle.textContent = motionMode === "quiet" ? "Showcase Mode" : "Quiet Mode";
  }

  if (!reducedMotion && persist) {
    window.localStorage.setItem(MOTION_MODE_KEY, motionMode);
  }
}

applyMotionMode(motionMode, false);

if (modeToggle) {
  if (reducedMotion) {
    modeToggle.disabled = true;
    modeToggle.textContent = "Motion Off";
    modeToggle.setAttribute("aria-pressed", "true");
  } else {
    modeToggle.addEventListener("click", () => {
      const nextMode = motionMode === "showcase" ? "quiet" : "showcase";
      applyMotionMode(nextMode);
      resizeCanvas();
      verifyBackgroundAnimation();
    });
  }
}

if (finePointer) {
  const cursorDot = document.querySelector(".cursor-dot");
  const cursorRing = document.querySelector(".cursor-ring");

  if (cursorDot && cursorRing) {
    document.body.classList.add("custom-cursor");

    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let ringX = pointerX;
    let ringY = pointerY;

    const animateCursor = () => {
      ringX += (pointerX - ringX) * 0.2;
      ringY += (pointerY - ringY) * 0.2;

      cursorDot.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0) translate(-50%, -50%)`;
      cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;

      cursorAnimationId = window.requestAnimationFrame(animateCursor);
    };

    window.addEventListener(
      "pointermove",
      (event) => {
        pointerX = event.clientX;
        pointerY = event.clientY;
        document.body.classList.add("cursor-active");
      },
      { passive: true }
    );

    window.addEventListener(
      "pointerleave",
      () => {
        document.body.classList.remove("cursor-active");
      },
      { passive: true }
    );

    const interactive = document.querySelectorAll("a, button, .button, [role='button']");
    for (const node of interactive) {
      node.addEventListener("pointerenter", () => {
        document.body.classList.add("cursor-hover");
      });
      node.addEventListener("pointerleave", () => {
        document.body.classList.remove("cursor-hover");
      });
    }

    animateCursor();
  }
}

if (!reducedMotion) {
  let pointerX = 0;
  let pointerY = 0;
  let scrollShift = 0;

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  const maxPointerShift = 10;

  const recomputeTarget = () => {
    targetX = pointerX * maxPointerShift;
    targetY = pointerY * maxPointerShift + scrollShift;
  };

  const updateParallax = () => {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    rootStyle.setProperty("--parallax-x", `${currentX.toFixed(2)}px`);
    rootStyle.setProperty("--parallax-y", `${currentY.toFixed(2)}px`);
    parallaxAnimationId = window.requestAnimationFrame(updateParallax);
  };

  window.addEventListener(
    "pointermove",
    (event) => {
      pointerX = event.clientX / window.innerWidth - 0.5;
      pointerY = event.clientY / window.innerHeight - 0.5;
      recomputeTarget();
    },
    { passive: true }
  );

  window.addEventListener(
    "pointerleave",
    () => {
      pointerX = 0;
      pointerY = 0;
      recomputeTarget();
    },
    { passive: true }
  );

  window.addEventListener(
    "scroll",
    () => {
      scrollShift = Math.max(-6, Math.min(6, window.scrollY * -0.014));
      recomputeTarget();
    },
    { passive: true }
  );

  recomputeTarget();
  updateParallax();
} else {
  rootStyle.setProperty("--parallax-x", "0px");
  rootStyle.setProperty("--parallax-y", "0px");
}

function verifyBackgroundAnimation() {
  const depthBack = document.querySelector(".depth-back");
  const particleLayer = document.querySelector(".texture");

  if (!depthBack || !particleLayer) {
    console.warn("[background] Animated layers are missing.");
    return;
  }

  if (reducedMotion) {
    console.info("[background] Reduced motion enabled. Background animation intentionally disabled.");
    return;
  }

  window.requestAnimationFrame(() => {
    const nebulaAnimation = getComputedStyle(depthBack).animationName;
    const particleAnimation = getComputedStyle(particleLayer, "::after").animationName;
    const running = nebulaAnimation !== "none" && particleAnimation !== "none";
    document.documentElement.dataset.bgAnimation = running ? "running" : "stopped";
    console.info(`[background] Animation ${running ? "running" : "not running"}.`);
  });
}

verifyBackgroundAnimation();

const revealElements = [...document.querySelectorAll(".reveal")];
if (!reducedMotion) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.18 }
  );

  for (const el of revealElements) {
    observer.observe(el);
  }
} else {
  for (const el of revealElements) {
    el.classList.add("in-view");
  }
}

const tiltCards = document.querySelectorAll("[data-tilt]");
for (const card of tiltCards) {
  card.addEventListener("pointermove", (event) => {
    if (reducedMotion) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 8;
    const rotateX = (0.5 - y) * 8;
    card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  card.addEventListener("pointerleave", () => {
    card.style.transform = "";
  });
}

const canvas = document.getElementById("constellation");
const context = canvas.getContext("2d");

let particles = [];
let animationId = null;

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  const isQuiet = motionMode === "quiet";
  const count = isQuiet
    ? Math.min(36, Math.max(20, Math.floor(width / 58)))
    : Math.min(84, Math.max(44, Math.floor(width / 34)));
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * (isQuiet ? 0.02 : 0.03),
    vy: -(isQuiet ? 0.012 + Math.random() * 0.038 : 0.03 + Math.random() * 0.08),
    sway: isQuiet ? 0.008 + Math.random() * 0.018 : 0.014 + Math.random() * 0.026,
    radius: isQuiet ? Math.random() * 1.4 + 0.35 : Math.random() * 1.9 + 0.45,
    alpha: isQuiet ? 0.05 + Math.random() * 0.09 : 0.11 + Math.random() * 0.18,
    phase: Math.random() * Math.PI * 2,
  }));
}

function draw() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  context.clearRect(0, 0, width, height);

  for (let i = 0; i < particles.length; i += 1) {
    const a = particles[i];
    const isQuiet = motionMode === "quiet";
    a.x += a.vx + Math.sin(performance.now() * a.sway * 0.1 + a.phase) * (isQuiet ? 0.08 : 0.14);
    a.y += a.vy;

    if (a.y < -8) {
      a.y = height + 8;
      a.x = Math.random() * width;
    }
    if (a.x < -8) a.x = width + 8;
    if (a.x > width + 8) a.x = -8;

    context.beginPath();
    context.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
    const twinkle = Math.sin(performance.now() * (isQuiet ? 0.00022 : 0.00042) + a.phase) * (isQuiet ? 0.025 : 0.05);
    const alpha = isQuiet
      ? Math.max(0.03, Math.min(0.14, a.alpha + twinkle))
      : Math.max(0.08, Math.min(0.3, a.alpha + twinkle));
    context.fillStyle = `rgba(154, 234, 221, ${alpha})`;
    context.fill();
  }

  animationId = window.requestAnimationFrame(draw);
}

if (!reducedMotion && canvas && context) {
  resizeCanvas();
  draw();
  window.addEventListener("resize", resizeCanvas);
} else if (canvas) {
  canvas.style.display = "none";
}

window.addEventListener("beforeunload", () => {
  if (animationId) {
    window.cancelAnimationFrame(animationId);
  }
  if (parallaxAnimationId) {
    window.cancelAnimationFrame(parallaxAnimationId);
  }
  if (cursorAnimationId) {
    window.cancelAnimationFrame(cursorAnimationId);
  }
});

function rgbToHsv(r, g, b) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
  }

  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  const saturation = max === 0 ? 0 : delta / max;
  const value = max;

  return [hue, saturation, value];
}

function modernizeProfileBackground() {
  const profile = document.querySelector(".profile-photo");
  if (!profile || profile.dataset.bgModernized === "1") return;

  const applyColorSwap = () => {
    const width = profile.naturalWidth;
    const height = profile.naturalHeight;
    if (!width || !height) return;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;

    const tempContext = tempCanvas.getContext("2d");
    tempContext.drawImage(profile, 0, 0, width, height);

    const imageData = tempContext.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      const [h, s, v] = rgbToHsv(r, g, b);
      const yellowRange = h >= 46 && h <= 95 && s > 0.35 && v > 0.42;
      if (!yellowRange) continue;

      const pixelIndex = i / 4;
      const y = Math.floor(pixelIndex / width) / height;
      const x = (pixelIndex % width) / width;

      const targetR = 34 + Math.round(16 * (1 - y) + 8 * x);
      const targetG = 78 + Math.round(50 * y + 14 * x);
      const targetB = 56 + Math.round(22 * (1 - y));

      const strength = Math.min(1, ((s - 0.35) / 0.55 + (v - 0.42) / 0.58) / 2);

      pixels[i] = Math.round(r * (1 - strength) + targetR * strength);
      pixels[i + 1] = Math.round(g * (1 - strength) + targetG * strength);
      pixels[i + 2] = Math.round(b * (1 - strength) + targetB * strength);
    }

    tempContext.putImageData(imageData, 0, 0);
    profile.dataset.bgModernized = "1";
    profile.src = tempCanvas.toDataURL("image/webp", 0.95);
  };

  if (profile.complete && profile.naturalWidth) {
    applyColorSwap();
  } else {
    profile.addEventListener("load", applyColorSwap, { once: true });
  }
}

modernizeProfileBackground();
