# The Moss Golem's performance, baked per frame onto the joint empties (run after build_golem.py).
#
# Golem space (Blender, Z up, the golem faces -Y): the card is the plane y = 0 and the floor is z = 0
# at the card's bottom edge. The card's art window spans x -0.7..0.7, z 0.89..1.94 (measured from the
# real card: window 219 px wide = 1.4 units). The golem starts behind the card (y > 0, seen through
# the window), punches through, leaps out to stand in front of the card, performs, and leaps back in.
#
# Rotations: +X pitch leans a body forward / swings a hanging limb backward; Z is yaw (+ turns toward
# the golem's left, screen right); Y is roll. Legs are solved with planar 2-bone IK so the feet stay
# planted wherever the pelvis goes.
import bpy, math
from mathutils import Vector

FPS = 30
d = math.radians

# ---------- timing ----------
# The beats below are written on the original 258-frame timeline. Two things change it:
#  1. GAP frames are inserted after frame GAP_AT for the point (at the lesson text, then at you).
#  2. Every beat is slowed by its own factor: the leaps barely (they'd go floaty), the performing more.
GAP_AT, GAP = 135, 76
OLD_END = 258
SLOW = [(0, 1.1), (36, 1.1), (70, 1.25), (GAP_AT, 1.0), (GAP_AT + GAP, 1.2), (222 + GAP, 1.1)]  # (from frame, factor), gap space

def gapped(f):  # original frame -> frame with the point inserted
    return f if f <= GAP_AT else f + GAP

def slowed(g):  # gapped frame -> final frame
    out = 0.0
    for i, (a, s) in enumerate(SLOW):
        b = SLOW[i + 1][0] if i + 1 < len(SLOW) else 1e9
        if g <= a: break
        out += (min(g, b) - a) * s
    return out

def T(f): return slowed(gapped(f))           # original frame -> final frame
def TP(r): return slowed(GAP_AT + r)         # frame r into the point -> final frame
END = round(T(OLD_END))

# ---------- tiny keyframe language: channel = [(frame, value, ease_into_this_key)] ----------
def ease(kind, u):
    if kind == "l": return u
    if kind == "i": return u * u * u                      # slow start, fast end (falls, slams)
    if kind == "o": return 1 - (1 - u) ** 3               # fast start, soft stop (strikes, launches)
    if kind == "o2": return 1 - (1 - u) ** 2
    if kind == "h": return 0.0                            # hold the previous value until the key
    return u * u * (3 - 2 * u) if kind == "s" else (4*u**3 if u < .5 else 1 - (-2*u + 2)**3 / 2)  # "io"

def ch(keys):
    keys = sorted(keys, key=lambda k: k[0])
    def at(f):
        if f <= keys[0][0]: return keys[0][1]
        for (f0, v0, _), (f1, v1, e) in zip(keys, keys[1:]):
            if f <= f1: return v0 + (v1 - v0) * ease(e, (f - f0) / (f1 - f0))
        return keys[-1][1]
    return at

def k(*pairs, e="io", point=()):
    """k((f, v), (f, v, "o"), ...) -> a channel on the final timeline. Frames are original frames;
    `point` keys are frames into the point beat. Without them the channel holds still through it."""
    keys = [(p[0], p[1], p[2] if len(p) > 2 else e) for p in pairs]
    hold = ch(keys)(GAP_AT)
    out = {}
    for f, v, ez in keys: out[round(T(f), 3)] = (v, ez)
    out[round(TP(0), 3)] = (hold, "io")
    for p in point: out[round(TP(p[0]), 3)] = (p[1], p[2] if len(p) > 2 else e)
    out[round(TP(GAP), 3)] = (hold, "io")
    return ch([(f, v, ez) for f, (v, ez) in out.items()])

ZERO = lambda f: 0.0

# ---------- the choreography ----------
# Beats: B0 stir 0-15 | B1 punch 15-36 | B2 crouch+leap out 36-70 | B3 land 70-96 | B4 look 96-135
#        POINT (inserted at 135, its own 0-66: turns and points at the lesson text on its right,
#        then swings round and points at you, with a nod) | B5 chest pound 135-165 | B6 ground pound 165-196 | B7 nod 196-222 | B8 leap back in 222-258
BEHIND, FRONT = 1.6, -2.2

