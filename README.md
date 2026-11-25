# Teach Me: Magic combat

An interactive lesson on how combat works in Magic: The Gathering. It takes about 10 minutes and you don't need any cards.

I picked combat because it's a real decision with real rules, and beginners get the same things wrong over and over. That makes it a good fit for practice and feedback instead of reading.

## Run it

You need Node 22 or newer.

```bash
npm ci
npm run dev
```

Then open http://localhost:3000.

Other commands:

```bash
npm test        # 80 unit tests (rules engine, lesson flow, report card)
npm run lint
npm run build
```

There are no environment variables and no backend. Progress is saved in the browser.

## What's in it

You start by saying if you've played before.

- **Never played** gets a short "What's the game?" screen first.
- **Played a bit** gets a 3 question quick check. Each right answer skips that step.

Then there are 5 steps: Attacking, Blocking, Flying + reach, Damage wears off, and a Final challenge. The first three show a short demo, then you try it on a real board. Wrong answers get feedback that names the exact mistake. If you miss twice, you get an easier version of the same step.

At the end there's a report card. It shows how each step went, your mistakes grouped by type, and what to practice. If you go back and practice a step, the report shows that too.

## How it lines up with Marker

I read through Marker's site and tried to build a small version of the same ideas.

- Adapts when you struggle. Two misses gets you a lighter task.
- Doesn't test what you already know. The quick check skips steps.
- Corrective feedback. Every wrong answer is tied to a beginner myth (M1 to M10 in the code).
- Error analysis. The report groups mistakes by myth, with strengths and things to practice.
- Less text. Pictures, short sentences, a read-aloud button, tap instead of type.

## Time spent

About 14 hours over two days, so well over the 4 hours. I went in knowing I'd go over. Most of the extra time went into the card art, a full redesign of the look halfway through, rebuilding the final challenge, and testing on phones and Safari.

## Tools

- Next.js 16, React 19, TypeScript, Tailwind CSS 4
- Motion for animations, plus the View Transitions API between pages
- three.js and Blender for the Moss Golem stepping out of its card on the welcome page (the Blender file and build scripts are in [art/source/](art/source/))
- Vitest for tests
- Claude Code for planning, research, writing code with me, and testing (Playwright runs in Chrome and Safari, axe, Lighthouse)
- Codex image generation for the card art and avatars. The prompts are in [art/prompts.md](art/prompts.md).

The rules were checked against the Magic Comprehensive Rules (effective Nov 6, 2026). All the cards are made up.

## Tradeoffs

- **One topic, deep.** Combat only, instead of a light pass over six keywords. Flying and reach are the only keywords.
- **Tap, don't drag.** Tap your creature, then tap what it blocks. It works the same with a mouse, a phone, or a keyboard.
- **A real rules engine, scripted boards.** Every answer is checked by pure functions with tests, so the lesson can't call an illegal play right. The boards themselves are set up by hand instead of being a full game.
- **Flat cards, one 3D moment.** The cards are CSS with painted art, because it's lighter on phones and easier to make accessible. The one 3D moment is on the welcome page: the Moss Golem punches through its card, climbs out, points at the lesson text and then at you, pounds its chest and the ground, and jumps back in. The card's art window works like a real window, so you only see the golem through it while it's behind the card. I built the golem in Blender with Python scripts: chiselled boulders with moss and ferns, hung on a joint rig, with one baked animation (311 KB GLB). An earlier version had the Storm Hawk cut out of its painting and leaping out, but it looked flat, so I replaced it. I tried an AI image-to-3D generator too, but it was out of credits. It loads only after the page is ready, plays each time the page loads, and is skipped in Calm and Off motion, on data saver, and on low-memory phones. It runs about 13 seconds, so there's a Skip button and Esc works. The painting and the 3D golem never line up exactly, so they swap under a short gold flash in the art window instead of cross-fading.
- **Rebuilt the final challenge.** The first version had you attack first and guess what the opponent would do next. That was too much hidden info for a beginner. Now they attack first, and everything you need for your turn is on the board.
- **Cut the check-in.** Marker asks students how tired they felt and how much they enjoyed it. I built that, but here the answer didn't do anything for the learner, so I took it out.

## With more time

- Test it with real beginners and watch where they get stuck.
- More keywords: first strike, trample, deathtouch.
- Lesson 2 (combat tricks). The report card already has a short demo of it.
- A recorded voice instead of the browser's read-aloud.
- Move all the text into one file so it can be translated.
- Animate attackers stepping into the middle of the table.

## Known limitations

- Progress only lives in this browser. Clearing site data starts you over.
- Step pages wait for saved progress before they show, so locked steps stay locked. On a slow phone that's about 3.7 seconds (Lighthouse mobile score 90). Desktop scores 100.
- The opponent is predictable on purpose, so the final challenge has one clear answer. It doesn't play like a real person.
- Read-aloud uses the browser's built-in speech, so the voice depends on the device.
- I checked phone sizes in Chrome and Safari on my laptop, not on a real phone.

## Checks I ran

- axe: 0 issues on every page and state, desktop and phone.
- Keyboard only: the whole lesson can be finished with Tab, Enter and Space.
- Lighthouse: Accessibility, Best Practices and SEO 100. Performance 100 on desktop, 90 to 97 on mobile.
- Reduced motion: the lesson starts in Calm mode. There's also a Full / Calm / Off switch in the header.

## About the commit history

I committed in steps at the end of the build. Each commit's date matches when that part was built, and each one holds the finished version of its files. Early commits may not build on their own.

## Fan content

Teach Me: Magic Combat is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
