/**
 * The Moss Golem steps out of its card, in three.js. Loaded only when it plays (see golemLeap.ts).
 *
 * The golem is a 3D model built in Blender (art/source/moss-golem-3d.blend): boulders hung on a
 * joint hierarchy, with one baked animation (public/art/moss-golem-3d.glb). The card's art window
 * is a portal: the golem starts behind the card, seen through the window, punches through it,
 * leaps out to stand in front of the card, looks around, pounds its chest and the ground, nods,
 * and leaps back in. Dust, stone chips, moss and a shockwave are drawn here; the card itself shakes.
 *
 * A fixed, full-window canvas that exists only while it plays: aria-hidden, ignores the pointer,
 * and the card underneath stays the real content.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  applyGolemLook,
  golemLights,
  withPortal,
  type Portal,
} from "./golemLook";

const MODEL_SRC = "/art/moss-golem-3d.glb";
const FPS = 30;
/** In the Blender scene the art window is 1.4 units wide; this sets the golem's size from the real card. */
const WINDOW_UNITS = 1.4;
/**
 * How high it reaches (golem units) at each distance in front of the card, measured from the bake:
 * the top of the leap out, and the ground pound's fists overhead. Used to fit it inside the window.
 */
const REACH: [depth: number, height: number][] = [
  [1.54, 3.67],
  [1.78, 3.59],
  [1.96, 3.27],
  [2.2, 3.15],
];
/** Moments in the baked animation (frames at 30 fps), for the effects. anim_golem.py prints these. */
const EV = {
  flare: 9,
  punch: 24,
  launch: 52,
  out: 57,
  land: 77,
  look1: 127,
  look2: 144,
  pointText: 172,
  pointYou: 213,
  roar: 241,
  pound1: 249,
  pound2: 258,
  roarEnd: 264,
  roarOut: 270,
  slam: 298,
  hop: 349,
  home: 365,
};
const CLIP_END = 378 / FPS;
/** After the clip: the painting fades back in over the 3D golem, then the canvas goes. */
const END = CLIP_END + 0.3;

const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));
const span = (t: number, a: number, b: number) =>
  clamp((t - a) / (b - a), 0, 1);
const pulse = (t: number, at: number, len: number) =>
  t < at ? 0 : Math.exp(-(t - at) / len);

const PARTICLE_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute float aShape;
  attribute vec3 aColor;
  uniform float uScale;
  varying float vAlpha;
  varying float vShape;
  varying vec3 vColor;
  varying float vPortalZ;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPortalZ = wp.z;
    vec4 mv = viewMatrix * wp;
    gl_PointSize = aSize * uScale / -mv.z;
    vAlpha = aAlpha;
    vShape = aShape;
    vColor = aColor;
    gl_Position = projectionMatrix * mv;
  }
`;

const PARTICLE_FRAG = /* glsl */ `
  uniform float uPortal;
  uniform vec4 uPortalRect;
  varying float vAlpha;
  varying float vShape;
  varying vec3 vColor;
  varying float vPortalZ;
  void main() {
    if (uPortal > 0.5 && vPortalZ < 0.0 && (gl_FragCoord.x < uPortalRect.x || gl_FragCoord.x > uPortalRect.z ||
        gl_FragCoord.y < uPortalRect.y || gl_FragCoord.y > uPortalRect.w)) discard;
    vec2 p = gl_PointCoord - 0.5;
    float a;
    if (vShape > 0.5) {
      // a chip of stone: a hard-edged diamond
      if (abs(p.x) + abs(p.y) > 0.5) discard;
      a = 1.0;
    } else {
      // a puff of dust: soft and round
      float r = length(p);
      if (r > 0.5) discard;
      a = smoothstep(0.5, 0.1, r);
    }
    gl_FragColor = vec4(vColor, vAlpha * a);
  }
