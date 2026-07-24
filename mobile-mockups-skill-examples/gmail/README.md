# Example 2 — Gmail (iOS), a fidelity study

Second worked example of the `mobile-mockups-skill` skill in **fidelity mode**: the
Gmail iOS app rebuilt from seven real captures (iPhone, 390×844 @3x). Where
[ios-calendar](../ios-calendar/README.md) recreates Apple's Calendar, this one
tackles a denser product — list rows, an overlay drawer, a branded HTML
email, a simulated keyboard, and a bottom sheet. Not affiliated with Google.

![Animated tour of the Gmail mockup](gmail-mockup-demo.gif)

**All data is fictional.** The captures contained a real mailbox; every
sender, subject, address, avatar, account, and label was replaced with
invented equivalents (persona "Sam Parker") that preserve the structure —
row heights, truncation, badges, counts — so the fidelity claim survives the
anonymization. See the policy section in
[DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).

Screens in [`index.html`](index.html):

- **Inbox** — three-line rows, bold unread, importance markers, Compose FAB,
  two-tab bottom bar with the 99+ badge
- **Drawer ×2** — system folders (selected pink/red right-rounded pill) and
  user labels with colored tags, over a scrimmed list
- **Thread ×3** — a job-alert email and a bank CD promo (top + scrolled):
  large subject + Inbox chip, verified senders, and branded email bodies —
  each advertiser's palette scoped as a nested mini-system inside Layer 2
- **Compose & reply** — contact suggestions, quoted reply, and a simulated
  iOS keyboard built as preview-only material
- **Account sheet** — avatar, account switcher, storage meter

## Run it

Serve the examples folder (the workbench files `mockup.css` / `mockup.js`
live at its root):

```bash
python3 -m http.server 4680 --directory ..
```

Then open `http://localhost:4680/gmail/`. Useful views:
`?solo=foundations`, `?solo=inbox`, `?solo=read`, `?solo=compose`, each
with optional `&theme=dark` (dark is the Material-dark projection; the
captures are light).
