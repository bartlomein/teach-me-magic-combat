# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, weighted equally (confirmed):

- **A complete beginner** to Magic: The Gathering who wants to understand combat (attacking, blocking, flying/reach, damage wearing off) in about 10 minutes, with no cards and no prior knowledge. Often on a phone.
- **Marker Learning's hiring team** reviewing a frontend take-home. They judge craft, accessibility, and whether the build reflects how Marker thinks about learning.

## Product Purpose

An interactive tutorial that teaches one thing well: how combat works in Magic. The learner plays real board situations, gets corrective feedback tied to specific misconceptions, and finishes with a report card. Success: a beginner can predict a combat outcome correctly, and a reviewer sees learning-science thinking expressed in the interface.

## Positioning

Built the way Marker Learning builds assessments: minimal text, tap instead of type, a lighter version after two misses, selective testing (quick check skips known steps), and error analysis grouped by misconception (myths M1–M10). The rules come from a tested engine that matches the official Comprehensive Rules (Nov 2026), so the lesson can never call an illegal play correct.

## Operating Context

- Five ordered steps: Attacking, Blocking, Flying + reach, Damage wears off, Final challenge (two connected turns). Finished steps can be reviewed; later ones stay locked.
- Each step loops Explain → Watch → Try → Feedback, with 3-level hints.
- Deployed as a static Next.js site (Vercel). No backend. Reviewed in a desktop browser and on a phone.

## Capabilities and Constraints

- Stack: Next.js 16 App Router, React 19, Tailwind v4, Motion, Vitest.
- Server components for static frame, client components for the lesson.
- Card faces (frame, art, P/T badge) are already designed and stay as-is (confirmed). The redesign covers the UI around them.
- Fan Content Policy: no official MTG logo, mana symbols, or official card frame. Footer disclaimer required.
- Cards carry no mana cost and no color identity (moved to a later lesson).

## Brand Commitments

- Mood: calm and magical (user's words).
- Writing limits: prompts ≤ 8 words, explanations ≤ 25, feedback ≤ 20.
- Every state is an icon plus a word, never color alone.

## Evidence on Hand

- Card art: painted background and creature layers for all eight cards in `public/art/`. The Moss Golem also has a 3D model (`moss-golem-3d.glb`, Blender source in `art/source/`).
- Lesson words and boards: `src/lib/lesson/steps.ts` and `step-attack.ts`.
- No testimonials, users, or metrics exist. Do not invent any.

## Product Principles

1. Measure the skill, not the reading: the board teaches, text supports.
2. Every mistake is information: tag it, explain it in one line, adapt.
3. The rules are never wrong: UI decisions defer to the engine.
4. Calm over clever: motion and color serve understanding.

## Accessibility & Inclusion

- Marker's founder is dyslexic; the product serves people with learning differences. Body text must be highly legible.
- 44px touch targets, visible two-tone focus, full keyboard play, screen-reader text twin for every animation, reduced-motion modes (Full / Calm / Off), read-aloud buttons.