root_y = k((0, BEHIND), (46, BEHIND), (70, FRONT, "o2"), (230, FRONT), (246, BEHIND, "io"), (OLD_END, BEHIND))
root_z = k((0, 0), (46, 0), (57, 0.55, "o2"), (70, 0, "i"), (230, 0), (238, 0.6, "o2"), (246, 0, "i"), (OLD_END, 0))
root_yaw = k((0, 0), (OLD_END, 0))

pel_drop = k((0, 0.24), (12, 0.2), (15, 0.22), (36, 0.22), (44, 0.36, "io"), (47, 0.12, "o"), (56, -0.02), (68, 0.0),
             (73, 0.34, "o"), (84, 0.34), (96, 0.0, "io"),
             (135, 0.0), (165, 0.04), (178, -0.04, "io"), (184, -0.04), (188, 0.3, "i"), (196, 0.3), (208, 0.0, "io"),
             (222, 0.0), (229, 0.34, "io"), (232, 0.1, "o"), (240, -0.02), (244, 0.0), (249, 0.3, "o"), (258, 0.24, "io"),
             point=[(14, 0.04), (33, 0.04), (45, 0.06), (55, 0.11, "o"), (63, 0.04), (75, 0.0)])
pel_fwd = k((0, 0), (OLD_END, 0))
pel_yaw = k((0, 0), (96, 0), (106, d(-8)), (118, d(6)), (130, 0), (OLD_END, 0),
            point=[(14, d(-9), "o"), (33, d(-9)), (45, d(4)), (70, 0)])

chest_pitch = k((0, d(22)), (8, d(18)), (15, d(20)), (19, d(8), "o"), (23, d(12), "o"), (30, d(14)), (36, d(22)),
                (44, d(36), "io"), (48, d(10), "o"), (58, d(-8)), (68, d(10)),
                (73, d(38), "o"), (84, d(38)), (96, d(4), "io"),
                (135, d(4)), (141, d(-10), "io"), (165, d(-8)), (180, d(-16), "io"), (184, d(-16)), (188, d(46), "i"), (196, d(46)),
                (208, d(4), "io"), (222, d(4)), (229, d(30), "io"), (233, d(8), "o"), (244, d(10)), (249, d(30), "o"), (258, d(22), "io"),
                point=[(14, d(0)), (33, d(0)), (45, d(10)), (55, d(16), "o"), (62, d(8)), (75, d(4))])
chest_yaw = k((0, 0), (15, 0), (19, d(-14), "io"), (23, d(26), "o"), (30, d(24)), (36, 0, "io"),
              (96, 0), (106, d(-14)), (118, d(-14)), (128, d(8)), (135, 0), (145, d(-6)), (151, d(6)), (157, d(-6)), (165, 0), (OLD_END, 0),
              point=[(6, d(-4)), (14, d(-22), "o"), (33, d(-20)), (45, d(10)), (65, d(8)), (75, 0)])
chest_roll = k((0, 0), (110, 0), (116, d(-4)), (124, d(-4)), (132, 0), (OLD_END, 0),
               point=[(14, d(-5)), (33, d(-5)), (45, 0)])

head_pitch = k((0, d(-18)), (8, d(-24)), (15, d(-20)), (36, d(-20)), (48, d(-12)), (58, d(0)), (73, d(-28), "o"), (84, d(-28)), (96, d(-4)),
               (135, d(-4)), (141, d(-20), "io"), (160, d(-20)), (165, d(-6)), (184, d(10)), (188, d(-30), "i"), (196, d(-30)),
               (208, d(-2), "io"), (210, d(-2)), (215, d(16), "io"), (222, d(-2), "io"), (229, d(-20)), (249, d(-24)), (258, d(-18)),
               point=[(12, d(-14)), (33, d(-12)), (44, d(-6)), (55, d(-10), "o"), (62, d(-6)), (75, d(-4))])
head_yaw = k((0, 0), (96, 0), (106, d(-35), "io"), (110, d(-35)), (118, d(20), "io"), (124, d(22)), (128, d(20)), (135, 0, "io"), (OLD_END, 0),
             point=[(4, 0), (12, d(-22)), (33, d(-20)), (44, d(4)), (75, 0)])
