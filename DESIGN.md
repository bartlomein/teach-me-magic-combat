---
name: Teach Me: Magic Combat
description: A printed quick-start rules sheet that teaches Magic combat; the board is its diagram.
colors:
  sheet: "#eef1f6"
  panel: "#ffffff"
  rule: "#ccd3e1"
  ink: "#121d38"
  ink-soft: "#46506a"
  spot: "#2a45c4"
  spot-tint: "#e7ebfb"
  hi: "#ffd84a"
  miss: "#c23a26"
  miss-tint: "#fbe8e4"
  ok: "#1f6b43"
  ok-tint: "#e6f2ea"
typography:
  display-hero:
    fontFamily: "Lexend, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 7vw, 4.75rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  display:
    fontFamily: "Lexend, system-ui, sans-serif"
    fontSize: "clamp(3.25rem, 9vw, 5rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Lexend, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 1.875rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Lexend, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 3vw, 1.625rem)"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Lexend, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: "Lexend, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Lexend, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.375
  caption:
    fontFamily: "Lexend, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
rounded:
  none: "0px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  2xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.spot}"
    textColor: "{colors.panel}"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "48px"
  button-secondary-hover:
    backgroundColor: "{colors.spot-tint}"
  button-on-spot-primary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.spot}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "48px"
  button-on-spot-ghost:
    backgroundColor: "{colors.spot}"
    textColor: "{colors.panel}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "48px"
  task-band:
    backgroundColor: "{colors.spot}"
    textColor: "{colors.panel}"
    padding: "24px"
  feedback-right:
    backgroundColor: "{colors.ok-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "14px"
  feedback-not-quite:
    backgroundColor: "{colors.miss-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "14px"
  feedback-note:
    backgroundColor: "{colors.spot-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "14px"
  step-tab:
    textColor: "{colors.ink-soft}"
    typography: "{typography.label}"
    height: "48px"
  step-tab-current:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
  card-pin:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
    rounded: "{rounded.full}"
    size: "26px"
  card-callout:
    backgroundColor: "{colors.hi}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "3px 8px"
  life-chip:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "2px 8px"
  motion-toggle-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
    rounded: "{rounded.none}"
---

# Design System: Teach Me: Magic Combat

## Overview

**Creative North Star: "The Printed Rules Sheet"**

The lesson reads like a quick-start rules sheet from a game box. Each step is a numbered panel framed in ink; the board is that panel's diagram, drawn as a game table with lettered pins and a printed red arrow. The learner reads one bold task, looks at the diagram, taps, and gets a one-line correction tied to the card it concerns.

The sheet is flat, cool white and ink. Two spot inks do all the signalling: blue for the task and for selection, red only for mistakes. A highlighter yellow marks what to look at. Density is low and type is large; Lexend carries all UI text because it reads easily for learners with dyslexia. The world refuses both the dark fantasy glow of the game's own marketing and the soft, rounded white edtech app.

The collectible cards are a separate, preserved layer: they keep their original dark, gilt-framed, foil-and-parallax design and their own fonts and inks. The sheet frames them; it never restyles them.

**Key Characteristics:**
- Cool white sheet, white panels, 3px ink frame rules, square corners.
- One spot blue for task, current step and selection; red only for mistakes, life and the attack arrow.
- Highlighter yellow for callouts, hints and selected text.
- Board drawn as a game table (tinted halves, faded edge paintings, card spots, a dashed center line) with lettered pins and a Key. Its caption is for screen readers only, since the task panel already says it on screen (Nov 25).
- Every state is an icon plus a word, never color alone.
- Flat: no gradients as fills, no glow, no blur, no glass in UI chrome.

## Colors

Two spot inks and a highlighter on a cool white sheet, printed in deep navy ink.

### Primary
- **Spot Blue** (spot): the task band behind each step's numeral and prompt, the current-step tab underline and number disc, selection rings on cards, the hover state of ink buttons, and the default focus ring. The one color that says "this is what you are doing now."
- **Spot Wash** (spot-tint): hover fill for outlined buttons and tabs, and the fill of "Note" feedback.

### Secondary
- **Misprint Red** (miss): mistakes ("Not quite" badge and word), the heart on life totals, and the printed attack arrow. Nothing else.
- **Misprint Wash** (miss-tint): fill of "Not quite" feedback.
- **Proof Green** (ok): the "Right" badge and word.
- **Proof Wash** (ok-tint): fill of "Right" feedback.

