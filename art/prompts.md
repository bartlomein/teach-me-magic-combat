# Card art prompts

All art is generated with an image model (via Codex). The style block is shared by every card so the set looks consistent.
No real games, companies or artists are named in any prompt.

## Shared style block

Hand-painted gouache illustration with confident, visible brushstrokes and slightly rough paper grain. Composition borrows from Japanese woodblock prints: bold silhouette, strong diagonal, generous negative space, flat layered planes of color. Limited palette of 5 colors: deep night navy (#0d1530), dusk lavender (#c9c3f0), storm violet (#5a3f8f), warm gold (#f6cf6a), pale mist (#f1f3fb). One clear light source, soft rim light, no lens flare. Shapes are simplified and graphic, not photoreal. Edges are mostly crisp, with a few lost edges where forms meet the sky. Feels like a printed storybook plate, calm but magical.

**Contrast rule (added after Storm Hawk v1):** background and creature must differ in value. Backgrounds are dark (mostly night navy, at most 25% lavender) and creatures are lighter, rim-lit in gold. Squint test: the creature's silhouette must read at a glance.

Avoid: photorealism, 3D render look, glossy plastic shading, airbrushed skin-smooth gradients, over-detailed feathers or fur, HDR glow everywhere, centered symmetrical pose, bokeh, text, letters, logos, frames, borders, watermarks, signatures, extra limbs, warped anatomy.

## Storm Hawk (3/2, Flying)

**Layer 1: background** (`storm-hawk-bg.png`, 1280×1024, 5:4)
> [Shared style block] A high cliff-top sky at dusk during a gathering storm. Huge stacked thunderheads drawn as flat, layered woodblock shapes in lavender and violet. A single thin gold lightning fork far in the distance on the right. Lower third: jagged dark navy mountain ridges fading into mist. Upper left is calmer, emptier sky so a creature can sit there later. No animals or figures in this image.

**Layer 1 v2: background** (replaces v1; v1 was too close in color to the hawk)
> [Shared style block] Night storm over high mountains. The sky is mostly deep night navy (#0d1530) shading to a dark indigo near the horizon. Heavy thunderheads as flat, layered woodblock shapes in dark storm violet (#5a3f8f), lit only along their top edges by thin lavender rim light. One thin gold lightning fork far in the distance on the right, small and quiet. Lower third: near-black navy ridges with a soft band of pale mist between them. Overall the image is dark and low-key, about 75% dark values, so a pale lavender and gold creature placed over it stands out strongly. Upper left is calm, empty dark sky. No animals or figures.

**Layer 2: creature** (`storm-hawk-fg.png`, 1280×1024, 5:4, **transparent background**)
> [Shared style block] A fierce hawk mid-dive along a strong diagonal from upper left to lower right, wings swept back in a sharp crescent, talons forward. Feathers simplified into a few bold painted shapes, with gold catching the leading edge of the wings like rim light from lightning. Small crackles of gold static trail off the wingtips. The eye is a single bright gold point. The hawk fills about 60% of the frame, cropped slightly by the right edge for energy. Isolated on a fully transparent background, clean alpha edges, no ground, no sky, no shadow.


## G6: the rest of the set (Codex built-in image_gen)

**Palette rule (G6):** each card has its own color world. Shared across the set: gouache woodblock style, dark backgrounds, lighter creatures, and gold rim light. Purple belongs to Night Bat only. (The first G6 draft forced the old navy/lavender palette on every card, so everything came out purple.)

Files go in `public/art/`. Each card needs two layers: `<card>-bg.png` (opaque) and `<card>-fg.png` (transparent).

### Ember Pup

Palette: deep charcoal brown (#2a1a14), burnt umber (#6b3a22), ember orange (#ff9a62), flame red-orange (#e0552b), warm cream (#f6e3c4)

**Background** (`ember-pup-bg.png`)
> A forest clearing at night lit by a low campfire glow from the lower left. Charcoal-brown tree trunks as flat vertical planes, the ground a dark umber slope, a few drifting ember sparks in orange. Everything warm-toned; the darkness is brown-black, not blue or purple. The center and right stay dark and empty so a creature can sit there later.

**Creature** (`ember-pup-fg.png`, transparent)
> A small, brave fox-like hound pup with a fluffy tail whose tip flickers into ember flames. Crouched low, front paws planted, head up and alert, ready to pounce, three-quarter view facing right. Fur in warm cream and ember orange, simplified into a few bold painted shapes, flame red-orange glowing at the tail tip, ear tips and paws, gold rim light along the back. The pup fills about 55% of the frame, slightly left of center, body on a low diagonal. Anatomically coherent single animal with four legs.

### Moss Golem

Palette: deep forest green-black (#14241c), slate grey stone (#5d6670), pale stone (#b9bfc2), moss green (#7fbf6a), soft fern green (#bfe3a6)

**Background** (`moss-golem-bg.png`)
> Ancient stone ruins deep in a forest at night: a broken arch and fallen pillars as flat, layered woodblock shapes in dark green-black and slate grey, patches of moss in green. Soft pale mist low on the ground. Cool moonlight from the upper left. The center stays dark and open so a large figure can stand there later.

**Creature** (`moss-golem-fg.png`, transparent)
> A hulking stone golem built from stacked, rounded boulders, shoulders much wider than its head, thick moss and small ferns growing over its shoulders and back. It stands firmly planted in a guarding pose, both heavy fists low, facing slightly left. Stone in pale grey so it is lighter than the background, moss in bright green, gold rim light on the top edges, two small gold eye points. The golem fills about 65% of the frame, slightly cropped at the bottom, standing on a gentle diagonal. Heavy, solid, protective silhouette. Two arms, two legs.

### Thorn Boar

Palette: midnight blue (#101c33), cold steel blue (#4f78a8), pale ice blue (#8fb7e8), bramble brown (#4a3426), bone white (#ece6d8)

**Background** (`thorn-boar-bg.png`)
> A steep bramble-covered hillside under a big pale moon in the upper right. Thorny bramble shapes as dark brown woodblock silhouettes across the lower third, cold steel-blue highlights on the thorns. Sky in midnight and steel blue. The left half stays calm and dark so a charging creature can sit there later.

**Creature** (`thorn-boar-fg.png`, transparent)
> A wild boar charging hard along a diagonal from upper left to lower right, head low, short curved bone-white tusks forward. A ridge of sharp thorny bramble spikes grows along its spine instead of bristles. Body in pale ice-blue and steel tones lit by cold moonlight, the thorns bramble brown, gold rim light on the tusks and thorn tips, one small fierce gold eye. The boar fills about 60% of the frame, cropped slightly by the right edge for energy. Strong, heavy, forward-driving silhouette. Anatomically coherent single animal with four legs.

### Sky Finch

Palette: dawn navy (#13234a), sky blue (#4f86c6), pale morning blue (#bcd6f0), butter yellow (#ffe9a8), warm sunrise gold (#f6cf6a)

**Background** (`sky-finch-bg.png`)
> A high, windy sky just before dawn. Deep dawn navy at the top shading to sky blue, with long thin streaks of wind-blown cloud as flat woodblock bands in blue and pale morning blue, and a butter-yellow line of first light along the bottom edge. Lots of empty sky in the center. No ground except a tiny distant treeline at the bottom.

**Creature** (`sky-finch-fg.png`, transparent)
> A tiny, quick finch in flight, wings spread wide in a sharp V, tail fanned, darting upward along a diagonal from lower left to upper right. Chest in bright butter yellow, wings in pale morning blue and white, gold rim light on the wing edges, one bright dark eye with a gold glint. Simple, bold shapes, a few painted speed streaks trailing behind it. The finch fills about 45% of the frame (it is a small creature, so leave generous negative space), positioned slightly right of center. Clear, crisp silhouette. Anatomically coherent single bird with two wings.

### Vine Archer

Palette: deep forest night green (#0f2019), pine green (#2f5a46), leaf green (#8fcf72), bark brown (#5a3e2b), pale moss (#d6ebc4)

**Background** (`vine-archer-bg.png`)
> Looking up through tall forest treetops at night: dark green-black trunks rise from the bottom edge and lean toward the center, their canopy edges framing a patch of open dark green-blue sky at the top. Hanging vines in pine and leaf green. A few small gold stars. The lower center stays clear for a standing figure later.

**Creature** (`vine-archer-fg.png`, transparent)
> An elf archer drawing a longbow made of living vine with small leaves, aiming high toward the upper right at something in the sky. Seen from a low angle, cloak and hood in leaf green with bark-brown leather, face mostly in shadow under the hood, gold rim light along the bow and arrowhead. The arrow points sharply up and right. Calm, focused stance. The archer fills about 60% of the frame, the strong diagonal running from the planted back foot (lower left) to the arrow tip (upper right). One person with two arms holding one bow and one arrow. Not a real or famous character.

### Night Bat

Palette: near-black indigo (#120f26), deep violet (#3d2c6b), dusk lavender (#a99be8), pale moon silver (#e6e4f2)

**Background** (`night-bat-bg.png`)
> The mouth of a rocky cave at night, seen from inside. Jagged near-black rock edges frame the picture like a woodblock cut-out, opening onto a deep violet night sky with a thin crescent moon in the upper left. A few faint stars. The open sky area stays mostly empty so a flying creature can sit there later.

**Creature** (`night-bat-fg.png`, transparent)
> A bat swooping out of the dark with wings fully spread wide, wing membranes stretched between long fingers, ears tall and pointed, mouth slightly open. Body and wings in dusk lavender and pale moon silver, lighter than the sky behind, gold rim light along the wing edges, two small gold eyes. The bat fills about 60% of the frame, swooping along a diagonal toward the lower right, one wing cropped slightly by the frame edge. Anatomically coherent single bat with two wings.

### Cliff Spider

Palette: charcoal rock (#1c1f24), cool slate (#47505c), fog grey (#9aa3ad), pale silver silk (#dfe5ec), muted teal shadow (#2e4a4f)

**Background** (`cliff-spider-bg.png`)
> A narrow gap between two steep cliff faces at night, seen from the side. Cliffs as charcoal and slate flat woodblock planes on the left and right edges, cool teal in the deepest shadows. Fog rising from far below. A few long pale silver strands of web stretched across the gap catch the moonlight. The middle of the gap stays dark so a creature can sit there later.

**Creature** (`cliff-spider-fg.png`, transparent)
> A large spider hanging in the center of its web, facing up toward the sky as if watching for flyers above. Eight long legs spread wide and evenly in a radial, graphic pose. Body in fog grey and pale silver, lighter than the background, gold rim light on the leg joints, a cluster of small gold eyes. A few web strands around it in pale silver. The spider and its web fill about 60% of the frame, slightly off-center. Exactly eight legs, coherent anatomy. Calm and watchful, not gory or horror-styled.

### Storm Hawk v3 (G6 palette)

The first Storm Hawk used the old navy, lavender and violet palette, so it looked like Night Bat. v3 gives it its own colors: storm slate and steel blue, white feathers, gold lightning. Same pose, so it fits the card's break-out layout.

Palette: storm slate (#1a2633), deep steel blue (#2f4d6b), rain grey-blue (#8aa3b8), white feather (#f2f4f6), lightning gold (#f6cf6a)

**Background** (`storm-hawk-bg-v3.png`)
> Night storm over high mountains. The sky is dark storm slate shading to deep steel blue near the horizon through flat painted tonal planes. Heavy thunderheads as flat, layered woodblock shapes in steel blue, lit only along their top edges by thin rain grey-blue rim light. Slanted streaks of rain in the far distance. One thin gold lightning fork far in the distance on the right, small and quiet: the only light source. Lower third: near-black slate ridges with a soft band of grey mist between them. Upper left is calm, empty dark sky. No animals or figures.

**Creature** (`storm-hawk-fg-v2.png`, transparent)
> A fierce hawk mid-dive along a strong diagonal from upper left to lower right, wings swept back in a sharp crescent, talons forward. Feathers in white and rain grey-blue with steel-blue barring, simplified into a few bold painted shapes, so the bird is much lighter than a dark storm sky. Gold catches the leading edge of the wings like rim light from lightning. Small crackles of gold static trail off the wingtips. The eye is a single bright gold point, hooked beak in gold. The hawk fills about 60% of the frame, cropped slightly by the right edge for energy. Strong asymmetric silhouette, head and talons directed toward lower right, two wings swept back toward upper left. Keep the talons above the bottom 10% of the frame. Anatomically coherent single hawk with two wings and two legs.


## Player avatars

Shown small in a circle next to each player's life total, so you can tell sides apart without reading. Animal characters, not people, to match the cards and keep anyone from feeling it's not them. Colors follow the card frames: gold for you, silver-blue for the opponent.

**You** (`avatar-you.png`): a friendly owl in a navy cloak with gold trim, calm and encouraging, on deep navy with a warm glow.

**Opponent** (`avatar-opp.png`): a sly but playful crow in a slate cloak with silver trim, a friendly rival, on dark slate with a cool glow.