head_roll = k((0, 0), (110, 0), (116, d(14), "io"), (120, d(14)), (126, 0, "io"), (OLD_END, 0),
              point=[(12, d(-8)), (33, d(-8)), (44, d(7)), (65, d(7)), (75, 0)])

def arm_keys(side):
    """Shoulder pitch / abduction, elbow pitch, wrist pitch for one arm. R throws the punch."""
    R = side == "R"
    sp = [(0, d(-34)), (36, d(-34))]
    el = [(0, d(-30)), (36, d(-30))]
    if R:  # the punch: wind back, snap through the window, hold, pull back
        sp = [(0, d(-34)), (15, d(-34)), (19, d(25), "io"), (23, d(-122), "o"), (30, d(-116)), (36, d(-34), "io")]
        el = [(0, d(-30)), (15, d(-30)), (19, d(-70), "io"), (23, d(-4), "o"), (30, d(-8)), (36, d(-30), "io")]
    else:
        sp = [(0, d(-34)), (15, d(-34)), (23, d(-8), "io"), (36, d(-34))]
        el = [(0, d(-30)), (36, d(-30))]
    # leap out: swing back, then forward and up in flight, then fists down to the floor on landing
    sp += [(44, d(55), "io"), (50, d(-70), "o"), (60, d(-92)), (68, d(-40), "i"), (72, d(-58), "o"), (84, d(-58)), (96, d(-6), "io")]
    el += [(44, d(-10)), (50, d(-20)), (60, d(-40)), (68, d(-10)), (72, d(-6)), (84, d(-6)), (96, d(-16), "io")]
    # look: hang, sway a little
    sp += [(110, d(-2)), (124, d(-8)), (135, d(-6))]
    el += [(135, d(-16))]
    # chest pound: R hits at 147, L at 155 (fist to the chest = shoulder forward, elbow bent up)
    if R:
        sp += [(141, d(-50)), (144, d(-74), "io"), (147, d(-52), "o"), (150, d(-74), "io"), (158, d(-50)), (165, d(-20))]
        el += [(141, d(-110)), (144, d(-128), "io"), (147, d(-118), "o"), (150, d(-128)), (158, d(-110)), (165, d(-40))]
    else:
        sp += [(141, d(-50)), (149, d(-50)), (152, d(-76), "io"), (155, d(-52), "o"), (158, d(-72), "io"), (165, d(-20))]
        el += [(141, d(-110)), (149, d(-110)), (152, d(-128), "io"), (155, d(-118), "o"), (158, d(-124)), (165, d(-40))]
    # ground pound: both arms overhead, hold, slam
    sp += [(176, d(-168), "io"), (180, d(-172)), (184, d(-170)), (188, d(-58), "i"), (196, d(-58)), (208, d(-8), "io"), (222, d(-8))]
    el += [(176, d(-24)), (184, d(-24)), (188, d(-4), "i"), (196, d(-4)), (208, d(-18), "io"), (222, d(-18))]
    # leap back in: arms swing up and back, then hang on the knees again
    sp += [(229, d(40), "io"), (233, d(-60), "o"), (244, d(-40)), (249, d(-40)), (258, d(-34))]
    el += [(229, d(-10)), (233, d(-30)), (258, d(-30))]
    ab = [(0, d(10)), (19, d(14 if R else 10)), (23, d(4 if R else 14)), (36, d(10)), (50, d(18)), (60, d(26)), (72, d(14)), (96, d(6)),
          (141, d(14)), (165, d(8)), (176, d(16)), (188, d(20), "i"), (208, d(6)), (229, d(10)), (258, d(10))]
    wr = [(0, d(0)), (OLD_END, d(0))]
    # the point: R arm straight out to the side at the text (tapping twice), then swung round at you
    # (one jab); L fist rests at the hip
    if R:
        psp = [(4, d(-10)), (14, d(-24), "o"), (20, d(-30), "o"), (24, d(-22)), (28, d(-30), "o"), (33, d(-26)),
               (45, d(-80), "io"), (52, d(-76)), (55, d(-88), "o"), (60, d(-78)), (65, d(-80)), (75, d(-6), "io")]
        pab = [(4, d(20)), (14, d(108), "o"), (33, d(108)), (45, d(-8), "io"), (65, d(-8)), (75, d(6))]
        pel = [(4, d(-40)), (14, d(-4), "o"), (33, d(-6)), (39, d(-26)), (45, d(-4), "o"), (65, d(-4)), (75, d(-16))]
    else:
        psp = [(10, d(-16)), (65, d(-16)), (75, d(-6))]
        pab = [(10, d(20)), (65, d(20)), (75, d(6))]
        pel = [(10, d(-55)), (65, d(-55)), (75, d(-16))]
    return k(*sp, point=psp), k(*ab, point=pab), k(*el, point=pel), k(*wr)

