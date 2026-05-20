---
name: storybook-to-figma
description: >-
  Convert one or more running Storybook stories into editable native Figma nodes.
  Extract DOM, computed styles, layout rects, text, form values, image references,
  and icon metadata from the isolated Storybook iframe, then build incrementally
  with Figma MCP use_figma. Keep large JSON on disk, split Figma writes into small
  calls, treat large generated scripts as unreliable, queue Figma MCP operations,
  and validate with screenshots. Use placeholders for images and Font Awesome icons
  instead of uploading images or converting SVG paths.
  Use when users want Storybook-to-Figma, DOM-to-Figma, or HTML/CSS-to-Figma output
  as editable Figma structure rather than raster screenshots.
---

# Storybook to Figma

Create editable Figma frames from one or more running Storybook stories.

Primary path:

```text
Storybook iframe
-> DOM + computed styles extraction
-> native Figma frames/text/placeholders
-> screenshot validation
-> targeted fixes
```

The goal is editable Figma structure, not a screenshot pasted onto the canvas.

## Prerequisites

- Agent/write mode.
- A reachable Storybook instance.
- Figma MCP access to the target file.
- Figma `use_figma` available for writing to canvas.
- Load any Figma MCP usage notes / `use_figma` guidance before the first write.
- Browser automation, usually Playwright or an equivalent browser driver.
- `scripts/extract-dom.js` available to inject into the Storybook iframe.
- For batch mode: browser extraction may run in parallel, but Figma MCP writes stay queued.

## Shared Tool Cache

Browser installs are slow and can be repeated accidentally across agent runs. Use one stable cache directory for browser and package downloads.

Generic environment setup:

```bash
export STORYBOOK_FIGMA_TOOLS="${STORYBOOK_FIGMA_TOOLS:-${TMPDIR:-/tmp}/storybook-to-figma}"
mkdir -p "$STORYBOOK_FIGMA_TOOLS"
export PLAYWRIGHT_BROWSERS_PATH="$STORYBOOK_FIGMA_TOOLS/playwright-browsers"
export NPM_CONFIG_CACHE="$STORYBOOK_FIGMA_TOOLS/npm-cache"
# optional: export PUPPETEER_CACHE_DIR="$STORYBOOK_FIGMA_TOOLS/puppeteer-cache"
```

For repo-local cache, use `<repo>/.cache/storybook-to-figma` and add it to `.gitignore`.

## Inputs

Ask for these if missing:

| Input                           | Notes                                                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Storybook URL or URLs           | Prefer isolated `iframe.html?id=...&viewMode=story` URLs. If the user gives a manager URL, convert it first.                |
| Target Figma file / parent node | Ask unless the user has already provided a target. Do not hard-code private file IDs in the public skill.                   |
| Optional asset node links       | Figma node URLs for images or icon assets already placed in the file. Use only when the user wants to manually wire assets. |

## URL Normalization

Always extract from the isolated Storybook iframe, not the manager shell.

Example:

```text
Manager URL:
http://localhost:6006/?path=/story/components-button--default&globals=viewport.value:390-844

Isolated iframe:
http://localhost:6006/iframe.html?id=components-button--default&viewMode=story&globals=viewport.value:390-844
```

Reference helper:

```js
function storybookUrlToIframePreviewUrl(input) {
  const u = new URL(input);
  if (u.pathname.endsWith("/iframe.html")) return input;

  const pathParam = u.searchParams.get("path");
  if (!pathParam?.startsWith("/story/")) return input;

  const id = decodeURIComponent(pathParam.slice("/story/".length));
  const out = new URL("iframe.html", u.origin);

  out.searchParams.set("id", id);
  out.searchParams.set("viewMode", "story");

  for (const [k, v] of u.searchParams.entries()) {
    if (k !== "path") out.searchParams.set(k, v);
  }

  return out.href;
}
```

## Extraction

Inject `scripts/extract-dom.js` into the isolated Storybook iframe and call:

```js
window.extractStorybookDomTree({
  compact: true,
  shortKeys: true,
});
```

The extractor should capture:

```text
DOM tree
computed styles
bounding rects
direct text
input / textarea values
image src and currentSrc
background-image URLs
Font Awesome data-icon / data-prefix
Font Awesome computed color
```

Important extraction rules:

- Run inside the story iframe document.
- Do not extract from the Storybook manager shell.
- Write JSON to disk.
- Do not paste large extraction JSON into chat.
- Use `compact: true` for smaller output.
- Use `shortKeys: true` when the tree is too large.
- If Playwright fails returning a large object, `JSON.stringify` inside `page.evaluate`.

Expected extractor behavior:

| Data                                                | Why it matters                                      |
| --------------------------------------------------- | --------------------------------------------------- |
| `rect` / short `r`                                  | Figma frame size and position                       |
| `styles` / short `s`                                | Typography, fills, borders, shadows, layout         |
| direct text / short `x`                             | Text layers without guessing from React source      |
| `domValue` / short `dv`                             | Filled inputs and textareas                         |
| `clientWidth/clientHeight/scrollWidth/scrollHeight` | Textarea and multiline sizing                       |
| `src/currentSrc` / short `u/v`                      | Image placeholder naming and manual import manifest |
| `backgroundImageUrl(s)` / short `bg/bgs`            | CSS image placeholders                              |
| `faIcon/faPrefix/faColor` / short `fi/fp/fc`        | Font Awesome placeholder name, style, and fill      |

Example:

```js
const jsonStr = await page.evaluate(() =>
  JSON.stringify(
    window.extractStorybookDomTree({
      compact: true,
      shortKeys: true,
    }),
  ),
);

fs.writeFileSync(outPath, jsonStr);
```

## Compression Rules

The prompt is not a data pipe.

Use files and tools for large payloads:

```text
write extracts to disk
minify with jq or JSON.stringify
return node IDs from Figma calls
keep binary/image data out of prompts
keep base64 out of use_figma scripts
move repeated corrections into this skill
```

Prefer terminal tools for mechanical work:

| Task               | Prefer                       |
| ------------------ | ---------------------------- | ------- | ------------------------------------- | -------- |
| Minify JSON        | `jq -c . in.json > out.json` |
| Validate JSON      | `jq . in.json >/dev/null`    |
| Check payload size | `wc -c file.json`            |
| Extract URLs       | `jq -r '..                   | strings | select(test("^https?://"))' file.json | sort -u` |
| Inspect safely     | `head -c 4000 file.json`     |

## `use_figma` Script Budget

Figma documents output response limits for write-to-canvas calls. Separately, generated `use_figma` scripts can become unreliable when they are large, especially when data is inlined.

Working rule:

```text
keep generated use_figma scripts small
avoid full extract JSON in the script
avoid image bytes and base64
return node IDs, not full node dumps
split full screens into multiple calls
```

What counts against practical script size:

```text
control flow
helper functions
inlined arrays / objects
layer names
style values
any pasted extract data
```

Split strategy:

```text
call 1: create wrapper / viewport
call 2: create major sections
call 3: add controls and text
call 4: add image and icon placeholders
call 5+: targeted fixes after screenshot review
```

Each call should return the IDs needed by the next call. Chain with `getNodeByIdAsync` instead of rebuilding previous work.

## Batch Workflow

For multiple Storybook URLs:

1. Normalize every URL to an isolated iframe URL.
2. Extract each story to its own JSON file.
3. Use at most 3 concurrent browser extraction jobs.
4. Keep all Figma MCP calls serial.
5. Build and validate one story before starting the next Figma build.

Do not run `use_figma`, `get_metadata`, or `get_screenshot` in parallel across agents. Figma plugin state is easier to keep stable when writes are queued.

Optional batch manifest:

```json
[
  {
    "id": "components-button--default",
    "iframeUrl": "http://localhost:6006/iframe.html?id=components-button--default&viewMode=story",
    "extractPath": "/abs/path/.cache/storybook-to-figma/extracts/components-button--default.json"
  }
]
```

Optional pre-built slots:

- If a Figma frame already exists for a story, build inside that frame instead of creating another top-level wrapper.
- Name slots predictably, for example `SB - {storyId}`.
- On reruns, remove or hide prior generated children inside the slot before appending the new tree.
- If there is no slot, create a non-overlapping wrapper near the chosen parent.

## Figma Build Strategy

Build incrementally.

Recommended passes:

```text
1. create top-level frame / viewport
2. create major sections
3. create text and controls
4. create icon placeholders
5. create image placeholders
6. screenshot
7. patch mismatches
```

Each `use_figma` call should do one focused job and return small output, usually created or modified node IDs.

Avoid:

```text
one giant screen script
full DOM JSON inlined into use_figma
base64 image data
large object dumps returned from Figma
```

Figma's official MCP write-to-canvas docs mention practical limitations such as response limits, no current asset/image import support, custom font limitations, and beta-level output quality. Treat that as a reason to build in smaller steps and validate visually.

Reference: [Figma MCP Server: Write to canvas](https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/)

## In-File Assets

Use this when real images already exist somewhere in the same Figma file.

User preparation:

```text
place source rasters in the Figma file
name each source predictably
paste Figma node links for those sources
```

Agent behavior:

1. Read metadata for each linked source node: `id`, `name`, `type`, `width`, `height`, `x`, `y`, `cornerRadius`.
2. Match sources to placeholders by name, filename fragment, role, or nearby hierarchy.
3. Clone source nodes when they are shared masters, library strips, or already used elsewhere.
4. Reparent the original only when it is clearly single-use or the user explicitly wants it moved.
5. Resize the clone or moved node to the placeholder size.
6. Copy circular radius when the target UI is circular.
7. Hide or remove the placeholder only after layout is verified.

Avoid:

```text
new IMAGE fills with base64
large byte arrays in use_figma
moving shared source nodes by accident
assuming image nodes are square
```

## Mapping Rules

Use DOM rects and computed styles as the source for layout.

Map common structures:

| Source                      | Figma                                |
| --------------------------- | ------------------------------------ |
| block / section / card      | Frame                                |
| text node / direct text     | Text                                 |
| button / input / chip       | Fixed-size frame + text              |
| img                         | Named image placeholder              |
| background-image            | Named image placeholder or fill note |
| Font Awesome svg            | Named icon placeholder               |
| border radius               | Figma corner radius                  |
| box shadow                  | Figma `DROP_SHADOW`                  |
| color / fill / border color | Per-node Figma paint                 |

Do not flatten everything into one generic frame style. Text colors, border colors, disabled states, and icon colors can differ per node.

## Typography

Use the product font expected by the target Figma file.

Rules:

- Do not silently replace the product font with Inter, Arial, or system UI.
- If `getComputedStyle` reports a browser fallback on controls, verify whether the product font should still be used.
- Load the closest available Figma font style based on `fontWeight`, `fontSize`, and `lineHeight`.
- If the required font is unavailable through Figma MCP, document the mismatch.
- Apply color per text node, not as one global text color.

## Font Awesome Icons

Do not convert Font Awesome SVG paths into Figma vectors.

The extractor should read:

```text
data-icon
data-prefix
computed color
rect width / height
```

Build a placeholder instead:

```text
name: FA <prefix> / <icon>
size: extracted rect width x height
position: extracted rect x/y
fill note: computed icon color
```

Example layer names:

```text
FA fas / circle-check
FA far / circle
FA fab / github
```

Manual handoff:

1. Use the official Font Awesome Figma plugin manually.
2. Search by the extracted icon name.
3. Choose the style matching the prefix.
4. Insert into the placeholder frame.
5. Apply the extracted color to the plugin icon layer.

This is intentional. Figma MCP cannot reliably drive arbitrary community plugins as callable APIs.

Post-insert adjustment rules:

- Apply the extracted color to the plugin icon's primary vector/group layer, not to the placeholder frame only.
- Do not recursively scale raw vector children; this can distort icon geometry.
- Resize the plugin wrapper and its primary layer to the intended icon size.
- Center the wrapper inside the placeholder frame.
- If the story uses a specific icon size, use it; otherwise fit within the extracted rect.
- Keep the placeholder name stable so later scripts can find it: `FA <prefix> / <icon>`.

Generic adjustment approach:

```text
find frames whose names start with "FA "
parse prefix and icon from the frame name
find the inserted plugin wrapper under that frame
find the primary vector/group layer
resize wrapper and primary layer
center wrapper in placeholder
apply extracted fill color
```

## Images

Do not upload or stringify image binaries through MCP.

For each `<img>` or raster `background-image`, create a placeholder frame:

```text
same width and height as the extracted rect
same position
clear layer name based on alt text, filename, URL basename, or role
```

Example names:

```text
IMG avatar-user-photo
IMG card-background
IMG hero-illustration
```

If the user provides Figma node links for assets already in the file:

- Inspect linked nodes with metadata.
- Match source assets to placeholders by name.
- Clone shared assets instead of moving them.
- Resize cloned assets to placeholder dimensions.
- Apply corner radius when needed.
- Hide or remove placeholders only after verifying layout safety.

If no asset links are provided, leave placeholders for manual placement.

Disk manifest fallback:

```text
dedupe image URLs from extract
fetch binaries to disk
write manifest: URL -> local file -> placeholder name
manual import into Figma
```

Do not embed the binaries into extraction JSON or `use_figma` scripts.

## Avatars

Do not assume every image is square.

Use the extracted rect:

```text
placeholder width = rect width
placeholder height = rect height
```

For circular avatars:

```text
cornerRadius = min(width, height) / 2
```

Use circular clipping when the UI is visually circular, even if the DOM reports a smaller or partial border radius.

## Buttons and Inputs

Buttons, chips, and inputs often fail when modeled as hug-only auto layout.

Safer default:

```text
create fixed-size frame from DOM rect
place text inside
center text horizontally and vertically
preserve padding when visible
```

For single-line values in fixed-height rows:

```text
textAutoResize = NONE
textAlignVertical = TOP
text height = lineHeight
text y = rowY + (rowHeight - lineHeight) / 2
```

