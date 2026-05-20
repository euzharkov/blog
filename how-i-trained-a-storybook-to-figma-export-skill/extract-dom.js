/**
 * Storybook preview DOM extractor — runs inside the STORY IFRAME document
 * (same-origin), not the Storybook shell.
 *
 * Usage (browser automation):
 * 1. Navigate to Storybook URL; wait for #storybook-preview-iframe.
 * 2. iframe.contentWindow.eval(this entire file) OR inject as <script>.
 * 3. Call: extractStorybookDomTree({ rootSelector: '#root' })
 *    Or read: window.__storybookDomExtract (last result).
 *
 * Raster sources in output: `<img>` → `node.src` / `node.currentSrc` (srcset);
 * CSS `background-image` → `node.backgroundImageUrl` (first raster) and
 * `node.backgroundImageUrls` (all raster layers, order preserved). Consumers may
 * save binaries + manifest for manual Figma import; this script does not upload to Figma.
 *
 * If iframe is cross-origin blocked, open iframe.src in a tab and run there.
 *
 * `<textarea>` / `<input>`: when present, `domValue` (live `.value`), `clientWidth`,
 * `clientHeight`, `scrollWidth`, `scrollHeight` — use with `rect` + computed padding
 * for Figma text insets and multiline height (see storybook-to-figma SKILL).
 *
 * Font Awesome (`@fortawesome/react-fontawesome`): root `<svg>` has `data-icon` and
 * `data-prefix` (e.g. `circle`, `far`). Output: `faIcon` / `faPrefix`; shortKeys `fi` /
 * `fp`. Do **not** serialize SVG paths — use name + `rect` size in Figma (placeholder
 * frame + official FA plugin swap).
 */

