# Cromos 26 — Design System

This is the design reference for the Cromos 26 app. The visual identity is **directly inspired by the Panini FIFA World Cup 2026 album cover**: bold flat geometry, warm cream backgrounds, primary colors arranged in a quilt-like pattern, thick black borders, and a heavy condensed display font for the iconic "26" numerals.

**Use the included files as the source of truth:**

| File | What it shows |
|------|---------------|
| `01-logo.svg` | Primary horizontal wordmark with "26" + CROMOS lockup |
| `02-logo-square.svg` | App icon / favicon variant (square, quilted background) |
| `03-screen-collection.html` | Main collection screen mockup (sticker grid, filters, stats) |
| `04-screen-group.html` | Group detail with leaderboard + multi-trade optimizer |
| `05-screen-stats.html` | Stats dashboard with hero completion % |

Open the HTML files in a browser to see the exact intended look. The CSS in each file is self-contained and demonstrates the precise colors, fonts, sizes, borders, and spacing.

---

## 1. Color tokens

```css
:root {
  --panini-red:    #E63027;  /* primary action, alerts, missing items */
  --panini-orange: #F2812A;  /* duplicate badges */
  --panini-yellow: #F4C430;  /* highlights, completion, headers */
  --panini-green:  #6FBE44;  /* owned/positive states */
  --panini-teal:   #2FB8AB;  /* receive/get in trades */
  --panini-blue:   #2E6FB8;  /* groups, info */
  --panini-navy:   #1B3A6B;  /* deep backgrounds, accents */
  --panini-purple: #7B4B9E;  /* secondary accent */
  --panini-cream:  #F5E6D3;  /* THE main background — never pure white */
  --panini-ink:    #1A1A1A;  /* text, borders */
  --panini-white:  #FFFFFF;  /* card surfaces only */
}
```

**Rules:**
- Cream (`#F5E6D3`) is the page background everywhere. Pure white is reserved for card surfaces sitting on top of cream.
- Each team gets one of the primary colors as its tile color; the same color is reused in category headers and progress bars for that team — visual consistency across screens.
- No gradients except for the album-progress bar (red → orange → yellow horizontal sweep).

## 2. Typography

```html
<link href="https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

- **Anton** — display font for "26", page titles, big numbers, category headers. ALL CAPS, tight tracking. Never use for body text.
- **DM Sans** — body text, buttons, member names, descriptions. 14–16px standard.
- **JetBrains Mono** — sticker numbers (`#247`), invite codes (`7K3M9X`), small labels, stat labels. Always uppercase for labels, with letter-spacing 1–2px.

Do NOT use Inter, Roboto, system-ui, or any other font. The three above only.

## 3. Borders & shapes

- Every card, button, chip, sticker tile, and stat block has a **2–3px solid `--panini-ink` border**.
- No box-shadows. Ever. The look is flat poster / sticker book, not material design.
- Border radius: small components 8–10px, cards 12–14px, hero blocks 18–22px, buttons 999px (pill).
- Active/selected states swap to `background: --panini-ink; color: white` rather than adding a shadow or glow.

## 4. The quilt motif

The album cover is built from interlocking flat shapes (circles, half-circles, quarter-circles, rectangles) in primary colors. **Echo this** on hero sections and group banners by placing 2–3 large decorative shapes in the background of large colored blocks (see `05-screen-stats.html` hero, `04-screen-group.html` group banner).

Shapes should be:
- Pure geometric (circle, semicircle, rectangle, quarter-circle)
- Flat solid color from the palette
- Slightly oversized and clipped by the container edges
- Behind content (z-index 0; content at z-index 1)

## 5. Sticker tile (the core component)

Aspect ratio **2:3**. Three states:

| State | Look |
|-------|------|
| **Missing** | white background, dashed 2px black border, faded number `#aaa` |
| **Owned** | solid team color background, white or black number depending on contrast, 2px solid black border |
| **Duplicate** | same as owned + small orange `×N` ribbon badge in top-right corner with thick black border |

Tap behavior:
- Short tap: toggle owned (off → 1)
- Long-press: open count editor (set 0, 1, 2, 3+)

Tiles in a category share the team color so a row of owned-Brasil stickers reads as a yellow stripe — visually pleasing and informative.

## 6. Components catalog

**Stat block** — solid colored rectangle, 3px black border, big Anton number top-aligned, mono caps label below.

**Trade card** — two-column ledger format: left "GIVES", right "GIVES" (perspective from each person), separated by a 1px black divider. Yellow header bar with both names + ↔ arrow + a black pill showing trade size. If user is involved: red 3px border instead of black 2px.

**Number chips** — used for sticker numbers in trade lists. Monospace, thin black border, color-coded: green for "you give", teal for "you get".

**Member card (leaderboard)** — circular avatar with initials in a primary color (matches the user's color identity in the group), name, % completion in big Anton, thin progress bar in member's color.

**Tabs** — segmented control with thick black border, active tab inverts to black background + white text.

**Invite code pill** — dashed border (not solid), monospace, oversized letter-spacing, copy icon attached.

## 7. Motion

Subtle and deliberate, not flashy:
- Sticker mark-as-owned: 200ms flip animation revealing the colored side
- Duplicate count increment: bouncy badge pop (scale 1 → 1.3 → 1)
- Tab switch: horizontal slide
- Card press: scale to 0.98, 80ms
- Page enter: stagger children with 30ms delay each

Use Framer Motion (or CSS keyframes for simple cases). Never over-animate.

## 8. What to AVOID

These are anti-patterns. Don't do any of them:

- Pure white backgrounds (use cream)
- Soft drop shadows (use solid borders)
- Purple/pink gradients (looks generic AI)
- Glassmorphism, blur effects, neon glows
- Inter as a heading font
- Emoji as logo or main brand element
- Material Design components (MUI, Chakra defaults)
- iOS-native look (we're cross-platform web)
- Dark mode as default (the album is bright; dark mode can be added later as a toggle)
- Gradients on tile backgrounds (flat solid color only)

## 9. Logo usage

Two SVGs are provided:
- `01-logo.svg` — horizontal lockup with the "2" in red, "6" in blue, and "CROMOS" wordmark with metadata. Use in app headers (desktop) and marketing.
- `02-logo-square.svg` — square version with quilted background, "26" centered. Use as favicon, app icon, mobile splash screen.

Both replicate the spirit of the Panini cover without copying it: same numeral energy, same color quilt, but our own composition.

## 10. Accessibility

- All sticker tiles need ARIA labels: `aria-label="Sticker 245, Portugal, owned, 2 copies"`
- Color is never the only signal: owned has a checkmark, missing has dashed border, duplicate has the ×N badge.
- Color contrast: ink on cream = 14:1, ink on yellow = 12:1, white on red = 5.2:1, white on blue = 6.8:1. Avoid placing text on green/teal without testing.
- Focus rings: 3px solid `--panini-yellow` outline with 2px offset, visible on all interactive elements.
- Min tap target: 44×44px (sticker tiles will be smaller in dense grids — wrap them in larger tap regions).