For multiline text:

```text
use extracted fontSize and lineHeight
measure expected wrapping
grow the row if Figma wraps more than the DOM rect
shift nodes below by the height delta
extend parent card/page height
```

Textarea-specific rules:

- Use `domValue` / `dv` when present.
- Use `clientWidth`, `clientHeight`, `scrollWidth`, and `scrollHeight` to detect content that needs more height.
- Use the font size and line height from the textarea itself, not a neighboring label.
- Avoid fake measurement tricks like resizing a text node to height `1` or `9999` and trusting the result blindly.

## Cards and Panels

Cards and raised sections need their visual treatment.

Map:

```text
borderRadius -> cornerRadius
boxShadow -> DROP_SHADOW
backgroundColor -> fill
border colors -> strokes
```

For Figma effects, include:

```js
blendMode: "NORMAL";
```

when creating `DROP_SHADOW`.

Omitting radius and shadow often makes the Figma output look flat even when spacing is mostly correct.

## Figma Build Pitfalls

- **Script budget:** split calls; use placeholders and names for images instead of blobs.
- **Append order:** append children before applying layout sizing that depends on parent context.
- **Fixed pills/buttons:** avoid HUG-only auto-layout when the DOM rect is fixed; use a fixed frame and centered text.
- **Single-line row text:** Figma vertical centering can look optically high; explicitly place a line-height-sized text layer when needed.
- **Multiline in short rows:** if Figma wraps where the browser ellipsized, grow the row and shift every node below by the height delta.
- **Drop shadows:** include `blendMode: "NORMAL"` in shadow effect objects.
- **Cards:** copy both radius and shadow; copying only spacing makes raised panels look flat.
- **Images:** placeholders must match extracted `width` and `height`; do not assume avatar means square.
- **Circular avatars:** use `min(width, height) / 2` when the visual UI is circular.
- **Control fonts:** if computed styles report a browser fallback, verify the product font before substituting.
- **Colors:** apply per-node color; do not turn every heading, label, icon, and disabled state into one global color.

## Validation

Validation is mandatory.

After each build:

1. Run `get_screenshot` on the generated frame.
2. Compare against the running Storybook story and extraction data.
3. Patch only the mismatched nodes.
4. Take another screenshot.
5. Stop when the frame is close enough or remaining gaps are documented.

Do not treat a successful `use_figma` script as a finished export.

Validation loop:

| Step | Action                                                        |
| ---- | ------------------------------------------------------------- |
| 1    | `get_screenshot` on the generated wrapper or story slot       |
| 2    | Compare screenshot to Storybook and extracted rect/style data |
| 3    | Run a small `use_figma` fix for only the mismatched nodes     |
| 4    | Screenshot again                                              |
| 5    | Document remaining gaps if they are tool or asset limitations |

## Direction Rule

Always make the direction explicit.

For this skill:

```text
Direction: Storybook -> Figma.
Source of truth: running Storybook story.
Target: generated Figma frame.
Do not edit repository files.
```

Prompts like "sync," "fix," "match," and "update" are ambiguous. They can mean Storybook-to-Figma or Figma-to-code. Use the direction rule to avoid changing the wrong surface.

## Error Handling

| Issue                         | Action                                                        |
| ----------------------------- | ------------------------------------------------------------- |
| Figma script fails            | Read the error, reduce the batch, retry smaller               |
| Response too large            | Return fewer values, usually node IDs only                    |
| Extract JSON too large        | Use `compact` / `shortKeys`, keep it on disk                  |
| Image handling fails          | Use placeholders or in-file asset nodes                       |
| In-file asset clone times out | Split into smaller calls: clone, append, resize, radius       |
| Font Awesome missing          | Use named placeholders for manual plugin insertion            |
| Font unavailable              | Document mismatch, do not silently substitute                 |
| Screenshot mismatch           | Run targeted patch pass                                       |
| Flat cards vs Storybook       | Check `borderRadius`, `boxShadow`, and fill on the card layer |
| Multiline field mismatch      | Check `domValue`, scroll metrics, line height, and row growth |
| Storybook iframe unavailable  | Convert manager URL or open iframe URL directly               |
| Cross-origin iframe blocked   | Open the iframe URL directly in a tab                         |
| Batch Figma writes flaky      | Queue all Figma MCP operations serially                       |

## Boundaries

- Do not use raster screenshot generation as the primary output.
- Do not edit app code during Storybook-to-Figma export.
- Do not rely on Figma Community plugins as callable APIs.
- Do not upload large image/base64 payloads through `use_figma`.
- Do not paste large DOM JSON into chat.
- Approximate unsupported CSS such as complex filters, clip paths, and non-icon SVGs, then document the gap.
