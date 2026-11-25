/**
 * The Storm Hawk leap, in three.js. Loaded only when it plays (see hawkLeap.ts).
 *
 * 2.5D: the card's own painting, on a dense plane pushed out by a depth map
 * (the chest bulges, the wingtips stay flat), so in 3D it still looks exactly
 * like the card art. It starts pixel-aligned with the painted hawk on the card,
 * flaps and leaps toward the viewer, dives back in and lands.
 *
 * A fixed, full-window canvas that exists only while it plays: aria-hidden,
 * ignores the pointer, and the card underneath stays the real content.
 */
import * as THREE from "three";

const COLOR_SRC = "/art/storm-hawk-leap.webp";
const DEPTH_SRC = "/art/storm-hawk-depth.webp";
/** The painting's size (the card shows it with object-fit: contain). */
const IMG_W = 1280;
const IMG_H = 1024;
/** Where the hawk's body is in the painting (uv, from the depth map's peak): the wings bend around it. */
const BODY_UV = [0.562, 0.581] as const;

/** Timeline, in seconds. Short on purpose: one leap, then the page is still. */
const T = { crouch: 0.3, leap: 1.05, hover: 1.35, land: 2.05, end: 2.45 };

const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
const easeInCubic = (x: number) => x ** 3;
const easeInOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);

const HAWK_VERT = /* glsl */ `
  uniform sampler2D uDepth;
  uniform float uAmount;
  uniform float uRelief; // 0 = flat like the card's painting, 1 = full bulge
  uniform float uFlap;   // 0..1: how much the wings flap
  uniform float uTime;
  uniform vec2 uBody;
  uniform vec2 uAspect;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    float d = texture2D(uDepth, uv).r;
    p.z += d * uAmount * uRelief;
    // Wings: the further from the body (and the flatter), the more they bend in and out of the screen.
    float reach = smoothstep(0.1, 0.55, distance(uv * uAspect, uBody * uAspect));
    float wing = reach * (1.0 - d * 0.7);
    float beat = sin(uTime * 17.0);
    p.z += beat * uFlap * wing * uAmount * 0.9;
    p.y += beat * uFlap * wing * uAmount * 0.18;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

/** Shared by the hawk and its shadow: drop fragments outside the card's art window while it sits in the card. */
const CLIP = /* glsl */ `
  uniform float uClip;
  uniform vec4 uClipRect; // x0, y0, x1, y1 in drawing-buffer pixels (origin bottom left)
  bool clipped() {
    return uClip > 0.5 && (gl_FragCoord.x < uClipRect.x || gl_FragCoord.x > uClipRect.z ||
                           gl_FragCoord.y < uClipRect.y || gl_FragCoord.y > uClipRect.w);
  }
`;

const HAWK_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uDepth;
  uniform vec2 uTexel;
  uniform float uRelief;
  ${CLIP}
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(uMap, vUv);
    if (c.a < 0.02 || clipped()) discard;
    // Light the bulge a little, from the upper left, like the card's light.
    float dx = texture2D(uDepth, vUv + vec2(uTexel.x, 0.0)).r - texture2D(uDepth, vUv - vec2(uTexel.x, 0.0)).r;
    float dy = texture2D(uDepth, vUv + vec2(0.0, uTexel.y)).r - texture2D(uDepth, vUv - vec2(0.0, uTexel.y)).r;
    vec3 n = normalize(vec3(-dx * 5.0, -dy * 5.0, 1.0));
    float shade = mix(1.0, 0.92 + 0.14 * dot(n, normalize(vec3(-0.45, 0.6, 0.66))), uRelief);
    gl_FragColor = vec4(c.rgb * shade, c.a);
    #include <colorspace_fragment>
  }
`;

/** The shadow quad is bigger than the painting, so the blur never reaches its edge. */
const SHADOW_PAD = 1.5;