### Tertiary
- **Highlighter Yellow** (hi): callout labels on cards, the hint badge, the level-3 hint ring around cards and the "Attack them" button, `::selection`, and the focus ring on the blue task band.

### Neutral
- **Rules-Sheet Ink** (ink): all text, 3px panel frames, 2px control borders, primary buttons, pins, the 4px header rule. 15:1 on white.
- **Faded Ink** (ink-soft): secondary text, captions, inactive tabs, the footer. 8:1 on white.
- **Cool Sheet** (sheet): the page behind the panels; also the browser theme color.
- **Panel White** (panel): framed panels, the board paper, text on blue and ink.
- **Hairline** (rule): disabled control borders and the footer rule.

### Named Rules
**The Two Spot Inks Rule.** Blue means "the task / your choice"; red means "a mistake / damage". Red never decorates, never marks a creature as a target, and never stands in for blue.

**The Highlighter Rule.** Yellow is for callouts, hints and selected text. Its one other use is accessibility: the keyboard focus ring on the blue task band is yellow, because a white ring on white buttons on blue was invisible.

**The Icon-Plus-Word Rule.** Every state pairs a shape (icon, badge, ring, check) with a word. Color confirms; it never carries meaning alone.

## Typography

**Display Font:** Lexend (with system-ui, sans-serif)
**Body Font:** Lexend (with system-ui, sans-serif)
**Card faces only:** Atkinson Hyperlegible Next (card text, power/toughness) and Fraunces (card names). These belong to the card layer and never appear in UI chrome.

**Character:** One wide, open sans in weights 400 to 800, set big and heavy for the task and plain for everything else. Numbers use tabular figures.

### Hierarchy
- **Display hero** (800, clamp 2.75 to 4.75rem, 0.98): the welcome headline on the blue band, max about 12ch.
- **Display** (800, clamp 3.25 to 5rem, 1): the big step numeral on the task band.
- **Headline** (700, clamp 1.5 to 1.875rem, 1.15): the one task prompt, at most 8 words.
- **Title** (800, clamp 1.25 to 1.625rem): the page title in the header.
- **Body** (400, 17px, 1.55): base text. Feedback and hints sit at 16px.
- **Label** (600 to 700, 15px): step tabs, player names, life chips, the Key list.
- **Caption** (400, 14px): the Key heading, the Motion label, small notes under controls.

### Named Rules
**The One Face Rule.** All UI text is Lexend. Card fonts stay inside cards.

**The Short Line Rule.** Prompts are one bold line of at most 8 words; feedback is one line led by a bold tone word.

## Layout

The page is a single column capped at 74rem, 14px side padding on phones and 28px from 640px up, 24px between header, step strip and panel. The header sits on a 4px ink rule; the five-step strip sits on a 2px ink rule; the footer sits on a 1px hairline.

Each step is one framed panel. From 1024px it is a two-column grid: a 23rem left column (blue task band on top, then actions, feedback and the Key) and the board filling the right, separated by a 3px ink rule. Below 1024px the panel stacks: task band, board, then actions, feedback and Key directly under the board, with 3px ink rules between them. The welcome panel splits the same way at 768px (band left, a 25rem figure right).

On phones the current step tab takes the free width and shows its name; other tabs collapse to 48px number or lock discs. Board rows never wrap: cards shrink to share the row. Card callouts hide below 900px; pins stay.

Spacing steps are 8, 12, 16, 20, 24 and 40px. Touch targets are at least 44px; buttons and tabs are 48px tall.

### Routes and page transitions
Every screen has its own URL: `/` (welcome), `/learn/attacking`, `/learn/blocking`, `/learn/flying-and-reach`, `/learn/damage-wears-off`, `/learn/final-challenge`. Progress is saved in localStorage, so Back, refresh and links keep your place; a locked step's URL sends you to the step you're on.