(function attachExtractStorybookDomTree(global) {
  "use strict";

  var DEFAULTS = {
    rootSelector: "#root, #storybook-root, [data-is-storybook-root]",
    maxDepth: 42,
    maxNodes: 400,
    skipInvisible: true,
    minRectSize: 0.5,
    /** When true, collect every raster `url()` from `background-image` (comma layers). */
    allBackgroundImageUrls: true,
    /**
     * When true: omit `meta`; use rect `{x,y,width,height}` only; drop empty `styles` keys;
     * skip redundant `img.currentSrc` when equal to `src`. Smaller JSON for agents / disk.
     */
    compact: false,
    /**
     * When true (requires `compact: true`): structural keys are one letter — `t` tag, `r` rect,
     * `s` styles, `c` children; rect becomes `{x,y,w,h}`; see `mapTreeToShortKeys` in source.
     * Harder to hand-read; smallest JSON besides `JSON.stringify` minification.
     */
    shortKeys: false,
  };

  var STYLE_PROPS = [
    "display",
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "inset",
    "flexDirection",
    "flexWrap",
    "justifyContent",
    "alignItems",
    "alignContent",
    "alignSelf",
    "flexGrow",
    "flexShrink",
    "flexBasis",
    "gap",
    "rowGap",
    "columnGap",
    "gridTemplateColumns",
    "gridTemplateRows",
    "gridColumnGap",
    "gridRowGap",
    "justifyItems",
    "justifySelf",
    "placeContent",
    "placeItems",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "width",
    "height",
    "minWidth",
    "minHeight",
    "maxWidth",
    "maxHeight",
    "boxSizing",
    "backgroundColor",
    "backgroundImage",
    "opacity",
    "overflow",
    "overflowX",
    "overflowY",
    "visibility",
    "color",
    "fill",
    "stroke",
    "strokeWidth",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "lineHeight",
    "letterSpacing",
    "textAlign",
    "textDecorationLine",
    "textTransform",
    "textOverflow",
    "textShadow",
    "overflowWrap",
    "wordBreak",
    "whiteSpace",
    "writingMode",
    "objectFit",
    "objectPosition",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
    "borderTopStyle",
    "borderRightStyle",
    "borderBottomStyle",
    "borderLeftStyle",
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "borderBottomRightRadius",
    "borderBottomLeftRadius",
    "borderRadius",
    "outlineWidth",
    "outlineStyle",
    "outlineColor",
    "outlineOffset",
    "boxShadow",
    "transform",
    "filter",
    "backdropFilter",
    "clipPath",
    "aspectRatio",
    "zIndex",
    "backgroundSize",
    "backgroundRepeat",
    "backgroundPosition",
  ];

  function pickStyles(cs, compact) {
    var o = {};
    for (var i = 0; i < STYLE_PROPS.length; i++) {
      var k = STYLE_PROPS[i];
      // Use bracket notation — getPropertyValue() requires kebab-case but
      // STYLE_PROPS are camelCase, so cs[k] is the correct accessor.
      var v = cs[k] || "";
      if (compact) {
        if (!v) continue;
        o[k] = v;
      } else {
        o[k] = v;
      }
    }
    return o;
  }

  function rectVisible(r, minSize) {
    if (!r || r.width < minSize || r.height < minSize) return false;
    return true;
  }

  function shouldSkipElement(el, cs, rect, opts) {
    if (opts.skipInvisible) {
      if (cs.visibility === "hidden" || cs.display === "none") return true;
      if (parseFloat(cs.opacity || "1") === 0) return true;
      if (!rectVisible(rect, opts.minRectSize)) return true;
    }
    return false;
  }

  /**
   * All `url(...)` rasters in computed `background-image` (layer order), absolute hrefs.
   * Skips gradients and non-url tokens.
   */
  function rasterBackgroundUrls(cs) {
    var raw = (cs.backgroundImage || "").trim();
    if (!raw || raw === "none") return [];
    var urls = [];
    var re = /url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi;
    var m;
    while ((m = re.exec(raw)) !== null) {
      var inner = m[1].trim();
      if (/gradient/i.test(inner)) continue;
      try {
        urls.push(new URL(inner, global.document.baseURI).href);
      } catch (e) {}
    }
    return urls;
  }

  /** True if the element likely paints something without children/text (e.g. solid card). */
  function hasVisualPaint(cs) {
    if (rasterBackgroundUrls(cs).length) return true;
    var bg = (cs.backgroundColor || "").trim();
    if (bg && bg !== "transparent" && bg.indexOf("rgba(0, 0, 0, 0)") === -1)
      return true;
    var bw =
      parseFloat(cs.borderTopWidth || "0") +
      parseFloat(cs.borderRightWidth || "0") +
      parseFloat(cs.borderBottomWidth || "0") +
      parseFloat(cs.borderLeftWidth || "0");
    if (bw > 0) return true;
    var ow = parseFloat(cs.outlineWidth || "0");
    var ostyle = (cs.outlineStyle || "").toLowerCase();
    if (ow > 0 && ostyle && ostyle !== "none") return true;
    var sh = (cs.boxShadow || "").trim();
    if (sh && sh !== "none") return true;
    var tsh = (cs.textShadow || "").trim();
    if (tsh && tsh !== "none") return true;
    return false;
  }

  function textContentDirect(el) {
    var out = "";
    var ch = el.childNodes;
    for (var i = 0; i < ch.length; i++) {
      if (ch[i].nodeType === 3) out += ch[i].textContent || "";
    }
    return out.replace(/\s+/g, " ").trim();
  }

  function walk(el, depth, opts, state) {
    if (state.count >= opts.maxNodes) return null;
    if (depth > opts.maxDepth) return null;

    var cs = global.getComputedStyle(el);
    var rect = el.getBoundingClientRect();
    if (shouldSkipElement(el, cs, rect, opts)) return null;

    state.count++;
    var tag = el.tagName ? el.tagName.toLowerCase() : "node";
    var rCompact = opts.compact
      ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      : {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left,
        };
    var node = {
      tag: tag,
      id: el.id || undefined,
      className:
        typeof el.className === "string" && el.className
          ? el.className
          : undefined,
      text: textContentDirect(el) || undefined,
      rect: rCompact,
      styles: pickStyles(cs, opts.compact),
      children: [],
    };

    if (tag === "img") {
      if (el.src) node.src = el.src;
      if (el.currentSrc && (!opts.compact || el.currentSrc !== el.src))
        node.currentSrc = el.currentSrc;
      node.alt = el.alt || undefined;
      if (el.naturalWidth > 0) {
        node.naturalWidth = el.naturalWidth;
        node.naturalHeight = el.naturalHeight;
      }
    }

    if (tag === "textarea" || tag === "input") {
      try {
        if ("value" in el && el.value) node.domValue = String(el.value);
        if ("clientWidth" in el) {
          node.clientWidth = el.clientWidth;
          node.clientHeight = el.clientHeight;
          node.scrollWidth = el.scrollWidth;
          node.scrollHeight = el.scrollHeight;
        }
      } catch (e) {}
    }

    if (tag === "svg") {
      try {
        var faI = el.getAttribute && el.getAttribute("data-icon");
        var faP = el.getAttribute && el.getAttribute("data-prefix");
        if (faI) node.faIcon = faI;
        if (faP) node.faPrefix = faP;
      } catch (eFa) {}
      if (!node.faIcon) {
        var vb = el.getAttribute && el.getAttribute("viewBox");
        if (vb) node.viewBox = vb;
        var sw = el.getAttribute && el.getAttribute("width");
        var sh = el.getAttribute && el.getAttribute("height");
        if (sw) node.svgWidth = sw;
        if (sh) node.svgHeight = sh;
      }
    }

    var bgUrls = rasterBackgroundUrls(cs);
    if (bgUrls.length) {
      node.backgroundImageUrl = bgUrls[0];
      if (opts.allBackgroundImageUrls) node.backgroundImageUrls = bgUrls;
    }

    var kids = el.children;
    for (var j = 0; j < kids.length; j++) {
      var sub = walk(kids[j], depth + 1, opts, state);
      if (sub) node.children.push(sub);
    }

    var keepLeaf =
      node.text ||
      node.children.length > 0 ||
      tag === "img" ||
      tag === "svg" ||
      tag === "textarea" ||
      tag === "input" ||
      hasVisualPaint(cs);
    if (!keepLeaf) {
      state.count--;
      return null;
    }

    return node;
  }

  function resolveRoot(selector) {
    var el = global.document.querySelector(selector);
    return el || global.document.body;
  }

  /**
   * Ultra-tight tree: t/r/s/c plus short extras. `s` values keep full CSS camelCase keys.
   * @param {object | null} n — long-key node from `walk`
   * @returns {object | null}
   */
  function mapTreeToShortKeys(n) {
    if (!n) return null;
    var r = n.rect;
    var o = {
      t: n.tag,
      r: { x: r.x, y: r.y, w: r.width, h: r.height },
      s: n.styles,
      c: [],
    };
    if (n.id) o.i = n.id;
    if (n.className) o.l = n.className;
    if (n.text) o.x = n.text;
    var j;
    for (j = 0; j < n.children.length; j++) {
      o.c.push(mapTreeToShortKeys(n.children[j]));
    }
    if (n.src) o.u = n.src;
    if (n.currentSrc) o.v = n.currentSrc;
    if (n.alt) o.a = n.alt;
    if (n.naturalWidth) o.nw = n.naturalWidth;
    if (n.naturalHeight) o.nh = n.naturalHeight;
    if (n.faIcon) o.fi = n.faIcon;
    if (n.faPrefix) o.fp = n.faPrefix;
    if (!n.faIcon) {
      if (n.viewBox) o.vb = n.viewBox;
      if (n.svgWidth) o.sx = n.svgWidth;
      if (n.svgHeight) o.sy = n.svgHeight;
    }
    if (n.backgroundImageUrl) o.bg = n.backgroundImageUrl;
    if (n.backgroundImageUrls) o.bgs = n.backgroundImageUrls;
    if (n.domValue !== undefined) o.dv = n.domValue;
    if (n.clientWidth !== undefined) o.cw = n.clientWidth;
    if (n.clientHeight !== undefined) o.ch = n.clientHeight;
    if (n.scrollWidth !== undefined) o.sw = n.scrollWidth;
    if (n.scrollHeight !== undefined) o.sh = n.scrollHeight;
    return o;
  }

  /**
   * @param {Partial<typeof DEFAULTS>} options
   * @returns {{ meta?: object, tree: object | null }}
   */
  function extractStorybookDomTree(options) {
    var opts = {};
    var k;
    for (k in DEFAULTS) opts[k] = DEFAULTS[k];
    if (options)
      for (k in options) if (options[k] !== undefined) opts[k] = options[k];

    if (opts.shortKeys && !opts.compact) opts.compact = true;

    var state = { count: 0 };
    var root = resolveRoot(opts.rootSelector);
    var tree = walk(root, 0, opts, state);

    if (opts.shortKeys && tree) tree = mapTreeToShortKeys(tree);

    var out = opts.compact
      ? { tree: tree }
      : {
          meta: {
            href: global.location.href,
            userAgent: global.navigator.userAgent,
            viewportWidth: global.innerWidth,
            viewportHeight: global.innerHeight,
            devicePixelRatio: global.devicePixelRatio,
            rootSelector: opts.rootSelector,
            maxDepth: opts.maxDepth,
            maxNodes: opts.maxNodes,
            nodesVisited: state.count,
            extractedAt: new Date().toISOString(),
            stylePropsList: STYLE_PROPS.slice(),
          },
          tree: tree,
        };

    global.__storybookDomExtract = out;
    return out;
  }

  global.extractStorybookDomTree = extractStorybookDomTree;
  global.__STORYBOOK_DOM_EXTRACT_STYLE_PROPS = STYLE_PROPS;
})(typeof window !== "undefined" ? window : globalThis);
