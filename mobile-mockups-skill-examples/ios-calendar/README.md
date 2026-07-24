# Example 1 — iOS Calendar, a fidelity study

This directory is a real output of the `mobile-mockups-skill` skill used in
**fidelity mode**: instead of inventing a design, it recreates Apple's iOS
Calendar (iOS 26.5 simulator, iPhone 17e, 390×844) from real screenshots, as
closely as a static HTML mockup can. It demonstrates that the method handles
"match this exactly" briefs, not just green-field design. Not affiliated
with Apple.

[Video tour of the iOS Calendar mockup](ios-calendar-mockup-demo.mp4)

What's here:

- [`design-system.css`](design-system.css) — Apple's documented system
  palette and SF text styles as design-system roles, including the calendar
  color triads (event blue, holiday purple) and the solid stand-in for
  liquid-glass pill material.
- [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md) — the contract, including the
  **intentional-exceptions** section: systemRed on white fails AA and the
  audit is allowed to say so, because in a fidelity study the reference wins.
- [`index.html`](index.html) — five screens against captures: day view
  (empty, as captured, plus an events reconstruction), year view (twelve
  mini-months computed from real 2026 dates), month view (grayed weekends,
  holiday chips), list view, and the iOS 26 "New" sheet (X/✓ circles,
  Event–Reminder segmented pill, big-radius groups, value-chip steppers).

Provenance: one capture taken via `xcrun simctl io booted screenshot`, four
navigated and captured by hand in the simulator. All at 1170×2532 = 390×844
@3x — the mockup frame maps 1:1.

## Run it

Serve the examples folder (the workbench files `mockup.css` / `mockup.js`
live at its root):

```bash
python3 -m http.server 4680 --directory ..
```

Then open `http://localhost:4680/ios-calendar/`. Useful views:

- `?solo=foundations` — palette, type ramp, and the audit (with Apple's
  own sub-AA reds flagged, on purpose)
- `?solo=views` / `?solo=day` / `?solo=new-event` — one section at a time
- add `&theme=dark` for the dark-mode projection

The workbench files here are copies of the skill's `assets/` — the same
copy-next-to-your-pages setup the skill scaffolds in a real project.
