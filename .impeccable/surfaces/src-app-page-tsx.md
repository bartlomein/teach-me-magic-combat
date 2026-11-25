---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/components/lesson"]
---

# Surface: the lesson (/)

Mode: Operate (a learner completes play tasks). Code-led.
Audience: MTG beginners (often on a phone) and Marker's reviewers. Job: play a board, get one-line corrective feedback, move on.
Constraints: cards stay as designed; 44px targets; icon + word states; Full/Calm/Off motion; text twin for animations.

## Direction contract

THESIS: The lesson is a printed quick-start rules sheet: each step is a numbered panel, the board is its diagram. Refuses the dark fantasy glow and the rounded white edtech app.

OWN-WORLD: Cool white sheet (#eef1f6) and white panels framed by 3px ink (#121d38) rules. One spot blue (#2a45c4) for the task band, current step and selection. Highlighter yellow (#ffd84a) only for callouts and hints. Red (#d43d2a) only for mistakes and the attack arrow. Lexend everywhere in the UI (weights 400–800), tabular figures. Square corners. No gradients, glow, blur or glass.

STORY: The learner reads one bold task, looks at the diagram, taps, and gets a one-line correction tied to the card it concerns.

FIRST VIEWPORT: Header (title + Motion segmented control) over a 5-tab step strip. Below, one framed panel: left column a blue task band (big step numeral, task in ≤8 words, one how-to line), then actions, feedback and the Key; right, the board on ruled-line paper with a Fig. caption. Phone: band, board, then actions/feedback/key.

FORM: Rules Sheet (Impeccable's pick, ranked 1 of 7), combined with its callout-diagram variation at the user's request. seed:3a4ef18134541f88

SIGNATURE: Lettered pins (A, B) printed on cards, explained in a Key, like a rules diagram; a red printed arrow shows who attacks whom.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
