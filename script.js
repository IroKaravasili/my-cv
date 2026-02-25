const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const reducedData = Boolean(window.navigator.connection && window.navigator.connection.saveData);
const limitMotion = reducedMotion || reducedData;
const rootStyle = document.documentElement.style;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const themeToggle = document.querySelector(".mode-toggle");
const pdfDownloadButton = document.querySelector("[data-download-pdf]");
const ambientVideo = document.querySelector(".hero-ambient-video");
const THEME_MODE_KEY = "cv_theme_mode";
const computedStyles = window.getComputedStyle(document.documentElement);
const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
let pdfExportRequested = false;
let themeMode = "dark";

try {
  const storedTheme = window.localStorage.getItem(THEME_MODE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    themeMode = storedTheme;
  } else {
    themeMode = prefersDarkScheme ? "dark" : "light";
  }
} catch {
  themeMode = prefersDarkScheme ? "dark" : "light";
}

function applyThemeMode(nextMode, persist = true) {
  themeMode = nextMode === "light" ? "light" : "dark";
  document.body.classList.toggle("theme-light", themeMode === "light");
  document.body.classList.toggle("theme-dark", themeMode === "dark");
  document.documentElement.style.colorScheme = themeMode;

  if (themeToggle) {
    themeToggle.classList.toggle("is-light", themeMode === "light");
    themeToggle.setAttribute("aria-pressed", String(themeMode === "light"));
    const nextModeLabel = themeMode === "light" ? "Dark Mode" : "Light Mode";
    themeToggle.textContent = nextModeLabel;
    themeToggle.setAttribute("aria-label", `Switch to ${nextModeLabel.toLowerCase()}`);
    themeToggle.title = `Switch to ${nextModeLabel.toLowerCase()}`;
  }

  if (persist) {
    try {
      window.localStorage.setItem(THEME_MODE_KEY, themeMode);
    } catch {}
  }
}

applyThemeMode(themeMode, false);

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextMode = themeMode === "dark" ? "light" : "dark";
    applyThemeMode(nextMode);
  });
}

function setPdfButtonBusyState(isBusy) {
  if (!pdfDownloadButton) return;
  pdfDownloadButton.setAttribute("aria-busy", String(isBusy));
  pdfDownloadButton.disabled = isBusy;
}

function cleanupPdfExportState() {
  if (!pdfExportRequested) return;
  document.body.classList.remove("pdf-exporting");
  setPdfButtonBusyState(false);
  pdfExportRequested = false;
}

if (pdfDownloadButton) {
  pdfDownloadButton.addEventListener("click", () => {
    if (typeof window.print !== "function") {
      window.location.href = "cv.pdf";
      return;
    }

    pdfExportRequested = true;
    setPdfButtonBusyState(true);
    document.body.classList.add("pdf-exporting");
    window.print();
  });

  window.addEventListener("afterprint", cleanupPdfExportState);

  const printMedia = window.matchMedia("print");
  const onPrintMediaChange = (event) => {
    if (!event.matches) {
      cleanupPdfExportState();
    }
  };

  if (typeof printMedia.addEventListener === "function") {
    printMedia.addEventListener("change", onPrintMediaChange);
  } else if (typeof printMedia.addListener === "function") {
    printMedia.addListener(onPrintMediaChange);
  }
}

if (ambientVideo) {
  if (limitMotion) {
    ambientVideo.removeAttribute("autoplay");
    ambientVideo.pause();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      ambientVideo.pause();
      return;
    }
    if (!limitMotion) {
      ambientVideo.play().catch(() => {});
    }
  });
}

function parseRgbVar(variableName, fallback) {
  const rawValue = computedStyles.getPropertyValue(variableName).trim();
  if (!rawValue) return fallback;
  const channels = rawValue.split(",").map((value) => Number.parseInt(value.trim(), 10));
  if (channels.length !== 3 || channels.some((channel) => Number.isNaN(channel))) {
    return fallback;
  }
  return channels;
}

const accentRgb = parseRgbVar("--accent-rgb", [232, 168, 106]);
const accentPlumRgb = parseRgbVar("--accent-plum-rgb", [139, 111, 191]);
const mintRgb = [154, 234, 221];

