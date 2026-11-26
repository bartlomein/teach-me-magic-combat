import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

export type Portal = {
  uPortal: { value: number };
  uPortalRect: { value: THREE.Vector4 };
};

const PORTAL_FRAG = /* glsl */ `
  uniform float uPortal;
  uniform vec4 uPortalRect; // x0, y0, x1, y1 in drawing-buffer pixels (origin bottom left)
  varying float vPortalZ;
`;
const PORTAL_TEST = /* glsl */ `
  if (uPortal > 0.5 && vPortalZ < 0.0 && (gl_FragCoord.x < uPortalRect.x || gl_FragCoord.x > uPortalRect.z ||
      gl_FragCoord.y < uPortalRect.y || gl_FragCoord.y > uPortalRect.w)) discard;
`;

export function withPortal<M extends THREE.Material>(
  m: M,
  portal: Portal | undefined,
  sprite = false,
): M {
  if (!portal) return m;
  const prev = m.onBeforeCompile.bind(m);
  const prevKey = m.customProgramCacheKey.bind(m);
  m.onBeforeCompile = (s, r) => {
    prev(s, r);
    Object.assign(s.uniforms, portal);
    s.vertexShader = s.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vPortalZ;",
      )
      .replace(
        sprite ? "#include <logdepthbuf_vertex>" : "#include <project_vertex>",
        sprite
          ? "#include <logdepthbuf_vertex>\nvPortalZ = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).z;"
          : "#include <project_vertex>\nvPortalZ = (modelMatrix * vec4(transformed, 1.0)).z;",
      );
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", "#include <common>\n" + PORTAL_FRAG)
      .replace(
        "#include <clipping_planes_fragment>",
        PORTAL_TEST + "#include <clipping_planes_fragment>",
      );
  };
  m.customProgramCacheKey = () => prevKey() + "-portal";
  return m;
}

function makeRamp() {
  const ramp = new THREE.DataTexture(
    new Uint8Array([46, 118, 255]),
    3,
    1,
    THREE.RedFormat,
  );
  ramp.minFilter = THREE.NearestFilter;
  ramp.magFilter = THREE.NearestFilter;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  return ramp;
}

function toon(ramp: THREE.Texture, rimStrength: number) {
  const m = new THREE.MeshToonMaterial({
    color: 0xffffff,
    gradientMap: ramp,
    vertexColors: true,
  });
  m.onBeforeCompile = (s) => {
    s.uniforms.uGold = { value: new THREE.Color("#f6cf6a") };
    s.uniforms.uRim = { value: rimStrength };
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform vec3 uGold;\nuniform float uRim;",
      )
      .replace(
        "#include <opaque_fragment>",
        /* glsl */ `
        {
          vec3 Vd = normalize(vViewPosition);
          vec3 upV = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
          float fres = pow(1.0 - saturate(dot(normal, Vd)), 3.0);
          float top = saturate(dot(normal, upV));
          float rim = smoothstep(0.32, 0.42, fres * top);
          outgoingLight = mix(outgoingLight, uGold, rim * uRim);
        }
        #include <opaque_fragment>`,
      );
  };
  m.customProgramCacheKey = () => `golem-toon-${rimStrength}`;
  return m;
}

function outlineMaterial() {
  const m = new THREE.MeshBasicMaterial({
    color: "#36404e",
    side: THREE.BackSide,
  });
  m.onBeforeCompile = (s) => {
    s.uniforms.uWidth = { value: 0.009 };
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uWidth;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nif (dot(normal, normal) > 1e-8) transformed += normalize(normal) * uWidth;",
      );
  };
  m.customProgramCacheKey = () => "golem-outline";
  return m;
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,236,160,1)");
  grd.addColorStop(0.35, "rgba(246,207,106,0.75)");
  grd.addColorStop(1, "rgba(246,207,106,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export type GolemLook = {
  eyeGlows: THREE.Sprite[];
  dispose: () => void;
};