Route changes use the browser's View Transitions through React `<ViewTransition>`:
- **Forward** (Start, Continue, Next, a later tab) slides the page in from the right; **back** (header title, an earlier tab) from the left. Old content leaves fast (240ms), new content arrives a bit slower (360ms fade, 680ms slide, ease-out expo); shared elements morph over 760ms.
- **Morphs:** the welcome screen's blue band becomes the step's task band, and Storm Hawk flies from the welcome figure onto the board (`task-band`, `card-stormHawk`).
- **Signature moment, "assemble" (Basics → Step 1):** the primer turns into the board. The band reshapes, then Ember Pup and both life boxes fly to their places a beat apart (`card-emberPup`, `life-opp`, `life-you`, staggered 70/140/200ms). The rest of the basics screen steps back (260ms), the board's frame fades in under them, and Bog Rat, Moss Golem and Storm Hawk are dealt in one by one (0.14s apart, a small drop and rotation). About 1 second total. Calm fades only; Off is instant.
- **Anchors:** the header and step tabs never move during a page change.
- **Motion modes:** Calm turns every page change into a plain fade; Off and the OS "reduce motion" setting swap instantly.
- The browser's own Back button swaps without an animation (the browser gives no direction); phones add their own swipe animation.

### Pins and the Key: linked highlighting
Pointing at a pinned card (hover or keyboard focus) or at its Key line lights up both: a highlighter sweeps across the Key line (0.34s, ease-out expo), the card gets a yellow ring, its pin grows outward, and the other pins and lines step back. No popups: the explanation lives in one visible place. On phones, tapping a pin scrolls its Key line into view and tapping a Key line scrolls to its card. Screen readers hear the note as part of the card's label. Calm mode fades the highlight instead of sweeping it; Off is instant.