let parallaxAnimationId = null;
let cursorAnimationId = null;
let motionMode = limitMotion ? "quiet" : "showcase";

function applyMotionMode(nextMode) {
  motionMode = nextMode === "quiet" ? "quiet" : "showcase";
  document.body.classList.toggle("motion-quiet", motionMode === "quiet");
  document.body.classList.toggle("motion-showcase", motionMode === "showcase");
  document.body.dataset.motionMode = motionMode;
}

applyMotionMode(motionMode);

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

    if (!document.hidden) {
      animateCursor();
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && cursorAnimationId) {
        window.cancelAnimationFrame(cursorAnimationId);
        cursorAnimationId = null;
        return;
      }
      if (!document.hidden && !cursorAnimationId) {
        animateCursor();
      }
    });
  }
}

if (!limitMotion) {
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

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && parallaxAnimationId) {
      window.cancelAnimationFrame(parallaxAnimationId);
      parallaxAnimationId = null;
      return;
    }
    if (!document.hidden && !parallaxAnimationId) {
      updateParallax();
    }
  });
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

  if (limitMotion) {
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
if (!limitMotion) {
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
    if (limitMotion) return;
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
const context = canvas ? canvas.getContext("2d") : null;

let starParticles = [];
let cometParticles = [];
let animationId = null;

function createStar(width, height, isQuiet) {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * (isQuiet ? 0.02 : 0.045),
    vy: -(isQuiet ? 0.012 + Math.random() * 0.03 : 0.03 + Math.random() * 0.085),
    sway: isQuiet ? 0.006 + Math.random() * 0.015 : 0.012 + Math.random() * 0.03,
    radius: isQuiet ? Math.random() * 1.25 + 0.35 : Math.random() * 2 + 0.4,
    alpha: isQuiet ? 0.05 + Math.random() * 0.08 : 0.09 + Math.random() * 0.21,
    phase: Math.random() * Math.PI * 2,
    tone: Math.random(),
  };
}

function spawnComet(width, height) {
  const fromTop = Math.random() > 0.3;
  if (fromTop) {
    return {
      x: Math.random() * width,
      y: -80 - Math.random() * 120,
      vx: (Math.random() - 0.5) * 0.18,
      vy: 0.3 + Math.random() * 0.5,
      radius: 1.2 + Math.random() * 1.8,
      alpha: 0.35 + Math.random() * 0.22,
      trail: 58 + Math.random() * 62,
    };
  }

  const fromLeft = Math.random() > 0.5;
  return {
    x: fromLeft ? -80 - Math.random() * 120 : width + 80 + Math.random() * 120,
    y: Math.random() * (height * 0.72),
    vx: fromLeft ? 0.25 + Math.random() * 0.35 : -(0.25 + Math.random() * 0.35),
    vy: 0.14 + Math.random() * 0.28,
    radius: 1.2 + Math.random() * 1.8,
    alpha: 0.35 + Math.random() * 0.22,
    trail: 58 + Math.random() * 62,
  };
}

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
  const starCount = isQuiet
    ? Math.min(46, Math.max(24, Math.floor(width / 54)))
    : Math.min(170, Math.max(76, Math.floor(width / 12)));
  const cometCount = isQuiet ? 0 : width > 1100 ? 3 : width > 760 ? 2 : 1;

  starParticles = Array.from({ length: starCount }, () => createStar(width, height, isQuiet));
  cometParticles = Array.from({ length: cometCount }, () => spawnComet(width, height));
}