const SHADOW_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SHADOW_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uBlur;
  uniform float uPad;
  ${CLIP}
  varying vec2 vUv;
  void main() {
    if (clipped()) discard;
    vec2 uv = (vUv - 0.5) * uPad + 0.5; // the painting sits in the middle of the padded quad
    float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
    // A blurry copy of the silhouette, in the card's ink color (#0d1530).
    float a = texture2D(uMap, clamp(uv, 0.0, 1.0), uBlur).a * inside;
    a = smoothstep(0.08, 0.7, a);
    // Feather the quad's own edges to nothing.
    vec2 e = smoothstep(0.0, 0.12, vUv) * smoothstep(0.0, 0.12, 1.0 - vUv);
    gl_FragColor = vec4(0.05, 0.08, 0.19, a * e.x * e.y * uOpacity);
  }
`;

const SPARK_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  uniform float uScale;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / -mv.z;
    vAlpha = aAlpha;
    vColor = aColor;
    gl_Position = projectionMatrix * mv;
  }
`;

const SPARK_FRAG = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    gl_FragColor = vec4(vColor, vAlpha * smoothstep(0.5, 0.15, r));
  }
`;

type Leap = { stop: () => void; done: Promise<void> };

/**
 * Start the leap from this painted hawk (the card's `img.art-fg`). Resolves once
 * the first frame is drawn; `done` resolves when it ends or is stopped. Throws if
 * WebGL or the textures fail, leaving the card untouched.
 */
export async function runLeap(img: HTMLImageElement): Promise<Leap> {
  const loader = new THREE.TextureLoader();
  const [map, depth] = await Promise.all([loader.loadAsync(COLOR_SRC), loader.loadAsync(DEPTH_SRC)]);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, failIfMajorPerformanceCaveat: true });
  } catch (e) {
    map.dispose();
    depth.dispose();
    throw e;
  }

  // ---- Where the painted hawk is right now (measured after loading, so it's current). ----
  const W = document.documentElement.clientWidth;
  const H = window.innerHeight;
  const box = img.getBoundingClientRect();
  const fit = Math.min(box.width / IMG_W, box.height / IMG_H);
  const hw = IMG_W * fit;
  const hh = IMG_H * fit;
  // World units are CSS pixels, origin at the window's center, y up.
  const restX = box.left + box.width / 2 - W / 2;
  const restY = H / 2 - (box.top + box.height / 2);
  // The card clips its hawk to the art window (spilling a little past the right edge): see .art-breakout.
  const breakout = img.closest<HTMLElement>(".art-breakout") ?? img;
  const win = breakout.getBoundingClientRect();
  const clip = { left: win.left, right: win.right + win.width * 0.14, top: win.top - win.height * 0.02, bottom: win.bottom };
  // The hawk and its sparks stay inside the welcome panel (never over the header).
  const panel = (img.closest("section") ?? document.body).getBoundingClientRect();
  const bounds = { left: panel.left - W / 2, right: panel.right - W / 2, top: H / 2 - panel.top, bottom: H / 2 - panel.bottom };
  const card = img.closest<HTMLElement>(".card");

  // ---- Renderer and camera: 1 world unit = 1 CSS pixel on the card's plane. ----
  Object.assign(canvas.style, { position: "fixed", left: "0", top: "0", width: `${W}px`, height: `${H}px`, pointerEvents: "none", zIndex: "60" });
  const pr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pr);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);

  const FOV = 30;
  const camZ = H / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const camera = new THREE.PerspectiveCamera(FOV, W / H, 1, camZ * 4);
  camera.position.z = camZ;

  const scene = new THREE.Scene();
  const root = new THREE.Group(); // follows the page if it scrolls mid-leap
  scene.add(root);

  // Scrolling down by s moves the card up on screen, i.e. up in gl_FragCoord (origin bottom left).
  const clipRect = new THREE.Vector4();
  const setClipRect = (scrolled: number) =>
    clipRect.set(clip.left * pr, (H - clip.bottom + scrolled) * pr, clip.right * pr, (H - clip.top + scrolled) * pr);
  setClipRect(0);

  // ---- The hawk: its painting on a plane pushed out by the depth map. ----
  const hawkGeo = new THREE.PlaneGeometry(hw, hh, 160, 128);
  const hawkMat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uDepth: { value: depth },
      uAmount: { value: hh * 0.24 },
      uRelief: { value: 0 },
      uFlap: { value: 0 },
      uTime: { value: 0 },
      uBody: { value: new THREE.Vector2(...BODY_UV) },
      uAspect: { value: new THREE.Vector2(IMG_W / IMG_H, 1) },
      uTexel: { value: new THREE.Vector2(1 / 256, 1 / 205) },
      uClip: { value: 1 },
      uClipRect: { value: clipRect },
    },
    vertexShader: HAWK_VERT,
    fragmentShader: HAWK_FRAG,
    transparent: true,
    depthWrite: false,
  });
  const hawk = new THREE.Mesh(hawkGeo, hawkMat);
  hawk.renderOrder = 2;
  root.add(hawk);

  // ---- Its shadow on the card: matches the card's CSS drop-shadow at rest, then softens as the hawk lifts. ----
  const shadowGeo = new THREE.PlaneGeometry(hw * SHADOW_PAD, hh * SHADOW_PAD);
  const shadowMat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uOpacity: { value: 0.55 },
      uBlur: { value: 4 },
      uPad: { value: SHADOW_PAD },
      uClip: { value: 1 },
      uClipRect: { value: clipRect },
    },
    vertexShader: SHADOW_VERT,
    fragmentShader: SHADOW_FRAG,
    transparent: true,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.renderOrder = 1;
  root.add(shadow);

  // ---- Sparks: a few gold flecks (two golds, so they read on white paper and on blue). ----
  const N = 60;
  const pos = new Float32Array(N * 3);
  const vel = new Float32Array(N * 3);
  const born = new Float32Array(N).fill(-1);
  const life = new Float32Array(N);
  const size = new Float32Array(N);
  const alpha = new Float32Array(N);
  const color = new Float32Array(N * 3);
  const palette = [new THREE.Color("#f6cf6a"), new THREE.Color("#e0a83a")];
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  sparkGeo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  sparkGeo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
  sparkGeo.setAttribute("aColor", new THREE.BufferAttribute(color, 3));
  const sparkMat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: camZ * pr } },
    vertexShader: SPARK_VERT,
    fragmentShader: SPARK_FRAG,
    transparent: true,
    depthWrite: false,
  });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  sparks.renderOrder = 3;
  root.add(sparks);

  let nextSpark = 0;
  function burst(count: number, t: number, cx: number, cy: number, spreadX: number, spreadY: number, speed: number) {
    for (let k = 0; k < count; k++) {
      const i = nextSpark++ % N;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random());
      pos[i * 3] = cx + Math.cos(a) * r * spreadX;
      pos[i * 3 + 1] = cy + Math.sin(a) * r * spreadY;
      pos[i * 3 + 2] = 0;
      const s = speed * (0.45 + Math.random() * 0.75);
      vel[i * 3] = Math.cos(a) * s;
      vel[i * 3 + 1] = Math.sin(a) * s + speed * 0.35;
      vel[i * 3 + 2] = speed * (0.15 + Math.random() * 0.4);
      born[i] = t;
      life[i] = 0.55 + Math.random() * 0.5;
      size[i] = 4.5 + Math.random() * 3.5;
      palette[i % palette.length].toArray(color, i * 3);
    }
    sparkGeo.attributes.aSize.needsUpdate = true;
    sparkGeo.attributes.aColor.needsUpdate = true;
  }

  // ---- The arc: how big and where the hawk peaks, kept inside the panel with a margin. ----
  const M = 24;
  const maxScale = Math.max(1, Math.min(1.5, (bounds.right - bounds.left - 2 * M) / hw, (bounds.top - bounds.bottom - 2 * M) / hh));
  const peakZ = camZ * (1 - 1 / maxScale);
  const halfW = (hw * maxScale) / 2;
  const halfH = (hh * maxScale) / 2;
  // On screen: drift toward the middle of the window and up a little, then convert back to the hawk's depth.
  const screenX = clamp(lerp(restX, 0, 0.45), bounds.left + M + halfW, bounds.right - M - halfW);
  const screenY = clamp(restY + Math.min(H * 0.08, 80), bounds.bottom + M + halfH, bounds.top - M - halfH);
  const peakX = screenX / maxScale;
  const peakY = screenY / maxScale;

  /** Pose at time t (seconds). */
  function pose(t: number) {
    let x = restX, y = restY, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1;
    if (t < T.crouch) {
      // Crouch: sink back and squash a little.
      const u = easeInOut(span(t, 0, T.crouch));
      z = -18 * u;
      sx = 1 + 0.03 * u;
      sy = 1 - 0.05 * u;
      rx = 0.08 * u;
    } else if (t < T.leap) {
      // Leap toward the viewer, turning a little to show its depth.
      const u = easeOutCubic(span(t, T.crouch, T.leap));
      x = lerp(restX, peakX, u);
      y = lerp(restY, peakY, u);
      z = lerp(-18, peakZ, u);
      ry = lerp(0, -0.3, u);
      rz = lerp(0, 0.1, u);
      rx = lerp(0.08, -0.08, u);
      const stretch = Math.sin(Math.PI * u);
      sx = 1 - 0.04 * stretch;
      sy = 1 + 0.07 * stretch;
    } else if (t < T.hover) {
      // A short hang: lift a few pixels and settle while turning the other way.
      const u = easeInOut(span(t, T.leap, T.hover));
      x = peakX;
      y = peakY + Math.sin(u * Math.PI) * 4;
      z = peakZ;
      ry = lerp(-0.3, 0.2, u);
      rz = lerp(0.1, -0.04, u);
      rx = -0.08;
    } else if (t < T.land) {
      // Dive back into the card.
      const u = easeInCubic(span(t, T.hover, T.land));
      x = lerp(peakX, restX, u);
      y = lerp(peakY, restY, u);
      z = lerp(peakZ, 0, u);
      ry = lerp(0.2, 0, u);
      rz = lerp(-0.04, 0, u);
      rx = lerp(-0.08, 0, u);
    } else {
      // Land: a small squash that settles.
      const u = span(t, T.land, T.end);
      const bump = Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u);
      sx = 1 + 0.05 * bump;
      sy = 1 - 0.07 * bump;
    }
    return { x, y, z, rx, ry, rz, sx, sy };
  }

  const scrollY0 = window.scrollY;
  const width0 = W;
  let raf = 0;
  let stopped = false;
  let hidDom = false;
  let burst1 = false;
  let burst2 = false;
  let lastT = 0;
  let resolveDone!: () => void;
  const done = new Promise<void>((r) => (resolveDone = r));
  let resolveStarted!: () => void;
  const started = new Promise<void>((r) => (resolveStarted = r));
  const t0 = performance.now();

  function draw(t: number) {
    const scrolled = window.scrollY - scrollY0;
    root.position.y = scrolled;
    setClipRect(scrolled);

    const p = pose(t);
    hawk.position.set(p.x, p.y, p.z);
    hawk.rotation.set(p.rx, p.ry, p.rz);
    hawk.scale.set(p.sx, p.sy, 1);
    hawkMat.uniforms.uTime.value = t;
    // The bulge grows in as it crouches and flattens as it lands, so it swaps with the flat card art invisibly.
    hawkMat.uniforms.uRelief.value = t < T.land ? easeInOut(span(t, 0, T.crouch + 0.25)) : 1 - easeInOut(span(t, T.land, T.end - 0.05));
    // Wings flap from takeoff until just before it lands.
    hawkMat.uniforms.uFlap.value = Math.min(span(t, T.crouch, T.crouch + 0.15), 1 - span(t, T.land - 0.2, T.land));
    // Clipped to the art window only while it sits in the card.
    const inCard = t < T.crouch + 0.02 || t >= T.land;
    hawkMat.uniforms.uClip.value = inCard ? 1 : 0;
    shadowMat.uniforms.uClip.value = inCard ? 1 : 0;

    // The shadow stays on and around the card, slipping down-right and softening as the hawk lifts.
    const lift = clamp(p.z / peakZ, 0, 1);
    const sh = 1 + lift * 0.3;
    shadow.position.set(lerp(restX, p.x, 0.25) + lift * 12, restY - 6 - lift * 18, -1);
    shadow.scale.set(sh, sh, 1);
    shadowMat.uniforms.uOpacity.value = lerp(0.55, 0.15, lift);
    shadowMat.uniforms.uBlur.value = lerp(4, 5.5, lift);

    if (!burst1 && t >= T.crouch) {
      burst1 = true;
      burst(30, t, restX, restY, hw * 0.4, hh * 0.36, 380);
    }
    if (!burst2 && t >= T.land) {
      burst2 = true;
      burst(20, t, restX, restY - hh * 0.2, hw * 0.32, hh * 0.1, 240);
      // A tiny bump to the card itself, as the hawk lands back in it.
      card?.animate([{ translate: "0 0" }, { translate: "0 4px" }, { translate: "0 0" }], { duration: 280, easing: "ease-out" });
    }
    const dt = Math.min(Math.max(t - lastT, 0), 0.05); // real time, so slow phones don't slow the sparks
    lastT = t;
    for (let i = 0; i < N; i++) {
      if (born[i] < 0) continue;
      const age = (t - born[i]) / life[i];
      vel[i * 3 + 1] -= 520 * dt; // gravity
      const x = (pos[i * 3] += vel[i * 3] * dt);
      const y = (pos[i * 3 + 1] += vel[i * 3 + 1] * dt);
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      // Gone when it burns out or leaves the panel.
      if (age >= 1 || x < bounds.left || x > bounds.right || y > bounds.top || y < bounds.bottom) {
        born[i] = -1;
        alpha[i] = 0;
        continue;
      }
      alpha[i] = (1 - age) ** 1.5;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    sparkGeo.attributes.aAlpha.needsUpdate = true;

    renderer.render(scene, camera);
  }

  function frame(now: number) {
    if (stopped) return;
    const t = (now - t0) / 1000;
    if (t >= T.end) return stop();
    try {
      draw(t);
    } catch {
      return stop(); // never leave the card's art hidden
    }
    if (!hidDom) {
      // The first frame matches the card exactly, so swap the painted hawk out now.
      hidDom = true;
      breakout.style.visibility = "hidden";
      resolveStarted();
    }
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    breakout.style.visibility = "";
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onHidden);
    canvas.removeEventListener("webglcontextlost", onLost);
    hawkGeo.dispose();
    hawkMat.dispose();
    shadowGeo.dispose();
    shadowMat.dispose();
    sparkGeo.dispose();
    sparkMat.dispose();
    map.dispose();
    depth.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    resolveStarted();
    resolveDone();
  }
  // Phones resize the window's height as the address bar slides; only a width change moves the card.
  const onResize = () => document.documentElement.clientWidth !== width0 && stop();
  const onHidden = () => document.hidden && stop();
  const onLost = (e: Event) => {
    e.preventDefault();
    stop();
  };

  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onHidden);
  canvas.addEventListener("webglcontextlost", onLost);
  document.body.appendChild(canvas);
  raf = requestAnimationFrame(frame);
  await started;
  return { stop, done };
}