`;

type Run = { stop: () => void; done: Promise<void> };

/**
 * Start the golem from this card wrapper (the element holding the Moss Golem card). Resolves once the
 * first frame is drawn; `done` resolves when it ends or is stopped. Resolves to null if `cancelled()`
 * turns true before anything is shown. Throws if WebGL or the model fails, leaving the card untouched.
 */
export async function runGolem(
  host: HTMLElement,
  cancelled: () => boolean = () => false,
): Promise<Run | null> {
  const fgEl = host.querySelector<HTMLElement>("img.art-fg");
  const bg = host.querySelector<HTMLElement>("img.art-bg");
  const windowEl = host.querySelector<HTMLElement>(".art-breakout");
  const card = host.querySelector<HTMLElement>(".card");
  if (!fgEl || !windowEl || !card)
    throw new Error("Moss Golem card is missing its art");
  const fg: HTMLElement = fgEl;

  const gltf = await new GLTFLoader().loadAsync(MODEL_SRC);
  // Blender exports one animation per joint; together they're the one performance.
  const clip = gltf.animations.length
    ? new THREE.AnimationClip(
        "Perform",
        -1,
        gltf.animations.flatMap((a) => a.tracks),
      )
    : null;
  const disposeModel = () =>
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.geometry.dispose();
    });
  if (!clip || cancelled()) {
    disposeModel();
    if (!clip) throw new Error("Moss Golem model has no animation");
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      failIfMajorPerformanceCaveat: true,
    });
  } catch (e) {
    disposeModel();
    throw e;
  }
  // If anything below throws before it's running, undo what was done so far: the card must never be left changed.
  const undo: (() => void)[] = [
    disposeModel,
    () => (renderer.dispose(), renderer.forceContextLoss()),
  ];
  try {
    // ---- Where the card is right now. World units are CSS pixels, origin at the window's centre, y up. ----
    const W = document.documentElement.clientWidth;
    const H = window.innerHeight;
    const win = windowEl.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    const cx = cardBox.left + cardBox.width / 2 - W / 2;
    const floorY = H / 2 - cardBox.bottom; // the floor is level with the card's bottom edge
    const winBottomY = H / 2 - win.bottom;
    const camZ = H / 2 / Math.tan(THREE.MathUtils.degToRad(15));
    // Pixels per golem unit: sized from the card's art window, but small enough that it never leaves the top
    // of the window (on a short or wide screen it may pass over the header for a moment, mid-leap).
    const ceiling = H / 2 - 8;
    const fits = (u: number) =>
      REACH.every(
        ([d, h]) =>
          winBottomY +
            (floorY + h * u - winBottomY) * (camZ / (camZ - d * u)) <=
          ceiling,
      );
    let unit = win.width / WINDOW_UNITS;
    for (let i = 0; i < 30 && !fits(unit); i++) unit *= 0.95;

    Object.assign(canvas.style, {
      position: "fixed",
      left: "0",
      top: "0",
      width: `${W}px`,
      height: `${H}px`,
      pointerEvents: "none",
      zIndex: "60",
    });
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NoToneMapping;

    // ---- Camera: 1 world unit = 1 CSS pixel on the card's plane, with the eye level at the bottom of the art
    // window (an off-axis frustum). Things coming toward the viewer grow around the card, and the floor in
    // front of the card is seen from a little above, so the golem's feet stay near the card's bottom edge.
    const camera = new THREE.PerspectiveCamera(30, W / H, 1, camZ * 4);
    camera.position.set(cx, winBottomY, camZ);
    {
      const n = camera.near / camZ;
      camera.projectionMatrix.makePerspective(
        (-W / 2 - cx) * n,
        (W / 2 - cx) * n,
        (H / 2 - winBottomY) * n,
        (-H / 2 - winBottomY) * n,
        camera.near,
        camera.far,
      );
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    }

    const scene = new THREE.Scene();
    scene.add(golemLights());
    const root = new THREE.Group(); // follows the page if it scrolls mid-way
    scene.add(root);

    // ---- The portal: behind the card's plane, only the art window shows. ----
    const portalRect = new THREE.Vector4();
    const portal: Portal = {
      uPortal: { value: 1 },
      uPortalRect: { value: portalRect },
    };
    // Scrolling down by s moves the card up on screen, i.e. up in gl_FragCoord (origin bottom left).
    const setPortal = (scrolled: number) =>
      portalRect.set(
        win.left * pr,
        (H - win.bottom + scrolled) * pr,
        win.right * pr,
        (H - win.top + scrolled) * pr,
      );
    setPortal(0);

    // ---- The golem: Blender's Z-up becomes three's Y-up, and Blender's -Y (its front) faces the viewer. ----
    const look = applyGolemLook(gltf.scene, portal);
    const golem = new THREE.Group();
    golem.position.set(cx, floorY, 0);
    golem.scale.setScalar(unit);
    golem.add(gltf.scene);
    root.add(golem);
    gltf.scene.traverse((o) => (o.frustumCulled = false)); // the bake moves parts far from their rest bounds
    const mixer = new THREE.AnimationMixer(gltf.scene);
    const action = mixer.clipAction(clip);
    const lastTime = clip.duration - 1e-3;
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    const node = (n: string) => gltf.scene.getObjectByName(n) ?? gltf.scene;
    const rootNode = node("Root");
    const fistR = node("FistR");
    const fistL = node("FistL");
    const finger = node("FingerR");
    const chestNode = node("ChestRock");
    const v = new THREE.Vector3();
    /** A golem part's position in root space (world px, before scrolling). */
    const at = (
      o: THREE.Object3D,
      off: [number, number, number] = [0, 0, 0],
    ) => {
      o.localToWorld(v.set(...off));
      return root.worldToLocal(v).clone();
    };

    // ---- Blob shadow on the floor under the golem. ----
    const shadowTex = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d")!;
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, "rgba(13,21,48,0.55)");
      grd.addColorStop(0.6, "rgba(13,21,48,0.25)");
      grd.addColorStop(1, "rgba(13,21,48,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    const shadowGeo = new THREE.PlaneGeometry(1, 1);
    const shadowMat = withPortal(
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
      }),
      portal,
    );
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.renderOrder = -2;
    root.add(shadow);

    // ---- Shockwave rings for the ground pound: a bright gold one and a slower dust one. ----
    const ringGeo = new THREE.RingGeometry(0.86, 1, 72);
    const ringGold = withPortal(
      new THREE.MeshBasicMaterial({
        color: "#f6cf6a",
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      portal,
    );
    const ringDust = withPortal(
      new THREE.MeshBasicMaterial({
        color: "#bfb6a5",
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      portal,
    );
    const rings = [
      new THREE.Mesh(ringGeo, ringGold),
      new THREE.Mesh(ringGeo, ringDust),
    ];
    for (const r of rings) {
      r.rotation.x = -Math.PI / 2;
      r.visible = false;
      r.renderOrder = -1;
      root.add(r);
    }

    // ---- Particles: dust puffs, stone chips, moss bits (one draw call). ----
    const N = 420;
    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    const born = new Float32Array(N).fill(-1);
    const life = new Float32Array(N);
    const size0 = new Float32Array(N);
    const grow = new Float32Array(N);
    const size = new Float32Array(N);
    const alpha = new Float32Array(N);
    const alpha0 = new Float32Array(N);
    const shape = new Float32Array(N);
    const gravity = new Float32Array(N);
    const drag = new Float32Array(N);
    const bounced = new Uint8Array(N);
    const color = new Float32Array(N * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
    geo.setAttribute("aShape", new THREE.BufferAttribute(shape, 1));
    geo.setAttribute("aColor", new THREE.BufferAttribute(color, 3));
    const pMat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: camZ * pr }, ...portal },
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, pMat);
    points.frustumCulled = false;
    points.renderOrder = 4;
    root.add(points);

    const DUST = ["#ddd6c8", "#c7bfaf", "#aaa293"].map(
      (c) => new THREE.Color(c),
    );
    const STONE = ["#9ba3ab", "#7d858d", "#b6bcc1", "#5f6770"].map(
      (c) => new THREE.Color(c),
    );
    const MOSS = ["#7fbf6a", "#93cc74", "#a6d684", "#6fae5c"].map(
      (c) => new THREE.Color(c),
    );
    const GOLD = ["#f6cf6a", "#ffe39a"].map((c) => new THREE.Color(c));
    let next = 0;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    type Kind = "dust" | "chip" | "moss" | "spark";
    /** Spawn `count` particles at p (root space). Speeds and sizes are in golem units, so phones and desktops match. */
    function emit(
      kind: Kind,
      count: number,
      t: number,
      p: THREE.Vector3,
      o: {
        spread?: number;
        up?: number;
        out?: number;
        toward?: number;
        flat?: boolean;
      } = {},
    ) {
      const { spread = 0.15, up = 1, out = 1, toward = 0, flat = false } = o;
      for (let k = 0; k < count; k++) {
        const i = next++ % N;
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * spread * unit;
        pos[i * 3] = p.x + Math.cos(a) * r;
        pos[i * 3 + 1] =
          p.y + (flat ? rnd(0, 0.05) * unit : Math.sin(a) * r * 0.5);
        pos[i * 3 + 2] = p.z + Math.sin(a) * r;
        born[i] = t;
        bounced[i] = 0;
        const pal =
          kind === "dust"
            ? DUST
            : kind === "chip"
              ? STONE
              : kind === "moss"
                ? MOSS
                : GOLD;
        pal[Math.floor(Math.random() * pal.length)].toArray(color, i * 3);
        shape[i] = kind === "chip" ? 1 : 0;
        if (kind === "dust") {
          const s = rnd(0.6, 2.2) * out;
          vel[i * 3] = Math.cos(a) * s * unit;
          vel[i * 3 + 1] = rnd(0.1, 0.5) * up * unit;
          vel[i * 3 + 2] = Math.sin(a) * s * unit + toward * unit;
          life[i] = rnd(0.9, 1.5);
          size0[i] = rnd(0.16, 0.32) * unit;
          grow[i] = rnd(1.8, 2.8);
          alpha0[i] = rnd(0.45, 0.7);
          gravity[i] = -0.15 * unit;
          drag[i] = 2.6;
        } else if (kind === "chip") {
          const s = rnd(0.5, 1.8) * out;
          vel[i * 3] = Math.cos(a) * s * unit;
          vel[i * 3 + 1] = rnd(1.6, 3.6) * up * unit;
          vel[i * 3 + 2] = Math.sin(a) * s * unit + toward * unit;
          life[i] = rnd(1.0, 1.5);
          size0[i] = rnd(0.035, 0.075) * unit;
          grow[i] = 1;
          alpha0[i] = 1;
          gravity[i] = 9 * unit;
          drag[i] = 0.4;
        } else if (kind === "moss") {
          const s = rnd(0.3, 1.0) * out;
          vel[i * 3] = Math.cos(a) * s * unit;
          vel[i * 3 + 1] = rnd(0.4, 1.4) * up * unit;
          vel[i * 3 + 2] = Math.sin(a) * s * unit + toward * unit;
          life[i] = rnd(1.1, 1.7);
          size0[i] = rnd(0.03, 0.06) * unit;
          grow[i] = 1;
          alpha0[i] = 1;
          gravity[i] = 2.2 * unit;
          drag[i] = 1.6;
        } else {
          const s = rnd(0.8, 2.2) * out;
          vel[i * 3] = Math.cos(a) * s * unit;
          vel[i * 3 + 1] = (Math.sin(a) * 0.7 + 0.6) * s * up * unit;
          vel[i * 3 + 2] = rnd(0.2, 1.2) * unit + toward * unit;
          life[i] = rnd(0.5, 0.9);
          size0[i] = rnd(0.03, 0.05) * unit;
          grow[i] = 0.6;
          alpha0[i] = 1;
          gravity[i] = 3 * unit;
          drag[i] = 1.2;
        }
      }
    }
    const floorAt = (x: number, z: number) => new THREE.Vector3(x, floorY, z);

    // ---- The card itself reacts: shakes on impacts; its painted window dims while the golem is out. ----
    const cardAnims: Animation[] = [];
    undo.push(() => cardAnims.forEach((a) => a.cancel()));
    const shake = (px: number, ms: number) => {
      const k = [0, -1, 0.8, -0.6, 0.35, -0.15, 0];
      cardAnims.push(
        card.animate(
          k.map((s, i) => ({
            translate: `${(i % 2 ? 0.45 : -0.3) * s * px}px ${s * px}px`,
          })),
          { duration: ms, easing: "ease-out" },
        ),
      );
    };
    const dimWindow = (on: boolean) =>
      bg &&
      cardAnims.push(
        bg.animate(
          [
            {
              filter: on ? "brightness(1)" : "brightness(0.55) saturate(0.75)",
            },
            {
              filter: on ? "brightness(0.55) saturate(0.75)" : "brightness(1)",
            },
          ],
          {
            duration: on ? 500 : 450,
            fill: "forwards",
            easing: "ease-in-out",
          },
        ),
      );
    const flicker = () =>
      bg &&
      cardAnims.push(
        bg.animate(
          [
            { filter: "brightness(0.55)" },
            { filter: "brightness(1.35)" },
            { filter: "brightness(0.55) saturate(0.75)" },
          ],
          { duration: 260, composite: "replace" },
        ),
      );
    // The painted golem fades out as the 3D one takes over, and back in at the end.
    const fgOut = fg.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 220,
      fill: "forwards",
      easing: "ease-out",
    });
    fgOut.pause();
    cardAnims.push(fgOut);
    let fgBack: Animation | null = null;
    // While it performs, the card holds still (no hover tilt), so the window stays where the portal is.
    host.dataset.performing = "true";
    undo.push(() => delete host.dataset.performing);

    // ---- Effects, fired once each as the clip passes them. ----
    const fired = new Set<string>();
    const once = (name: string, t: number, frame: number, fn: () => void) => {
      if (t >= frame / FPS && !fired.has(name)) {
        fired.add(name);
        fn();
      }
    };
    function effects(t: number) {
      once("swap", t, 0, () => {
        fgOut.play();
        emit(
          "dust",
          14,
          t,
          new THREE.Vector3(cx, winBottomY + 0.25 * unit, -0.3 * unit),
          { spread: 0.45, up: 1.4, out: 0.5 },
        );
        shake(3, 300);
      });
      once("punch", t, EV.punch, () => {
        const p = at(fistR);
        p.z = Math.max(p.z, 2);
        emit("chip", 22, t, p, { spread: 0.2, out: 1.3, toward: 1.2 });
        emit("dust", 10, t, p, { spread: 0.25, out: 0.8, toward: 0.6 });
        emit("spark", 10, t, p, { toward: 0.8 });
        shake(6, 360);
      });
      once("out", t, EV.out, () => dimWindow(true));
      once("land", t, EV.land, () => {
        const r = at(rootNode);
        emit("dust", 34, t, floorAt(r.x, r.z), {
          spread: 0.5,
          out: 1.2,
          flat: true,
        });
        emit("chip", 14, t, floorAt(r.x, r.z + 0.4 * unit), {
          spread: 0.5,
          out: 1,
        });
        emit("moss", 12, t, at(chestNode, [0, 0.4, 0]), {
          spread: 0.4,
          out: 0.8,
        });
        shake(8, 420);
      });
      for (const [name, frame, fist] of [
        ["pound1", EV.pound1, fistR],
        ["pound2", EV.pound2, fistL],
      ] as const) {
        once(name, t, frame, () => {
          emit("moss", 8, t, at(fist), { spread: 0.15, out: 0.7, toward: 0.5 });
          emit("dust", 5, t, at(fist), { spread: 0.1, out: 0.4, up: 2 });
          shake(3, 240);
        });
      }
      // A glint off the fingertip as it points at the lesson text, and again at you.
      for (const [name, frame] of [
        ["pointText", EV.pointText],
        ["pointYou", EV.pointYou],
      ] as const) {
        once(name, t, frame, () => emit("spark", 8, t, at(finger, [0, -0.27, 0]), { spread: 0.05, out: 0.5 }));
      }
      once("slam", t, EV.slam, () => {
        const a = at(fistL);
        const b = at(fistR);
        const c = floorAt((a.x + b.x) / 2, (a.z + b.z) / 2);
        for (const r of rings) {
          r.position.copy(c);
          r.position.y += 1;
          r.visible = true;
        }
        ringStart = t;
        emit("dust", 46, t, c, { spread: 0.4, out: 1.8, flat: true });
        emit("chip", 30, t, c, { spread: 0.35, out: 1.3, up: 1.2 });
        emit("moss", 10, t, at(chestNode, [0, 0.5, 0]), { spread: 0.4 });
        shake(12, 520);
        flicker();
      });
      once("hop", t, EV.hop, () => {
        const r = at(rootNode);
        emit("dust", 20, t, floorAt(r.x, r.z), {
          spread: 0.4,
          out: 0.9,
          flat: true,
        });
      });
      once("relight", t, EV.home - 4, () => dimWindow(false));
      once("home", t, EV.home, () => {
        emit(
          "dust",
          12,
          t,
          new THREE.Vector3(cx, winBottomY + 0.2 * unit, -0.3 * unit),
          { spread: 0.45, out: 0.5 },
        );
        shake(6, 380);
      });
      once("fgBack", t, (CLIP_END - 0.05) * FPS, () => {
        fgBack = fg.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 300,
          fill: "forwards",
          easing: "ease-in",
        });
        cardAnims.push(fgBack);
      });
    }
    let ringStart = -1;

    const scrollY0 = window.scrollY;
    const width0 = W;
    let raf = 0;
    let stopped = false;
    let lastT = 0;
    let resolveDone!: () => void;
    const done = new Promise<void>((r) => (resolveDone = r));
    let resolveStarted!: () => void;
    const started = new Promise<void>((r) => (resolveStarted = r));
    // If the GPU can't compile a shader, three.js only logs it; catch that and fall back to the card.
    let shaderFailed = false;
    renderer.debug.onShaderError = () => {
      shaderFailed = true;
    };
    const t0 = performance.now();

    function draw(t: number) {
      const scrolled = window.scrollY - scrollY0;
      root.position.y = scrolled;
      setPortal(scrolled);
      const dt = Math.min(Math.max(t - lastT, 0), 0.05); // real time, so slow phones don't slow anything down
      lastT = t;

      // Scrub the clip to t. (A play-once action pauses itself for good if it ever reaches an end, so keep it
      // inside the clip and unpaused.)
      action.paused = false;
      mixer.setTime(Math.min(t, lastTime));
      gltf.scene.updateMatrixWorld(true);
      effects(t);

      // Eyes: dim behind the card, flare when it wakes, pulse as it looks around, blaze on the roar and the slam.
      const f = t * FPS;
      const glow =
        0.55 +
        0.45 * span(f, 0, EV.flare) +
        1.1 * pulse(f, EV.flare, 7) +
        0.5 * pulse(f, EV.look1, 6) +
        0.5 * pulse(f, EV.look2, 6) +
        0.6 * pulse(f, EV.pointText, 7) +
        0.9 * pulse(f, EV.pointYou, 8) +
        0.7 * (span(f, EV.roar, EV.roar + 4) - span(f, EV.roarEnd, EV.roarOut)) +
        1.2 * pulse(f, EV.slam, 8) -
        0.9 * span(t, CLIP_END - 0.25, CLIP_END + 0.1);
      for (const g of look.eyeGlows) {
        g.scale.setScalar(0.24 * clamp(0.5 + glow * 0.5, 0.3, 2));
        (g.material as THREE.SpriteMaterial).opacity = clamp(glow, 0, 1) * 0.9;
      }

      // Shadow under the golem: softer and smaller as it leaves the floor.
      const r = at(rootNode);
      const lift = clamp((r.y - floorY) / (0.8 * unit), 0, 1);
      shadow.position.set(r.x, floorY + 0.5, r.z);
      shadow.scale.set(
        1.9 * unit * (1 - 0.35 * lift),
        1.2 * unit * (1 - 0.35 * lift),
        1,
      );
      shadowMat.opacity = 0.9 * (1 - 0.6 * lift);

      // Shockwave.
      if (ringStart >= 0) {
        const u = (t - ringStart) / 0.75;
        const ease = 1 - (1 - clamp(u, 0, 1)) ** 3;
        rings[0].scale.setScalar(Math.max(1, ease * 3.4 * unit));
        ringGold.opacity = 0.95 * (1 - clamp(u, 0, 1)) ** 1.4;
        const u2 = (t - ringStart) / 1.1;
        rings[1].scale.setScalar(
          Math.max(1, (1 - (1 - clamp(u2, 0, 1)) ** 3) * 2.6 * unit),
        );
        ringDust.opacity = 0.5 * (1 - clamp(u2, 0, 1));
        if (u2 >= 1) for (const ring of rings) ring.visible = false;
      }

      // Particles.
      const floorLocal = floorY;
      for (let i = 0; i < N; i++) {
        if (born[i] < 0) continue;
        const age = (t - born[i]) / life[i];
        if (age >= 1) {
          born[i] = -1;
          alpha[i] = 0;
          continue;
        }
        const k = Math.exp(-drag[i] * dt);
        vel[i * 3] *= k;
        vel[i * 3 + 2] *= k;
        vel[i * 3 + 1] = vel[i * 3 + 1] * k - gravity[i] * dt;
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        if (pos[i * 3 + 1] < floorLocal && vel[i * 3 + 1] < 0) {
          // chips bounce once and skid; everything else just rests on the floor
          pos[i * 3 + 1] = floorLocal;
          vel[i * 3 + 1] =
            shape[i] > 0.5 && !bounced[i] ? -vel[i * 3 + 1] * 0.3 : 0;
          bounced[i] = 1;
          vel[i * 3] *= 0.5;
          vel[i * 3 + 2] *= 0.5;
        }
        size[i] = size0[i] * (1 + (grow[i] - 1) * Math.sqrt(age));
        const fadeIn = shape[i] > 0.5 ? 1 : clamp(age / 0.08, 0, 1);
        alpha[i] = alpha0[i] * fadeIn * (1 - age) ** 1.4;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aSize.needsUpdate = true;
      geo.attributes.aAlpha.needsUpdate = true;
      geo.attributes.aColor.needsUpdate = true;
      geo.attributes.aShape.needsUpdate = true;

      renderer.render(scene, camera);
    }

    function frame(now: number) {
      if (stopped) return;
      if (shaderFailed) return stop(); // a shader didn't compile: keep the painted card instead
      // rAF's timestamp is when the frame began, which can be a moment before t0: never let time run backwards.
      const t = Math.max(0, (now - t0) / 1000);
      if (t >= END) return stop();
      try {
        draw(t);
      } catch {
        return stop(); // never leave the card's art hidden
      }
      resolveStarted();
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(raf);
      for (const a of cardAnims) a.cancel(); // the card goes back exactly as it was
      delete host.dataset.performing;
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onHidden);
      canvas.removeEventListener("webglcontextlost", onLost);
      mixer.stopAllAction();
      look.dispose();
      disposeModel();
      shadowGeo.dispose();
      shadowMat.dispose();
      shadowTex.dispose();
      ringGeo.dispose();
      ringGold.dispose();
      ringDust.dispose();
      geo.dispose();
      pMat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      resolveStarted();
      resolveDone();
    }
    // Phones resize the window's height as the address bar slides; only a width change moves the card.
    const onResize = () =>
      document.documentElement.clientWidth !== width0 && stop();
    const onHidden = () => document.hidden && stop();
    const onLost = (e: Event) => {
      e.preventDefault();
      stop();
    };

    mixer.setTime(0);
    renderer.compile(scene, camera);
    if (shaderFailed) {
      stop(); // nothing is on screen yet; this just frees everything
      throw new Error("Moss Golem shaders failed to compile");
    }
    if (cancelled()) {
      stop(); // stopped or navigated away while it was getting ready: nothing was shown
      return null;
    }
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onHidden);
    canvas.addEventListener("webglcontextlost", onLost);
    document.body.appendChild(canvas);
    raf = requestAnimationFrame(frame);
    await started;
    return { stop, done };
  } catch (e) {
    for (const u of undo) {
      try {
        u();
      } catch {
        /* keep undoing the rest */
      }
    }
    canvas.remove();
    throw e;
  }
}
