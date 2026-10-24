import type { TvWeatherVisualState } from "./tvDisplay";

// Fixed memory and drawing budgets, including on TVs that expose a 4K viewport.
export const tvWeatherBudget = { maxWidth: 960, maxHeight: 540, framesPerSecond: 20, particles: 24 } as const;

export function weatherSurfaceSize(width: number, height: number) {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1280;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 720;
  const scale = Math.min(1, tvWeatherBudget.maxWidth / safeWidth, tvWeatherBudget.maxHeight / safeHeight);
  return { width: Math.max(1, Math.round(safeWidth * scale)), height: Math.max(1, Math.round(safeHeight * scale)) };
}

type TextAnchor = { x: number; y: number; width: number };

function sprite(width: number, height: number, paint: (context: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) paint(context);
  return canvas;
}

/** All softness and depth is rasterized once, rather than filtered every frame. */
function createSprites() {
  const cloud = sprite(280, 110, context => {
    for (const [x, y, radius] of [[65, 65, 48], [122, 46, 59], [183, 61, 52], [225, 72, 37]]) {
      const light = context.createRadialGradient(x, y - 12, 1, x, y, radius);
      light.addColorStop(0, "rgba(230,240,247,.74)");
      light.addColorStop(.52, "rgba(188,209,226,.42)");
      light.addColorStop(1, "rgba(153,180,205,0)");
      context.fillStyle = light;
      context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  });
  const snow = sprite(16, 16, context => {
    const light = context.createRadialGradient(6, 5, 1, 8, 8, 7);
    light.addColorStop(0, "#ffffff");
    light.addColorStop(.5, "#e3f2ff");
    light.addColorStop(1, "rgba(186,217,239,0)");
    context.fillStyle = light;
    context.fillRect(0, 0, 16, 16);
    context.strokeStyle = "rgba(255,255,255,.85)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(8, 3); context.lineTo(8, 13);
    context.moveTo(4, 5); context.lineTo(12, 11);
    context.moveTo(4, 11); context.lineTo(12, 5);
    context.stroke();
  });
  const drop = sprite(18, 26, context => {
    const light = context.createRadialGradient(6, 9, 1, 9, 14, 12);
    light.addColorStop(0, "rgba(245,253,255,.9)");
    light.addColorStop(.3, "rgba(181,221,246,.34)");
    light.addColorStop(.72, "rgba(65,115,151,.18)");
    light.addColorStop(1, "rgba(219,243,255,.66)");
    context.fillStyle = light;
    context.beginPath();
    context.ellipse(9, 14, 6, 10, .2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(255,255,255,.9)";
    context.beginPath(); context.ellipse(6, 9, 1.4, 3, .3, 0, Math.PI * 2); context.fill();
  });
  return { cloud, snow, drop };
}

/** Cached clouds plus one bounded precipitation surface; no audio or network. */
export function startTvWeatherScene(canvas: HTMLCanvasElement, root: HTMLElement, weather: TvWeatherVisualState, cloudCanvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return () => {};
  const sprites = createSprites();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let anchors: TextAnchor[] = [];
  let frame = 0;
  let timer = 0;
  let disposed = false;
  const started = performance.now();
  const wind = Math.sin(weather.windDirection * Math.PI / 180) * Math.min(45, weather.windSpeed);
  const wet = weather.mode === "rain" || weather.mode === "storm";
  const snowing = weather.mode === "snow";

  const resize = () => {
    const bounds = root.getBoundingClientRect();
    const size = weatherSurfaceSize(bounds.width, bounds.height);
    canvas.width = size.width;
    canvas.height = size.height;
    cloudCanvas.width = size.width;
    cloudCanvas.height = Math.round(size.height * .55);
    const cloudContext = cloudCanvas.getContext("2d");
    if (cloudContext) {
      for (let index = 0; index < 3; index++) {
        cloudContext.globalAlpha = (.08 + weather.cloudiness * .24) * (index === 1 ? .75 : 1);
        cloudContext.drawImage(sprites.cloud, size.width * (-.12 + index * .4), size.height * (.02 + index * .115), size.width * .52, size.height * .26);
      }
      if (weather.mode === "fog") {
        cloudContext.globalAlpha = .14;
        cloudContext.drawImage(sprites.cloud, -size.width * .15, size.height * .3, size.width * 1.3, size.height * .32);
      }
    }
    const scaleX = size.width / Math.max(1, bounds.width);
    const scaleY = size.height / Math.max(1, bounds.height);
    anchors = [];
    // Measure only on resize/font load or prayer change, never on animation frames.
    root.querySelectorAll<HTMLElement>("[data-weather-text]").forEach(element => {
      const node = element.firstChild;
      if (!node || node.nodeType !== Node.TEXT_NODE) return;
      const text = node.textContent ?? "";
      const style = getComputedStyle(element);
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const range = document.createRange();
      for (let index = 0; index < text.length && anchors.length < 18; index++) {
        if (/\s/.test(text[index]) || index % 2) continue;
        range.setStart(node, index); range.setEnd(node, index + 1);
        const rect = range.getBoundingClientRect();
        const glyph = context.measureText(text[index]);
        // Range rectangles include CSS zoom; font metrics are unscaled CSS pixels.
        const fontAscent = glyph.fontBoundingBoxAscent ?? parseFloat(style.fontSize) * .9;
        const fontHeight = fontAscent + (glyph.fontBoundingBoxDescent ?? parseFloat(style.fontSize) * .22);
        const capTop = rect.y + (fontAscent - glyph.actualBoundingBoxAscent) * rect.height / fontHeight;
        anchors.push({ x: (rect.x - bounds.x + rect.width * .52) * scaleX, y: (capTop - bounds.y) * scaleY, width: Math.min(10, rect.width * scaleX * .55) });
      }
    });
  };

  const paint = (timestamp: number) => {
    const width = canvas.width;
    const height = canvas.height;
    const time = reducedMotion.matches ? 6 : (timestamp - started) / 1000;
    context.clearRect(0, 0, width, height);
    if (wet || snowing) {
      for (let index = 0; index < tvWeatherBudget.particles; index++) {
        const depth = .45 + (index % 3) * .28;
        const speed = snowing ? 17 : 150;
        const progress = (time * speed * depth + index * height / tvWeatherBudget.particles) % (height + 45);
        const drift = wind * progress / height;
        const x = ((index * 137.51 + drift + (snowing ? Math.sin(time * .4 + index) * 10 : 0)) % width + width) % width;
        context.globalAlpha = (.18 + weather.intensity * .55) * depth;
        if (snowing) {
          const size = 7 * depth;
          context.drawImage(sprites.snow, x, progress - 20, size, size);
        } else {
          context.strokeStyle = "#c4e7ff";
          context.lineWidth = .8 * depth;
          context.beginPath(); context.moveTo(x, progress - 30);
          context.lineTo(x + wind * .12, progress - 30 + 16 * depth); context.stroke();
        }
      }
      // Snow caps and glass droplets sit on the actual central lettering.
      anchors.forEach((anchor, index) => {
        if (snowing) {
          context.globalAlpha = .7;
          context.fillStyle = "#a4c4dd";
          context.beginPath(); context.ellipse(anchor.x, anchor.y + 2, anchor.width * .65, 2.6, 0, 0, Math.PI * 2); context.fill();
          context.fillStyle = "#f4fbff";
          context.beginPath(); context.ellipse(anchor.x - .8, anchor.y, anchor.width * .65, 2.7, -.08, 0, Math.PI * 2); context.fill();
        } else {
          const fall = (time * .17 + index * .31) % 1;
          context.globalAlpha = Math.sin(fall * Math.PI) * .76;
          context.drawImage(sprites.drop, anchor.x, anchor.y + fall * 19, 7, 10);
        }
      });
    }
    context.globalAlpha = 1;
  };

  const cancel = () => { window.cancelAnimationFrame(frame); window.clearTimeout(timer); };
  const tick = () => {
    if (disposed || document.visibilityState === "hidden") return;
    paint(performance.now());
    if (!reducedMotion.matches && (wet || snowing)) timer = window.setTimeout(() => { frame = window.requestAnimationFrame(tick); }, 1000 / (snowing ? 16 : tvWeatherBudget.framesPerSecond));
  };
  const resume = () => {
    cancel();
    root.dataset.motion = document.visibilityState === "hidden" || reducedMotion.matches ? "paused" : "running";
    if (!disposed && document.visibilityState !== "hidden") { resize(); tick(); }
  };
  const observer = new MutationObserver(resume);
  root.querySelectorAll("[data-weather-text]").forEach(element => observer.observe(element, { childList: true, characterData: true, subtree: true }));
  window.addEventListener("resize", resume);
  document.addEventListener("visibilitychange", resume);
  reducedMotion.addEventListener("change", resume);
  document.fonts?.ready.then(() => { if (!disposed) resume(); });
  resume();
  return () => {
    disposed = true;
    cancel(); observer.disconnect();
    window.removeEventListener("resize", resume);
    document.removeEventListener("visibilitychange", resume);
    reducedMotion.removeEventListener("change", resume);
    Object.values(sprites).forEach(image => { image.width = 0; image.height = 0; });
    canvas.width = 0; canvas.height = 0;
    cloudCanvas.width = 0; cloudCanvas.height = 0;
  };
}