# the pointing finger: folded up into the fist, out only while pointing
finger = k((0, d(150)), (OLD_END, d(150)), point=[(8, d(150)), (14, 0, "o"), (67, 0), (73, d(150))])

ARMS = {s: arm_keys(s) for s in ("L", "R")}

# feet: lift (dz) and slide (dy) relative to the root; tucked in the air
def feet(side):
    lead = 0 if side == "L" else 2
    dz = k((0, 0), (47, 0), (52, 0.32, "o"), (62, 0.24), (69, 0.0, "i"), (230, 0), (234, 0.3, "o"), (241, 0.22), (246, 0, "i"), (OLD_END, 0))
    dy = k((0, 0), (47, 0), (55, 0.12), (69, 0.0), (230, 0), (236, -0.1), (246, 0), (OLD_END, 0))
    return dz, dy
FEET = {s: feet(s) for s in ("L", "R")}

def breath(f):  # slow breathing; quieter while striking
    return math.sin(f / FPS * 2 * math.pi / 2.6)

# ---------- bake ----------
O = bpy.data.objects
J = {n: O[n] for n in ["Root", "Pelvis", "Chest", "Head", "ShoulderL", "ShoulderR", "ElbowL", "ElbowR", "WristL", "WristR",
                       "HipL", "HipR", "KneeL", "KneeR", "AnkleL", "AnkleR"]}
REST = {n: o.location.copy() for n, o in J.items()}
for o in J.values():
    o.rotation_mode = "XYZ"; o.animation_data_clear()

def world_rest(n):
    o = J[n]; p = Vector(REST[n])
    while o.parent: o = o.parent; p += REST[o.name] if o.name in REST else o.location
    return p

FINGER = O.get("FingerR")
if FINGER: FINGER.rotation_mode = "XYZ"; FINGER.animation_data_clear()
HIP = {s: world_rest("Hip" + s) for s in "LR"}
KNEE = {s: world_rest("Knee" + s) for s in "LR"}
ANK = {s: world_rest("Ankle" + s) for s in "LR"}

def alpha(v):  # angle of a (dy, dz) limb vector from straight down, + toward +Y (backward)
    return math.atan2(v[0], -v[1])

def leg_ik(s, hip_yz, ank_yz):
    """Hip and knee X rotations that put the ankle at ank_yz, knee bending forward. Returns (hip, knee, ankle)."""
    t0 = (KNEE[s].y - HIP[s].y, KNEE[s].z - HIP[s].z); s0 = (ANK[s].y - KNEE[s].y, ANK[s].z - KNEE[s].z)
    L1 = math.hypot(*t0); L2 = math.hypot(*s0)
    dy = ank_yz[0] - hip_yz[0]; dz = ank_yz[1] - hip_yz[1]
    D = min(math.hypot(dy, dz), L1 + L2 - 1e-4)
    base = math.atan2(dy, -dz)
    cos_in = (L1*L1 + D*D - L2*L2) / (2 * L1 * D)
    inner = math.acos(max(-1, min(1, cos_in)))
    a1 = base - inner                      # thigh swings forward (-Y) so the knee points forward
    knee_pos = (hip_yz[0] + L1 * math.sin(a1), hip_yz[1] - L1 * math.cos(a1))
    a2 = math.atan2(ank_yz[0] - knee_pos[0], -(ank_yz[1] - knee_pos[1]))
    hip = a1 - alpha(t0)
    knee = a2 - alpha(s0) - hip
    return hip, knee, -(hip + knee)

def key(o, f):
    o.keyframe_insert("location", frame=f); o.keyframe_insert("rotation_euler", frame=f)

