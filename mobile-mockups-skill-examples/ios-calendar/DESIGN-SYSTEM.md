# iOS Calendar fidelity study — Mockup Design System

This document governs `design-system.css` and the mockup pages beside it.
Unlike a normal product system, the source of truth here is **Apple's shipped
iOS Calendar** (iOS 26.5 simulator, iPhone, 390×844): five real captures —
day, year, month, list, and the New sheet. The mockups exist to measure how
close the mobile-mockups-skill method can get to a real app. Not affiliated with
Apple.

## Model: two layers only

1. **Flat shared values** live in `design-system.css` — Apple's documented
   semantic colors and text styles, not pixel-sampled guesses.
2. **Screen CSS** lives in `index.html` and reproduces captured geometry.

No component-token tier, no component library, no build step.

## Intentional exceptions (fidelity beats the audit)

In an original design the contrast audit is a gate. Here the reference wins,
and the audit's job is to make Apple's own trade-offs visible instead of
silent:

- `--accent-interactive` (systemRed #FF3B30) on white is **3.5:1** — below AA
  for small text. Apple ships it (Today numeral, red date headers); we keep
  it and the audit shows "AA large only".
- `--ink-400` (tertiaryLabel, 30% alpha) is decorative-grade contrast; used
  only where the original uses it (placeholders, disabled ✓).

Do not "fix" these values; that would break the study's premise.

## Colors — iOS system palette

| Role | Light | Dark | iOS name / use |
| --- | --- | --- | --- |
| `--canvas` | `#ffffff` | `#000000` | systemBackground |
| `--card` | `#ffffff` | `#1c1c1e` | grouped cell background |
| `--functional` | `#f2f2f7` | `#1c1c1e` | systemGray6 — sheet canvas, banners |
| `--selected` | `#e5e5ea` | `#2c2c2e` | systemGray5 — chips, switch track, seg control |
| `--ink-900` | `#000000` | `#ffffff` | label |
| `--ink-600` | `rgba(60,60,67,.6)` | `rgba(235,235,245,.6)` | secondaryLabel — weekend numerals, values |
| `--ink-400` | `rgba(60,60,67,.3)` | `rgba(235,235,245,.3)` | tertiaryLabel — placeholders |
| `--accent-interactive` | `#ff3b30` | `#ff453a` | systemRed — today, year title, list date |
| `--material-pill` | `#f4f4f6` | `#1f1f21` | solid stand-in for liquid-glass pills |
| `--cal-event` triad | `#1d80f2` / `#ddedfd` / `#0f62c1` | `#409cff` / 22% / `#7dbbff` | default "Calendar" blue |
| `--holiday` triad | `#af52de` / `#f3e2fc` / `#8b2fc9` | `#bf5af2` / 24% / `#d795f5` | US Holidays purple |
| `--birthday` | `#8a99af` | same | Birthdays icon circle |
| `--btn-fill` / `--btn-label` | `#000` / `#fff` | `#fff` / `#000` | selected-day circle in the week strip |
| `--border-subtle` / `--border-control` | `#e5e5ea` / `#c6c6c8` | `#2c2c2e` / `#38383a` | hairlines / separators |

Dark values are Apple's dark-mode equivalents; the study's captures are
light, so dark is the pattern-correct projection, not a capture.

## Typography — SF text styles

System stack (`-apple-system`) renders actual SF on Apple devices.

| Role | Weight | Size / line | Use as captured |
| --- | --- | --- | --- |
| `.t-large-title` | 700 | 34/41 | "July", "2026" (year title also red) |
| `.t-title2` | 400 | 22/28 | reserve |
| `.t-nav` | 600 | 20/25 | nav-pill labels, list rows & section headers |
| `.t-headline` | 600 | 17/22 | "Today" button, "New" sheet title |
| `.t-body` | 400 | 17/22 | cell labels, values, "all-day" |
| `.t-subhead` / `.t-subhead-strong` | 400/600 | 15/20 | segmented control, day banner, event titles |
| `.t-footnote` | 400 | 13/18 | event meta |
| `.t-caption` | 600 | 12/16 | weekday letters (S grayed, M–F black in month view) |
| `.t-day-number` | 400 | 26/32 | week-strip & month-grid numerals |
| `.t-on-accent` | 400 | 26/32 | numeral inside selected/today circles |

Only weights 400/500/600/700 as used by the original; no italics.

## Icons

Phosphor 2.x stands in for SF Symbols (closest free set): caret-left,
magnifying-glass, plus, cards, list-bullets, calendar-dots, tray, star, gift,
x, check, caret-up-down. Fidelity note: shapes are close but not identical —
acceptable for a mockup, worth calling out in review.

## Spacing and shape

4px scale. `--screen-inset: 16px` (iOS list margin). Radii: 6 (event
blocks), 12 (value chips), **26 (iOS 26 sheet groups — much rounder than
classic)**, pill (all floating chrome). Grouped cells ≥ 52pt; circle
buttons and selected-day circles 44pt.

## Screen-specific CSS

Layer-2 patterns in `index.html`: floating pill chrome, week strip, hour
timeline (52px = 1h), month grid (88pt rows, full-bleed hairlines), year
mini-months (generated from real `Date` math), list sections, iOS 26 sheet
(circle buttons, segmented pill, chip values, switch). All geometry measured
from captures at @3x ÷ 3.

## Translating to and from production

This study translates *from* production. The reverse mapping documents
itself: role names match Apple's semantic color and text-style names, so any
value here can be traced to its UIKit counterpart.
