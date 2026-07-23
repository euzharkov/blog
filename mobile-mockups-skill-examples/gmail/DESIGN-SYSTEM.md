# Gmail (iOS) fidelity study — Mockup Design System

This document governs `design-system.css` and the mockup pages beside it.
The source of truth is **Google's shipped Gmail iOS app**: seven real
captures (inbox, drawer folders, drawer labels, thread, compose, reply,
account sheet) at 390×844 @3x. The study replicates the interface; every
piece of mail data is fictional. Not affiliated with Google.

## Model: two layers only

1. **Flat shared values** — `design-system.css`: Gmail's Material palette
   (blue actions, red brand, blue-gray surfaces, pink selected state) and a
   Roboto type scale measured from the captures.
2. **Screen CSS** — in `index.html`, reproducing captured geometry.

## Fictional-data policy

The reference captures contained a real mailbox. The mockups keep the
STRUCTURE (row anatomy, counts, truncation, badge positions) and replace
every sender, subject, snippet, address, avatar, account, and label name
with invented equivalents (persona: "Sam Parker", senders like "WorkWire",
"The Ledger Team", labels like "Receipts", "Side Project"). When extending
these mockups, never introduce real names, addresses, or brands beyond
Gmail itself — the study's subject.

## Intentional exceptions

- `--importance` (yellow marker) is decorative-only and never carries text;
  it is excluded from the text-contrast gate on purpose.
- The simulated iOS keyboard uses raw grays in Layer 2 — OS chrome is
  preview-only material under this method.

## Colors

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| `--canvas` / `--card` | `#ffffff` | `#131314` / `#1e1f20` | list, thread, compose |
| `--functional` | `#eff3fa` | `#282a2c` | search pill, bottom bar, sheet canvas, chips |
| `--selected` | `#d3e3fd` | `#004a77` | active tab pill |
| `--accent-tint` | `#fce8e6` | `#4a2523` | selected drawer item (pink) |
| `--ink-900/600/400` | `#1f1f1f` `#444746` `#6f7276` | `#e3e3e3` `#c4c7c5` `#8e918f` | text scale |
| `--accent-interactive` | `#0b57d0` | `#a8c7fa` | links, buttons, Compose text, storage bar |
| `--accent-decorative` | `#c2e7ff` | `#004a77` | FAB fill — never carries gray text |
| `--brand` | `#c5221f` | `#f2b8b5` | Gmail red: selected drawer text, badges |
| `--importance` | `#f4b400` | `#fdd663` | importance marker (decorative) |
| `--tag-*` (green/blue/red/yellow/pink) | Gmail label palette | lightened | label tags |
| `--av-*` (purple/teal/navy/green/blue/red) | avatar fills | lightened | fictional sender avatars |
| `--btn-fill` / `--btn-label` | `#0b57d0` / `#fff` | `#a8c7fa` / `#062e6f` | filled action |

Dark values are the pattern-correct Material-dark projection; captures are
light.

## Typography — Roboto (Google Sans approximated)

| Role | Weight | Size / line | Use as captured |
| --- | --- | --- | --- |
| `.t-subject-lg` | 400 | 26/34 | thread subject, email H1 |
| `.t-hi` | 400 | 30/38 | "Hi, Sam!" |
| `.t-item` | 500 | 19/26 | drawer rows |
| `.t-row-strong` / `.t-row` | 700 / 400 | 17/23 | unread / read rows, account names |
| `.t-snippet` | 400 | 15/21 | snippets, secondary lines |
| `.t-meta` | 500 | 13/18 | times, counts, "to Sam" |
| `.t-overline` | 500 | 15/20 +0.6 | "All inboxes", "LABELS", "Suggestions" |
| `.t-search` | 400 | 18/24 | "Search in mail" |
| `.t-btn` / `.t-link` | 500 | 17/22 · 15/20 | blue actions |
| `.t-chip` | 500 | 13/18 | "Inbox", "Actively recruiting" |
| `.t-body` | 400 | 17/24 | compose fields, email body |

## Icons

Phosphor 2.x approximates Google's icon set (list, tray, tag, star, clock,
paper-plane-tilt, pencil-simple, video-camera, seal-check, bell, camera,
cloud…). The Gmail four-color "M" is deliberately a stand-in glyph — do not
reproduce the real trademark mark in the mockup.

## Spacing and shape

4px scale, `--screen-inset: 16px`. Radii: 8 (chips), 16 (sheet groups,
FAB), 24 (large cards), pill (search, drawer selection, buttons). Drawer
panel: 336pt wide, right-rounded, over a 35% scrim; list rows 58pt; mail
rows three-line with 44pt avatars.

## Screen-specific CSS

Layer-2 patterns: search pill, three-line mail rows with importance marker
and star, Compose FAB + two-tab bottom bar, drawer with behind/scrim/panel
stack, thread chrome, branded email body (a nested mini brand system),
compose field rows, simulated keyboard, account sheet with storage meter.

## Translating to and from production

As with the Calendar study, translation runs *from* production: role names
track Material semantics, so values map back to their Material tokens.
