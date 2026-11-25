# Shared helpers for building the golem in Blender (run inside Blender via exec).
import bpy, bmesh, random, math
from mathutils import Vector, Matrix

def sgnpow(x, p): return math.copysign(abs(x) ** p, x)

def rock_bm(bm_out, size, center, seed, n=26, boxy=0.65, cuts=3, bevel=0.06, rot=(0,0,0)):
    """Chunky chiseled boulder (convex hull on a rounded box, planar chisel cuts, soft bevels), added to bm_out."""
    rnd = random.Random(seed); pts = []
    for i in range(n):
        y = 1 - (i + 0.5) / n * 2; r = math.sqrt(max(0, 1 - y*y)); th = i * 2.39996 + rnd.uniform(-0.35, 0.35)
        d = Vector((math.cos(th)*r, math.sin(th)*r, y)) + Vector([rnd.uniform(-.12,.12) for _ in range(3)])
        d = Vector((sgnpow(d.x, boxy), sgnpow(d.y, boxy), sgnpow(d.z, boxy)))
        pts.append(Vector((d.x*size[0], d.y*size[1], d.z*size[2])))
    for c in range(cuts):
        nrm = Vector([rnd.uniform(-1,1) for _ in range(3)]).normalized()
        off = rnd.uniform(0.55, 0.8) * (abs(nrm.x)*size[0] + abs(nrm.y)*size[1] + abs(nrm.z)*size[2]) / (abs(nrm.x)+abs(nrm.y)+abs(nrm.z))
        for k, p in enumerate(pts):
            dd = p.dot(nrm) - off
            if dd > 0: pts[k] = p - nrm * dd
    bm = bmesh.new(); vs = [bm.verts.new(p) for p in pts]
    bmesh.ops.convex_hull(bm, input=vs)
    for v in [v for v in bm.verts if not v.link_faces]: bm.verts.remove(v)
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(4), verts=bm.verts[:], edges=bm.edges[:])
    bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel*min(size), segments=1, affect='EDGES', profile=0.5)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    M = Matrix.Translation(Vector(center)) @ Matrix.Rotation(rot[2], 4, 'Z') @ Matrix.Rotation(rot[1], 4, 'Y') @ Matrix.Rotation(rot[0], 4, 'X')
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts[:])
    tmp = bpy.data.meshes.new("tmp"); bm.to_mesh(tmp); bm.free()
    bm_out.from_mesh(tmp); bpy.data.meshes.remove(tmp)

# ---- v3: rocks with moss caps + hanging fringe, ferns, vertex colors, material slots ----
STONE, MOSS, FERN, EYE = 0, 1, 2, 3

def _has_sliver(bm):
    for f in bm.faces:
        vs = [v.co for v in f.verts]
        e = max((vs[i] - vs[i-1]).length for i in range(len(vs)))
        if e > 0.06 and e * e / (f.calc_area() + 1e-9) > 120: return True
    return False

def single_rock_bm(size, center, seed, rot=(0,0,0), **kw):
    """One rock; reseeds (same look family) if the bevel left a long sliver face, which shows as a spike in the outline."""
    for k in range(8):
        bm = bmesh.new(); rock_bm(bm, size, center, seed + k * 1000, rot=rot, **kw)
        if not _has_sliver(bm): return bm
        bm.free()
    bm = bmesh.new(); rock_bm(bm, size, center, seed, rot=rot, **kw); return bm

def moss_cap_bm(rock, seed, up=0.35, lift=0.022, fringe=(0.04, 0.16)):
    """Moss draped over the rock's upward faces: an inflated copy of those faces plus a jagged
    fringe hanging from the cap's edge (like the painting's mantle)."""
    rnd = random.Random(seed * 7 + 3)
    cap = bmesh.new()
    rock.faces.ensure_lookup_table()
    vmap = {}
    for f in rock.faces:
        if f.normal.z < up: continue
        vs = []
        for v in f.verts:
            if v.index not in vmap:
                vmap[v.index] = cap.verts.new(v.co + v.normal * lift)
            vs.append(vmap[v.index])
        try: cap.faces.new(vs)
        except ValueError: pass
    if not cap.faces:
        cap.free(); return None
    cap.normal_update()
    # lumpy surface
    for v in cap.verts: v.co += v.normal * rnd.uniform(-0.004, 0.012)
    # hanging fringe from boundary edges
    bnd = [e for e in cap.edges if e.is_boundary]
    if bnd:
        res = bmesh.ops.extrude_edge_only(cap, edges=bnd)
        new = [g for g in res["geom"] if isinstance(g, bmesh.types.BMVert)]
        # strands: alternate long and short drops so the edge hangs in tapered tufts, not a curtain
        if new:
            cx = sum(w.co.x for w in new) / len(new); cy = sum(w.co.y for w in new) / len(new)
            new.sort(key=lambda v: math.atan2(v.co.y - cy, v.co.x - cx))
        for k, v in enumerate(new):
            drop = rnd.uniform(*fringe) * (1.5 if rnd.random() < 0.3 else 1.0) if k % 2 == 0 else rnd.uniform(0.004, 0.02)
            out = Vector((v.co.x, v.co.y, 0)); out = out.normalized() * 0.012 if out.length > 1e-6 else Vector()
            v.co += Vector((0, 0, -drop)) + out
    bmesh.ops.triangulate(cap, faces=cap.faces[:])
    return cap

def fern_bm(base, direction, length, seed, leaflets=12, width=0.11):
    """A fern frond: a curved stem with paired leaflets (plain geometry, no texture)."""
    rnd = random.Random(seed)
    bm = bmesh.new()
    d = Vector(direction).normalized(); side = d.cross(Vector((0,0,1)))
    if side.length < 1e-3: side = Vector((1,0,0))
    side.normalize(); upv = side.cross(d).normalized()
    prev = None
    for i in range(leaflets + 1):
        t = i / leaflets
        p = Vector(base) + d * length * t + upv * (math.sin(t * math.pi * 0.9) * length * 0.12) - Vector((0,0,1)) * (t*t*length*0.75)
        if i == 0 or i == leaflets: prev = p; continue
        w = width * math.sin(t * math.pi) * (1.1 - t * 0.5)
        for s in (-1, 1):
            tip = p + side * s * w * 1.6 + d * w * 0.6 - Vector((0,0,1)) * w * 0.3
            a = bm.verts.new(p); b = bm.verts.new(prev); c = bm.verts.new(tip)
            bm.faces.new((a, b, c) if s > 0 else (b, a, c))
        prev = p
    return bm

def add_colored(bm_out, src, mat_index, color_fn, layer_name="Col"):
    """Merge src into bm_out, setting material index and a per-loop color."""
    tmp = bpy.data.meshes.new("tmp"); src.to_mesh(tmp)
    for p in tmp.polygons: p.material_index = mat_index
    attr = tmp.color_attributes.new(layer_name, 'BYTE_COLOR', 'CORNER')
    for p in tmp.polygons:
        col = color_fn(p)
        for li in p.loop_indices: attr.data[li].color = col
    bm_out.from_mesh(tmp); bpy.data.meshes.remove(tmp)
