# Builds the Moss Golem in Blender: rigid boulder body parts hung on a joint hierarchy (empties),
# moss mantles, ferns and glowing eyes. Run inside Blender with exec(open(path).read()).
import bpy, bmesh, math, random
from mathutils import Vector
HERE = __import__("os").path.dirname(__import__("os").path.abspath(__file__)) + "/" if "__file__" in globals() else "./"
exec(open(HERE + "rocklib.py").read())

for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
coll = bpy.data.collections.get("Golem") or bpy.data.collections.new("Golem")
if coll.name not in bpy.context.scene.collection.children: bpy.context.scene.collection.children.link(coll)

def mat(name):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True; nt = m.node_tree; b = nt.nodes.get("Principled BSDF")
    b.inputs["Roughness"].default_value = 1.0
    vc = nt.nodes.get("VC") or nt.nodes.new("ShaderNodeVertexColor"); vc.name = "VC"; vc.layer_name = "Col"
    nt.links.new(vc.outputs["Color"], b.inputs["Base Color"])
    return m
MATS = [mat("Stone"), mat("Moss"), mat("Fern"), mat("Eye")]

def empty(name, loc, parent=None):
    e = bpy.data.objects.new(name, None); e.empty_display_type = 'PLAIN_AXES'; e.empty_display_size = 0.12
    coll.objects.link(e)
    if parent: e.parent = parent; e.location = Vector(loc) - parent.matrix_world.translation
    else: e.location = loc
    bpy.context.view_layer.update(); return e

def hexrgb(h): return [int(h[i:i+2],16)/255 for i in (1,3,5)]
STONES = [hexrgb(c) for c in ("#a9b0b6", "#9ba3ab", "#b6bcc1", "#8f979f")]
MOSSES = [hexrgb(c) for c in ("#6aae55", "#5c9c4a", "#7fbf62", "#94cc72")]