export function applyGolemLook(
  root: THREE.Object3D,
  portal?: Portal,
): GolemLook {
  const ramp = makeRamp();
  const stone = withPortal(toon(ramp, 0.75), portal);
  const moss = withPortal(toon(ramp, 0.9), portal);
  const fern = withPortal(
    new THREE.MeshToonMaterial({
      color: 0xffffff,
      gradientMap: ramp,
      vertexColors: true,
      side: THREE.DoubleSide,
      emissive: "#3f6a22",
    }),
    portal,
  );
  const eye = withPortal(
    new THREE.MeshBasicMaterial({ color: "#ffd76a" }),
    portal,
  );
  const ink = withPortal(outlineMaterial(), portal);
  const glowTex = glowTexture();
  const eyeGlows: THREE.Sprite[] = [];
  const toDispose: { dispose(): void }[] = [
    ramp,
    stone,
    moss,
    fern,
    eye,
    ink,
    glowTex,
  ];

  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  for (const mesh of meshes) {
    const name = ((mesh.material as THREE.Material).name || "").toLowerCase();
    if (!name.startsWith("eye") && !mesh.geometry.getAttribute("normal")) {
      // The GLB has no normals: unshare vertices so each facet gets a flat normal.
      const flat = mesh.geometry.index
        ? mesh.geometry.toNonIndexed()
        : mesh.geometry;
      flat.computeVertexNormals();
      if (flat !== mesh.geometry) {
        const indexed = mesh.geometry;
        mesh.geometry = flat;
        if (name.startsWith("stone"))
          mesh.userData.indexed = indexed; // the outline wants the shared vertices
        else indexed.dispose();
      }
    }
    (mesh.material as THREE.Material).dispose();
    if (name.startsWith("stone")) {
      mesh.material = stone;
      // The outline needs smooth normals or it cracks at every edge.
      const src =
        (mesh.userData.indexed as THREE.BufferGeometry | undefined) ??
        mesh.geometry;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", src.getAttribute("position"));
      g.setIndex(src.getIndex());
      const smooth = mergeVertices(g, 1e-4);
      smooth.computeVertexNormals();
      toDispose.push(smooth);
      if (mesh.userData.indexed)
        toDispose.push(mesh.userData.indexed as THREE.BufferGeometry);
      const hull = new THREE.Mesh(smooth, ink);
      hull.renderOrder = -1;
      mesh.add(hull);
    } else if (name.startsWith("moss")) {
      mesh.material = moss;
    } else if (name.startsWith("fern")) {
      mesh.material = fern;
    } else if (name.startsWith("eye")) {
      mesh.material = eye;
      mesh.geometry.computeBoundingBox();
      const box = mesh.geometry.boundingBox!;
      const pair = box.max.x - box.min.x > 0.12;
      const pos = mesh.geometry.getAttribute("position");
      const centres = [new THREE.Vector3(), new THREE.Vector3()];
      const counts = [0, 0];
      const mid = (box.min.x + box.max.x) / 2;
      for (let i = 0; i < pos.count; i++) {
        const k = pair && pos.getX(i) <= mid ? 1 : 0;
        centres[k].add(
          new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)),
        );
        counts[k]++;
      }
      centres.forEach((c, k) => {
        if (!counts[k]) return;
        c.divideScalar(counts[k]);
        const sp = new THREE.Sprite(
          withPortal(
            new THREE.SpriteMaterial({
              map: glowTex,
              transparent: true,
              depthWrite: false,
              opacity: 0.85,
            }),
            portal,
            true,
          ),
        );
        sp.position.copy(c);
        sp.scale.setScalar(0.24);
        sp.renderOrder = 5;
        mesh.add(sp);
        eyeGlows.push(sp);
        toDispose.push(sp.material);
      });
    }
  }
  return {
    eyeGlows,
    dispose: () => {
      for (const d of toDispose) d.dispose();
      for (const m of meshes) m.geometry.dispose();
    },
  };
}

export function golemLights() {
  const g = new THREE.Group();
  const key = new THREE.DirectionalLight("#fff6e6", 1.9);
  key.position.set(-3, 5, 4);
  const hemi = new THREE.HemisphereLight("#b8c6d4", "#2f3742", 0.9);
  g.add(key, hemi);
  return g;
}
