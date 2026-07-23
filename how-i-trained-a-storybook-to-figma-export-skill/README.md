# How I Trained a Storybook-to-Figma Export Skill

Companion files for the article about teaching a coding agent to export
Storybook components into Figma. <!-- TODO: link the article when published -->

## What's here

- [`storybook-to-figma.skill.md`](storybook-to-figma.skill.md) — the trained
  skill: the full workflow the agent follows, as it ended up after the
  training sessions described in the article.
- [`extract-dom.js`](extract-dom.js) — the DOM extractor the skill drives:
  it walks a Storybook story's iframe and captures the rendered structure
  and styles for the Figma import.

## A note before you copy-paste

These are **reference files, not a drop-in package** — they're published so
you can read them alongside the article and adapt the approach to your own
setup. Paths, selectors, and assumptions match the project they were trained
on.

If you're after a ready-to-install skill instead, see
[`mobile-mockups`](../mobile-mockups/) in this repo.