def segment(name, joint, rocks, ferns=(), eyes=()):
    """rocks: (size, center, seed, moss 0..1[, rot]); merged into one mesh whose origin is the joint."""
    origin = joint.matrix_world.translation
    out = bmesh.new(); mat_l = out.faces.layers.int.new("mat"); tint_l = out.faces.layers.int.new("tint")
    def merge(src, m_idx, tint):
        tmp = bpy.data.meshes.new("tmp"); src.to_mesh(tmp); src.free()
        n0 = len(out.faces); out.from_mesh(tmp); bpy.data.meshes.remove(tmp); out.faces.ensure_lookup_table()
        for f in out.faces[n0:]: f[mat_l] = m_idx; f[tint_l] = tint
    for r in rocks:
        size, center, seed, moss = r[0], r[1], r[2], r[3]; rot = r[4] if len(r) > 4 else (0,0,0)
        rb = single_rock_bm(size, Vector(center) - origin, seed, rot=rot); rb.normal_update()
        if moss > 0:
            cap = moss_cap_bm(rb, seed, up=0.62 - 0.42 * moss, fringe=(0.05 * moss + 0.02, 0.3 * moss + 0.04))
            if cap: merge(cap, MOSS, seed % 4)
        merge(rb, STONE, seed % 4)
    for (base, direction, length, seed) in ferns:
        merge(fern_bm(Vector(base) - origin, direction, length, seed), FERN, 0)
    for (c, rad) in eyes:
        eb = bmesh.new(); bmesh.ops.create_icosphere(eb, subdivisions=1, radius=rad)
        bmesh.ops.translate(eb, vec=Vector(c) - origin, verts=eb.verts[:]); merge(eb, EYE, 0)
    me = bpy.data.meshes.new(name); out.to_mesh(me); out.free()
    for m in MATS: me.materials.append(m)
    col = me.color_attributes.new("Col", 'BYTE_COLOR', 'CORNER')
    mats = me.attributes["mat"].data; tints = me.attributes["tint"].data
    for p in me.polygons:
        mi = mats[p.index].value; p.material_index = mi; p.use_smooth = False; t = tints[p.index].value
        if mi == STONE: c = STONES[t]
        elif mi == MOSS: c = None
        elif mi == FERN: c = hexrgb("#9fd86f")
        else: c = hexrgb("#ffd76a")
        for li in p.loop_indices:
            cc = c if c is not None else MOSSES[(t + me.loops[li].vertex_index * 7919 // 13) % 4]
            col.data[li].color = (*cc, 1)
    me.attributes.remove(me.attributes["mat"]); me.attributes.remove(me.attributes["tint"])
    ob = bpy.data.objects.new(name, me); coll.objects.link(ob); ob.parent = joint; ob.location = (0,0,0)
    return ob

d = math.radians
root = empty("Root", (0,0,0))
pelvis = empty("Pelvis", (0, 0.02, 0.76), root)
chest = empty("Chest", (0, 0.04, 0.98), pelvis)
head = empty("Head", (0, -0.45, 1.66), chest)
J = {}
for side, sx in (("L", 1), ("R", -1)):
    J["Shoulder"+side] = empty("Shoulder"+side, (0.58*sx, 0.0, 1.56), chest)
    J["Elbow"+side] = empty("Elbow"+side, (0.9*sx, -0.12, 1.05), J["Shoulder"+side])
    J["Wrist"+side] = empty("Wrist"+side, (0.98*sx, -0.3, 0.66), J["Elbow"+side])
    J["Hip"+side] = empty("Hip"+side, (0.27*sx, 0.04, 0.72), pelvis)
    J["Knee"+side] = empty("Knee"+side, (0.32*sx, -0.02, 0.40), J["Hip"+side])
    J["Ankle"+side] = empty("Ankle"+side, (0.34*sx, -0.05, 0.13), J["Knee"+side])

segment("PelvisRock", pelvis, [((0.42,0.34,0.22),(0,0.04,0.78),11,0), ((0.2,0.22,0.18),(0.27,0.02,0.71),41,0), ((0.2,0.22,0.18),(-0.27,0.02,0.71),42,0)])
segment("ChestRock", chest, [
    ((0.38,0.32,0.24),(0,-0.06,0.98),12,0), ((0.62,0.46,0.38),(0,-0.04,1.3),13,0.75), ((0.5,0.36,0.32),(0,0.2,1.55),14,1.0),
    ((0.26,0.18,0.2),(0.22,-0.36,1.32),31,0.3,(0,0,d(8))), ((0.26,0.18,0.2),(-0.22,-0.36,1.3),32,0,(0,0,d(-6))),
    ((0.22,0.2,0.16),(0.3,-0.12,1.62),33,1.0), ((0.22,0.2,0.16),(-0.3,-0.12,1.62),34,1.0), ((0.3,0.24,0.2),(0,0.3,1.2),35,0.3)],
    ferns=[((0.12,0.14,1.86),(0.5,0.3,0.55),0.62,1), ((-0.22,0.2,1.84),(-0.6,0.35,0.5),0.55,2), ((0.3,-0.22,1.55),(0.7,-0.5,0.35),0.42,3), ((0.05,-0.42,1.38),(-0.4,-0.6,0.5),0.36,5)])
segment("HeadRock", head, [((0.24,0.22,0.2),(0,-0.66,1.76),15,0.8), ((0.26,0.11,0.07),(0,-0.81,1.85),16,0.9,(d(18),0,0)), ((0.18,0.14,0.09),(0,-0.68,1.6),17,0)],
    ferns=[((0.1,-0.58,1.94),(0.55,0.3,0.6),0.36,4)], eyes=[((0.095,-0.915,1.76),0.042), ((-0.095,-0.915,1.76),0.042)])
for side, sx in (("L", 1), ("R", -1)):
    s = 0 if sx > 0 else 100
    segment("UpperArm"+side, J["Shoulder"+side], [((0.4,0.38,0.34),(0.66*sx,-0.02,1.58),20+s,1.0), ((0.22,0.22,0.26),(0.86*sx,-0.08,1.22),21+s,0.35), ((0.18,0.16,0.16),(0.74*sx,0.12,1.4),28+s,0.5)],
        ferns=[((0.72*sx,0.05,1.9),(0.7*sx,0.35,0.45),0.34,10+s)])
    segment("Forearm"+side, J["Elbow"+side], [((0.31,0.29,0.34),(0.96*sx,-0.2,0.84),22+s,0.25), ((0.2,0.2,0.2),(1.03*sx,-0.08,1.0),29+s,0)])
    segment("Fist"+side, J["Wrist"+side], [((0.36,0.32,0.29),(1.0*sx,-0.36,0.42),43+s,0), ((0.26,0.13,0.13),(1.0*sx,-0.63,0.36),24+s,0), ((0.12,0.12,0.14),(0.83*sx,-0.52,0.48),37+s,0)])
    if side == "R":
        # The pointing finger: one stubby stone on its own joint at the front of the fist's base.
        # The animation keeps it folded up into the fist, and swings it out only to point.
        J["FingerR"] = empty("FingerR", (1.0*sx, -0.52, 0.2), J["WristR"])
        segment("FingerRock", J["FingerR"], [((0.095,0.095,0.17),(1.0*sx,-0.52,0.07),61,0), ((0.075,0.075,0.08),(1.0*sx,-0.52,-0.07),62,0)],
            eyes=[((1.0*sx,-0.52,-0.15),0.04)])  # a gold glowing tip, lit like the eyes
    segment("Thigh"+side, J["Hip"+side], [((0.29,0.29,0.27),(0.3*sx,0.0,0.56),25+s,0.2)])
    segment("Shin"+side, J["Knee"+side], [((0.27,0.27,0.22),(0.33*sx,-0.03,0.29),26+s,0)])
    segment("Foot"+side, J["Ankle"+side], [((0.3,0.36,0.11),(0.35*sx,-0.12,0.09),27+s,0)])

meshes = [o for o in coll.objects if o.type == "MESH"]
print(len(meshes), "segments,", sum(len(o.data.polygons) for o in meshes), "tris")

def export_glb(path):
    import os
    bpy.context.scene.frame_set(0)
    for o in bpy.context.view_layer.objects: o.select_set(False)
    for o in coll.objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True,
        export_animations=True, export_animation_mode="ACTIONS", export_force_sampling=True, export_anim_slide_to_zero=True,
        export_yup=True, export_cameras=False, export_lights=False, export_apply=False,
        export_normals=True, export_tangents=False, export_texcoords=False,
        export_materials="EXPORT", export_vertex_color="ACTIVE", export_all_vertex_colors=False,
        export_draco_mesh_compression_enable=False)
    print("glb", round(os.path.getsize(path) / 1024), "KB")