sc = bpy.context.scene
sc.render.fps = FPS; sc.frame_start = 0; sc.frame_end = END
for f in range(0, END + 1):
    b = breath(f)
    # Root: travel and hop. Pelvis: crouch (drop) and breathing.
    J["Root"].location = (0, root_y(f), root_z(f)); J["Root"].rotation_euler = (0, 0, root_yaw(f))
    drop = pel_drop(f) + 0.012 * b
    J["Pelvis"].location = REST["Pelvis"] + Vector((0, pel_fwd(f), -drop))
    J["Pelvis"].rotation_euler = (0, 0, pel_yaw(f))
    J["Chest"].location = REST["Chest"]
    J["Chest"].rotation_euler = (chest_pitch(f) + d(1.2) * b, chest_roll(f), chest_yaw(f))
    J["Head"].location = REST["Head"]
    # the head trails the body by 3 frames on big moves (weight), and counters breathing
    J["Head"].rotation_euler = (head_pitch(f - 1) - d(1.0) * b, head_roll(f - 2), head_yaw(f - 1))
    for s in "LR":
        sx = 1 if s == "L" else -1
        sp, ab, el, wr = ARMS[s]
        lag = 2  # forearms and fists follow the shoulder a beat late: heavy stone
        J["Shoulder" + s].location = REST["Shoulder" + s]
        J["Shoulder" + s].rotation_euler = (sp(f) + d(1.5) * b, -sx * ab(f), 0)
        J["Elbow" + s].location = REST["Elbow" + s]
        J["Elbow" + s].rotation_euler = (el(f - lag * 0.5), 0, 0)
        J["Wrist" + s].location = REST["Wrist" + s]
        J["Wrist" + s].rotation_euler = (wr(f), 0, 0)
        # legs: IK from the moved hip to the (possibly lifted) foot, in the root's frame
        hip_yz = (HIP[s].y + pel_fwd(f), HIP[s].z - drop)
        fz, fy = FEET[s]
        ank_yz = (ANK[s].y + fy(f), ANK[s].z + fz(f))
        h, kn, an = leg_ik(s, hip_yz, ank_yz)
        J["Hip" + s].location = REST["Hip" + s]; J["Hip" + s].rotation_euler = (h, 0, 0)
        J["Knee" + s].location = REST["Knee" + s]; J["Knee" + s].rotation_euler = (kn, 0, 0)
        J["Ankle" + s].location = REST["Ankle" + s]; J["Ankle" + s].rotation_euler = (an, 0, 0)
    if FINGER: FINGER.rotation_euler = (finger(f), 0, 0); key(FINGER, f)
    for o in J.values(): key(o, f)

# linear between baked frames (every frame is a key)
for o in J.values():
    ad = o.animation_data
    if ad and ad.action:
        try:
            for fc in ad.action.fcurves:
                for kp in fc.keyframe_points: kp.interpolation = "LINEAR"
        except AttributeError:
            pass  # slotted actions (Blender 5): channelbags; sampling at export makes this moot
sc.frame_set(0)
print("baked", END + 1, "frames")
EVENTS = {n: round(T(f)) for n, f in dict(flare=8, punch=22, launch=47, out=52, land=70, roar=141, pound1=147, pound2=155,
          slam=188, hop=231, home=246, look1=110, look2=124, roarEnd=160, roarOut=165).items()}
EVENTS.update(pointText=round(TP(14)), pointYou=round(TP(55)))
print("events", EVENTS, "end", END)

def export_anim(path):
    import os
    sc.frame_set(0)
    for o in bpy.context.view_layer.objects: o.select_set(False)
    for o in bpy.data.collections["Golem"].objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True,
        export_animations=True, export_animation_mode="SCENE", export_force_sampling=True, export_frame_range=True,
        export_anim_slide_to_zero=False, export_optimize_animation_size=True,
        export_yup=True, export_cameras=False, export_lights=False, export_apply=False,
        export_normals=False, export_tangents=False, export_texcoords=False,
        export_materials="EXPORT", export_vertex_color="ACTIVE", export_all_vertex_colors=False,
        export_draco_mesh_compression_enable=False)
    print("glb", round(os.path.getsize(path) / 1024), "KB")