Smoothness rules (each one fixed a visible jank):
- **One transition per navigation.** Every step is its own static page, so a screen arrives in one pass. A page that shows a loading placeholder first triggers a second transition when the real content swaps in.
- **One page wrapper for the whole app.** A single `<ViewTransition name="page">` in the root layout wraps every page, so each navigation is an *update* with one old and one new snapshot. Per-page enter/exit wrappers broke differently by browser (Next keeps visited pages alive in the background): Chrome animated only the old page, Safari only the new one, and nested wrappers stacked the old page on top in Safari.
- **Card backs are hidden unless flipped** (`visibility`, swapped at the flip's midpoint). Safari flattens 3D cards when snapshotting them and otherwise paints the back over the front.
- Checked in both engines: Chrome (frame timing) and WebKit, Safari's engine, via Playwright video.
- **Morphs sit on top** (`z-index` on `::view-transition-group(.morph)`). Otherwise the new page's snapshot paints its empty slot over them and they vanish just before the end.
- **Shape-changing morphs don't stretch text.** The task band morphs as a solid blue box; its old words fade out fast, then the new words fade in, at real size.
- **No filters on transition layers.** A blur keyframe made frames drop; plain opacity and transform only.
- **The footer has its own name** so it glides when page height changes instead of fading in over content.
- Verified by recording frames in headless Chrome: no frame over 33ms, one transition per navigation.

## Elevation & Depth

The UI chrome is flat. Depth comes from ink frame rules and fills, not shadows: panels sit on the sheet because of their 3px ink border and white fill. The only shadows in the product live on the card layer (a soft drop shadow under each card that follows its tilt). Small 2px white halos around pins and check badges are separation rings, not elevation.

### Named Rules
**The Flat Sheet Rule.** No gradients as fills, no glow, no blur, no glass in UI chrome.

## Shapes

Square corners everywhere in UI chrome: panels, buttons, tabs, life chips, feedback blocks, callouts, the Motion control. Circles are reserved for small marks: lettered pins, step number discs, feedback tone badges, the selection check. Frame weights are fixed: 4px for the header rule, 3px for panel frames and the rules inside a panel, 2px for controls and the step strip baseline. Cards keep their own rounded, gilt-framed silhouette.

## Components

### Buttons
Printed boxes: square, 2px bordered, bold Lexend, 48px tall, 20px side padding, icon and label with an 8px gap.
- **Shape:** square (0px).
- **Primary:** solid ink with white text; the one thing to do next. Hover turns border and fill spot blue.
- **Secondary:** white with an ink border and ink text. Hover fills with spot wash.
- **On the task band:** primary is white with blue text (hover spot wash); the other is a transparent box with an 80% white border and white text (hover 15% white).
- **Disabled:** hairline border, white fill, faded ink text with a line-through, so it reads as unavailable without relying on color. On the band, 60% opacity.
- **Focus:** a two-tone ring everywhere: 2px white gap then a 3px spot-blue outline at 2px offset. On the blue band the outline is highlighter yellow with a blue gap.
- **Read aloud:** a 44px square icon button, ink-bordered (white-bordered on the band), inverts on hover.

### Feedback
- **Style:** a tinted block (ok, miss or spot wash), square, 14px padding, a 24px round badge in the solid tone color holding a check, cross or info icon, then the text led by a bold tone word: "Right.", "Not quite.", "Note.". Always mounted in a polite live region; enters with a 4px rise.
- **Never** a colored side stripe.

### Hints
Up to three levels behind a Secondary "Hint" / "Another hint" button with a bulb icon. The hint text sits beside a 24px square yellow badge with the bulb. Level 2 shows the lettered pins; level 3 rings the relevant cards (and the "Attack them" button) in highlighter yellow.

### Navigation (step strip)
Five tabs on a 2px ink baseline, a 5-column grid from 768px. Each tab: a 26px disc (number, check when done, lock when locked) plus the step name at 15px semibold. Current: blue disc and a 5px spot-blue bar along the bottom. Done: ink disc with check. Locked: outline disc with lock, disabled. Hover fills with spot wash. On phones only the current tab keeps its name.

### Motion control
A segmented control (Full / Calm / Off) in a 2px ink box: semibold faded-ink labels, the checked option solid ink with white text, hover spot wash. Built on native radios.

### Task band (signature)
The blue head of every step panel: the giant step numeral, the read-aloud button, one headline prompt and one how-to line at 90% white. While explaining it also carries the turn timeline (Combat boxed in white with blue text) and the Watch / Try buttons.

### Finished step
Every step ends the same way, drawn by the shared step frame (Nov 25). The task band keeps the numeral and shows one headline: "Step complete" (the final challenge: "You win!"). The left column shows one Primary button, "Next: <next step>" (after the last step: "Next: Your report card"), with the feedback block right under it. No how-to line, no second button, no hints, no Key. To practice a finished step again, reopen it from the step tabs.

### Board diagram (signature)
A game table on plain white paper (no ruled lines since Nov 25). Each half has a faint tint and a faded edge painting: night mountains behind the opponent, warm hills behind you. Each side shows three card spots (dashed outlines when empty). The opponent's plate (avatar, name, square life chip) sits centered above their cards; yours sits centered below yours. When the player is the target, the opponent's life becomes a solid ink "Attack them" button. Between the rows, a dashed center line; the turn tag or the printed red attack arrow sits on it, centered. The board's caption is screen-reader only.

### Lettered pins and Key (signature)
A 26px ink disc with a white 13px extra-bold letter and a 2px white halo, pinned to a card's top-left corner (following the card when it is tapped). The Key under the actions repeats each letter with a one-line explanation. Pins show while explaining, from hint 2, and on any card a correction names. Highlighter callouts (yellow, 2px ink border, 13px bold) may label a card while explaining, desktop only. A creature that is new this turn carries the callout "New this turn" above the card (Step 1, Step 2, the quick check); from 901px it replaces the card's own status ribbon, below that the ribbon stays.

### Card selection
On top of the preserved card design: a selected card gets a white gap and a 4px spot-blue ring plus a blue round check badge; keyboard focus gets a similar 3px ring. Attackers step forward 4% and tapped cards turn 90 degrees, so state is shape as well as color.

## Do's and Don'ts

### Do:
- **Do** frame every step as one white panel with a 3px ink rule, and separate its regions with 3px ink rules.
- **Do** use spot blue for the task band, the current step and selection only.
- **Do** keep red for mistakes, life hearts and the printed attack arrow, and point the arrow at the opponent's life column.
- **Do** lead feedback with a round icon badge and a bold tone word (Right / Not quite / Note) on a tinted fill.
- **Do** use the yellow focus ring (with a blue gap) for anything focusable on the blue task band; the blue two-tone ring everywhere else.
- **Do** label board marks with lettered pins and explain them in a Key.
- **Do** keep touch targets at 44px or more and buttons at 48px.
- **Do** put actions, feedback and the Key directly under the board on phones.

### Don't:
- **Don't** round UI chrome corners; circles are only for pins, discs and badges.
- **Don't** use gradients as fills, glow, blur or glass in the UI.
- **Don't** mark feedback with a colored side stripe.
- **Don't** point the attack arrow at a creature.
- **Don't** use red or yellow decoratively.
- **Don't** set UI text in the card fonts, or restyle the card faces with UI tokens.
- **Don't** show a state with color alone.