function draw() {
  if (!canvas || !context) return;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const now = performance.now();
  const isQuiet = motionMode === "quiet";

  context.clearRect(0, 0, width, height);

  for (let i = 0; i < starParticles.length; i += 1) {
    const star = starParticles[i];
    star.x += star.vx + Math.sin(now * star.sway * 0.1 + star.phase) * (isQuiet ? 0.07 : 0.18);
    star.y += star.vy;

    if (star.y < -8) {
      star.y = height + 8;
      star.x = Math.random() * width;
    }
    if (star.x < -8) star.x = width + 8;
    if (star.x > width + 8) star.x = -8;

    const twinkle = Math.sin(now * (isQuiet ? 0.00022 : 0.00058) + star.phase) * (isQuiet ? 0.022 : 0.08);
    const alpha = isQuiet
      ? Math.max(0.02, Math.min(0.12, star.alpha + twinkle))
      : Math.max(0.06, Math.min(0.34, star.alpha + twinkle));

    const r = Math.round(mintRgb[0] * (1 - star.tone) + accentRgb[0] * star.tone);
    const g = Math.round(mintRgb[1] * (1 - star.tone) + accentPlumRgb[1] * star.tone);
    const b = Math.round(mintRgb[2] * (1 - star.tone) + accentPlumRgb[2] * star.tone);

    context.beginPath();
    context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    context.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    context.fill();
  }

  if (!isQuiet) {
    const networkLimit = Math.min(starParticles.length, 92);
    for (let i = 0; i < networkLimit; i += 1) {
      const a = starParticles[i];
      for (let j = i + 1; j < networkLimit; j += 1) {
        const b = starParticles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq > 148 * 148) continue;

        const distance = Math.sqrt(distanceSq);
        const linkAlpha = (1 - distance / 148) * 0.11;

        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.strokeStyle = `rgba(${mintRgb[0]}, ${mintRgb[1]}, ${mintRgb[2]}, ${linkAlpha.toFixed(3)})`;
        context.lineWidth = 0.75;
        context.stroke();
      }
    }
  }

  for (let i = 0; i < cometParticles.length; i += 1) {
    const comet = cometParticles[i];
    comet.x += comet.vx;
    comet.y += comet.vy;

    if (comet.y > height + 120 || comet.x < -140 || comet.x > width + 140) {
      cometParticles[i] = spawnComet(width, height);
      continue;
    }

    const tailX = comet.x - comet.vx * comet.trail;
    const tailY = comet.y - comet.vy * comet.trail;

    const trail = context.createLinearGradient(comet.x, comet.y, tailX, tailY);
    trail.addColorStop(0, `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${comet.alpha})`);
    trail.addColorStop(1, "rgba(255, 255, 255, 0)");

    context.beginPath();
    context.moveTo(comet.x, comet.y);
    context.lineTo(tailX, tailY);
    context.strokeStyle = trail;
    context.lineWidth = comet.radius * 1.6;
    context.lineCap = "round";
    context.stroke();

    context.beginPath();
    context.arc(comet.x, comet.y, comet.radius, 0, Math.PI * 2);
    context.fillStyle = `rgba(255, 248, 236, ${Math.min(0.92, comet.alpha + 0.25)})`;
    context.fill();
  }

  if (!isQuiet) {
    const pulse = 0.06 + (Math.sin(now * 0.0012) + 1) * 0.04;
    context.save();
    context.globalCompositeOperation = "screen";
    const aura = context.createRadialGradient(
      width * 0.62,
      height * 0.18,
      0,
      width * 0.62,
      height * 0.18,
      Math.max(width, height) * 0.58
    );
    aura.addColorStop(0, `rgba(${accentPlumRgb[0]}, ${accentPlumRgb[1]}, ${accentPlumRgb[2]}, ${pulse.toFixed(3)})`);
    aura.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = aura;
    context.fillRect(0, 0, width, height);
    context.restore();
  }

  animationId = window.requestAnimationFrame(draw);
}

function stopCanvasAnimation() {
  if (animationId) {
    window.cancelAnimationFrame(animationId);
    animationId = null;
  }
}

if (!limitMotion && canvas && context) {
  resizeCanvas();
  draw();
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopCanvasAnimation();
      return;
    }
    if (!animationId) {
      draw();
    }
  });
} else if (canvas) {
  canvas.style.display = "none";
}

window.addEventListener("beforeunload", () => {
  stopCanvasAnimation();
  if (parallaxAnimationId) {
    window.cancelAnimationFrame(parallaxAnimationId);
  }
  if (cursorAnimationId) {
    window.cancelAnimationFrame(cursorAnimationId);
  }
});
