# Teach Me: Magic combat

An interactive lesson on how combat works in Magic: The Gathering. It takes about 10 minutes and you don't need any cards.

**Live:** https://teach-me-magic-combat.vercel.app

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
npm test        # 100 tests: rules engine, lesson flow, report card, and every step clicked through
npm run lint
npm run build
```

There are no environment variables and no backend. Progress is saved in the browser.

## What's in it

You start by saying if you've played before.

- **Never played** gets a short "What's the game?" screen first.
- **Played a bit** gets a 3 question quick check. Each right answer skips that step.

Then there are 5 steps: Attacking, Blocking, Flying + reach, Damage wears off, and a Final challenge. The first three show a short demo, then you try it on a real board. Wrong answers get feedback that names the exact mistake. Miss twice on one of those three and you get an easier version of the same step. Damage wears off starts with a prediction that isn't scored. In the final challenge, two misses turn on extra help.

At the end there's a report card. It shows how each step went, your mistakes grouped by type, and what to practice. If you go back and practice a step, the report shows that too.

## How it's built

- `src/lib/rules` is the rules engine. It's pure functions for attacking, blocking, damage and dying, with the rule numbers in the code. Every answer in the lesson is checked by running it through the engine, so the UI can't call an illegal play right.
- `src/lib/lesson` is the lesson. Each step's boards and checks live in `steps.ts`. Progress is a pure reducer in `lesson.ts`. A small store in `store.ts` saves it in the browser and keeps tabs in sync.
- `src/components/lesson` is the screens. What's on the board right now (the selected card, damage, the phase) stays local to each step. Only lesson events like a miss, a hint or a finished step go to the store.
- Shared hooks in `useStep.tsx` give every step the same phases, feedback, focus handling and animations that stop cleanly when you leave.
- Tests: the engine, the reducer and the report card are plain unit tests. Each step is also clicked through with Testing Library and the real reducer.

A good place to start reading is `src/lib/rules/engine.ts`, then `src/lib/lesson/lesson.ts`, then `src/components/lesson/StepBlock.tsx`.

## How it lines up with Marker

I read through Marker's site and tried to build a small version of the same ideas.

- Adapts when you struggle. Two misses gets you a lighter task.
- Doesn't test what you already know. The quick check skips steps.
- Corrective feedback. Every rules mistake is tied to a beginner myth (eight of them). Strategy misses, like holding back a creature that could attack, are logged without one.
- Error analysis. The report groups mistakes by myth, with strengths and things to practice.
- Less text. Pictures, short sentences, a read-aloud button, tap instead of type.

## Time spent

About 14 hours over two days, so well over the 4 hours. I went in knowing I'd go over. Most of the extra time went into the card art, a full redesign of the look halfway through, rebuilding the final challenge, and testing on phones and Safari.

## Tools

- Next.js 16, React 19, TypeScript, Tailwind CSS 4
- Motion for animations, plus the View Transitions API between pages
- three.js and Blender for the Moss Golem stepping out of its card on the welcome page (the Blender file and build scripts are in [art/source/](art/source/))
- Vitest and Testing Library for tests
- Claude Code for planning, research, writing code with me, and testing (Playwright runs in Chrome and Safari, axe, Lighthouse)
- Codex image generation for the card art and avatars.

The rules were checked against the Magic Comprehensive Rules (effective Nov 6, 2026). All the cards are made up.

## Tradeoffs

- **One topic, deep.** Combat only, instead of a light pass over six keywords. Flying and reach are the only keywords.
- **Tap, don't drag.** Tap your creature, then tap what it blocks. It works the same with a mouse, a phone, or a keyboard.
- **A real rules engine, scripted boards.** Every answer is checked by pure functions with tests, so the lesson can't call an illegal play right. The boards themselves are set up by hand instead of being a full game.
- **Flat cards, one 3D moment.** The cards are CSS with painted art, because it's lighter on phones and easier to make accessible. The one 3D moment is the Moss Golem climbing out of its card on the welcome page. I built it in Blender with Python scripts (in [art/source/](art/source/)). It only loads on capable devices, is skipped in Calm and Off motion, and has a Skip button.
- **Rebuilt the final challenge.** The first version had you attack first and guess what the opponent would do next. That was too much hidden info for a beginner. Now they attack first, and everything you need for your turn is on the board.
- **Cut the check-in.** Marker asks students how tired they felt and how much they enjoyed it. I built that, but here the answer didn't do anything for the learner, so I took it out.

## With more time

- Draw the board on the server, and only wait for saved progress before it becomes clickable.
- Turn each step into a small state machine, starting with the final challenge. Then step screens become mostly data, and new lessons are quicker to add.
- Tests for the quick check, the report screen and saving progress.
- Test it with real beginners and watch where they get stuck.
- More keywords: first strike, trample, deathtouch.
- Lesson 2 (combat tricks). The report card already has a short demo of it.
- A recorded voice instead of the browser's read-aloud.
- Move all the text into one file so it can be translated.
- Animate attackers stepping into the middle of the table.

## Known limitations

- Progress only lives in this browser. Clearing site data starts you over.
- Step pages wait for saved progress before they show, so locked steps stay locked. Until then you see the step's outline.
- The opponent is predictable on purpose, so the final challenge has one clear answer. It doesn't play like a real person.
- Read-aloud uses the browser's built-in speech, so the voice depends on the device.
- I checked phone sizes in Chrome and Safari on my laptop, not on a real phone.

## Checks I ran

- axe (WCAG 2.2 AA): 0 issues on every page and step, before and after pressing Try, desktop and phone. Run on the live site.
- Keyboard only: the whole lesson can be finished with Tab, Enter and Space.
- Lighthouse on the live site: Accessibility, Best Practices and SEO 100. Performance 100 on desktop, 96 on mobile.
- Reduced motion: the lesson starts in Calm mode. There's also a Full / Calm / Off switch in the header.

## About the commit history

I committed in steps at the end of the build. Each commit's date matches when that part was built, and each one holds the finished version of its files. Early commits may not build on their own.

## Fan content

Teach Me: Magic Combat is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
