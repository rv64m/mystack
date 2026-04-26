# Design Brief & Frontend Template Specification

## Personal Portfolio / Editorial Hugo Theme

**Version:** 1.0  
**Date:** 2026-04-18  
**Tone:** Minimal, warm, editorial, selectively retro  

---

## 1. Design Concept

This is a quiet, intentional personal archive — a designer-developer's digital desk. The visual identity centers on a single collectible 3D retro computer object that acts as a sculptural anchor, surrounded by generous whitespace and warm, tactile surfaces. The site balances three content modes: the conventional long-form calm of the blog, the curated clarity of selected projects, and the distinctive paper-stack tactility of daily memos. Retro computer references appear only in the hero object and subtle UI details — never as a theme or parody. The overall feeling is that of entering a well-lit studio: ordered, warm, personal, and quietly surprising.

---

## 2. Visual System

### 2.1 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `paper` | `#F5F1EB` | Primary background — warm off-white, not stark. Evokes good cotton paper or aged gallery walls. |
| `ink` | `#1A1A1A` | Primary text — near-black with warmth. Avoid pure `#000`. |
| `ink-secondary` | `#6B6560` | Secondary text, metadata, captions — warm gray. |
| `ink-tertiary` | `#A39E98` | Muted accents, disabled states, very light text. |
| `surface` | `#EDE8E0` | Elevated surfaces — cards, memo backgrounds, subtle panels. Slightly darker than `paper`. |
| `surface-warm` | `#E8E0D4` | Memo card base, selected states — a touch more warmth. |
| `accent` | `#D4574A` | Sparse accent — active dates, links on hover, tiny UI indicators. Muted terracotta/coral, not bright red. |
| `accent-subtle` | `rgba(212, 87, 74, 0.08)` | Tinted backgrounds for hover states, selected memo cards. |
| `shadow` | `rgba(26, 26, 26, 0.06)` | All shadow color — warm, not blue-gray. |
| `screen-glow` | `#9BB5A4` | The retro computer screen emits a very subtle, desaturated mint-green glow. Not neon. |

**Rules:**
- No gradients except on the 3D computer's physical form.
- No purple, no blue-gray, no SaaS rainbow.
- Dark mode is not required for v1. The warm palette is the identity.

### 2.2 Typography Pairing

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Display / Headings | **Newsreader** (Google Fonts, serif) | 300–400 | Page titles, section headings, project names. Tall, elegant, slightly editorial. |
| Body / UI | **Inter** (Google Fonts, sans) | 400–500 | Body text, navigation, buttons, metadata. Neutral, highly readable. |
| Mono / Accent | **JetBrains Mono** | 400 | Code blocks, dates in the memo selector, tiny UI labels on the 3D computer screen. Used sparingly. |

**Scale (Major Third, base 16px):**

| Token | Size | Line Height | Letter Spacing | Usage |
|-------|------|-------------|----------------|-------|
| `text-xs` | 0.75rem (12px) | 1.4 | 0.01em | Captions, metadata, tags |
| `text-sm` | 0.875rem (14px) | 1.5 | 0 | Secondary text, nav |
| `text-base` | 1rem (16px) | 1.65 | 0 | Body text |
| `text-lg` | 1.125rem (18px) | 1.6 | -0.01em | Lead paragraphs |
| `text-xl` | 1.25rem (20px) | 1.5 | -0.01em | Subheadings |
| `text-2xl` | 1.5rem (24px) | 1.3 | -0.02em | Section headings |
| `text-3xl` | 1.875rem (30px) | 1.2 | -0.02em | Page titles |
| `text-4xl` | 2.25rem (36px) | 1.15 | -0.02em | Hero statement |
| `text-5xl` | 3rem (48px) | 1.1 | -0.03em | Hero display (desktop only) |

**Rules:**
- Headings use Newsreader Light (300) for a quiet, refined presence.
- Body text never goes below `text-base` (16px).
- Line lengths max ~70ch for reading comfort.
- No all-caps except for tiny mono labels (date selectors, tags).

### 2.3 Spacing Principles

- **Base unit:** 4px
- **Section padding:** `clamp(4rem, 8vw, 8rem)` vertical — generous, breathing room.
- **Content max-width:** `1200px` for structural containers; `680px` for reading columns.
- **Gap scale:** 8px, 16px, 24px, 32px, 48px, 64px, 96px.
- **Rule:** Asymmetry is welcome. The memo section uses intentional offset; other sections are centered and calm.

### 2.4 Border Radius Language

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 4px | Inline code, tiny UI elements |
| `radius-md` | 8px | Buttons, tags, small cards |
| `radius-lg` | 16px | Memo cards, panels, images |
| `radius-xl` | 24px | Large project cards, hero containers |
| `radius-full` | 999px | Pills, avatars, circular buttons |

**Rule:** The 3D computer object itself has soft, physical edges. UI elements echo this with moderate rounding — never sharp corners, never excessive bubbles.

### 2.5 Shadow / Depth Language

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px rgba(26,26,26,0.04)` | Subtle lift, tags |
| `shadow-md` | `0 4px 12px rgba(26,26,26,0.06)` | Cards at rest, buttons |
| `shadow-lg` | `0 12px 32px rgba(26,26,26,0.08)` | Elevated cards, modals, expanded memos |
| `shadow-memo` | `0 2px 8px rgba(26,26,26,0.05), 0 8px 24px rgba(26,26,26,0.04)` | Memo card stack — layered, soft |

**Rule:** Shadows are warm, diffuse, and shallow. The memo stack uses multiple layered shadows to create physical depth between cards.

### 2.6 Motion Language

| Pattern | Behavior | Duration | Easing |
|---------|----------|----------|--------|
| Page enter | Fade up + slight scale (0.98 → 1) | 600ms | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Hover lift | `translateY(-2px)` + shadow deepen | 200ms | `ease-out` |
| Card expand | Height auto-animate, opacity fade | 400ms | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Date switch | Cross-fade memo content, slight horizontal slide | 300ms | `ease-in-out` |
| Memo stack shift | Cards re-fan with stagger (50ms each) | 350ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` — slight overshoot for tactility |
| Hero float | Continuous `translateY(-6px)` oscillation | 4s | `ease-in-out`, infinite |
| Screen glow | Subtle opacity pulse (0.7 → 1 → 0.7) | 3s | `ease-in-out`, infinite |
| Cursor blink | Opacity toggle on the computer screen cursor | 1s | `steps(1)`, infinite |

**Rules:**
- Motion is restrained. No bouncy entrances, no parallax scroll on every element.
- Respect `prefers-reduced-motion`: disable continuous animations, switch to instant state changes.
- The hero's float and screen glow are the only ambient motion on the site.

---

## 3. Homepage Structure

### Section 1: Navigation (Fixed, Minimal)

- **Height:** 64px
- **Background:** Transparent initially; on scroll >100px, transition to `paper` with `shadow-sm` and `backdrop-filter: blur(8px)` (very subtle, not glassmorphism).
- **Content:** Logo/wordmark (owner's name in Newsreader, `text-lg`), and links: Blog, Projects, Memos, About.
- **Mobile:** Hamburger menu or horizontal scroll with fade edges. Prefer a clean bottom-sheet drawer over a full-screen overlay.

### Section 2: Hero

**Layout:** Asymmetric two-column on desktop (55% text / 45% 3D object). Stacked on mobile (object first, then text).

**Left Column (Text):**
- **Greeting line:** `text-sm`, `ink-secondary`, Inter. Something like "Hello, I'm" — very quiet.
- **Name:** `text-5xl` (desktop) / `text-3xl` (mobile), Newsreader 300, `ink`.
- **Positioning statement:** `text-xl`, Inter 400, `ink-secondary`, max-width 480px. 1–2 sentences describing what they do.
- **CTA row:** Small text links with arrow icons pointing to Blog, Projects, Memos. Not buttons — understated inline links with hover underline animation.

**Right Column (3D Computer):**
- **Object:** A soft-edged, sculptural retro personal computer. Resembles a compact Macintosh or early workstation but is clearly a stylized original design — no Apple logo, no direct imitation. Rounded chassis, slightly tapered base, built-in screen.
- **Screen content:** A tiny, simplified UI showing a blinking cursor and a few lines of text (e.g., a haiku, a code snippet, or a welcome message). The text is JetBrains Mono at very small scale, in `ink` color on a `screen-glow` tinted background.
- **Physical material:** Matte cream/beige plastic with a soft gradient suggesting form. No glossy reflections.
- **Shadow:** Soft ground shadow beneath the object, `shadow-lg` scale, slightly elliptical, suggesting it's sitting on a surface.
- **Ambient motion:** Gentle float (±6px Y-axis, 4s cycle). Screen glow pulses subtly. Cursor blinks.
- **Interaction:** On hover, the object tilts slightly toward the cursor (3–5° max, CSS `transform: rotateX/rotateY` based on mouse position, throttled). This is the only interactive motion.

**Background:** Plain `paper`. No patterns, no gradients, no decorative shapes.

**Vertical spacing:** Object vertically centered with text. Section padding `clamp(6rem, 12vh, 10rem)` top and bottom.

### Section 3: Content Previews (3-Column Grid)

Three preview cards introducing each content type. Not a duplicate of the content — more like editorial index cards.

**Layout:** 3 equal columns on desktop, stacked on mobile. Gap 32px.

**Each card:**
- Background: `surface`
- Border radius: `radius-lg`
- Padding: 32px
- Small icon or label at top (e.g., "Latest from the blog", "Selected projects", "Today's memos")
- Title of latest/most relevant item in Newsreader `text-xl`
- 1-line description in Inter `text-sm`, `ink-secondary`
- Link: "Read →", "View →", "Browse →" in `accent`, `text-sm`

**Memo preview card:** Shows the number of memos for today (e.g., "3 memos") instead of a single title, hinting at the stacked nature.

### Section 4: About Introduction Block

A short, personal introduction — not a full page, just a paragraph or two.

- Max-width: 680px, centered.
- Optional: Small circular avatar (64px, `radius-full`) to the left of the text on desktop, above on mobile.
- Text: `text-lg`, Inter 400, `ink-secondary`.
- Link to full About page if one exists, or link to contact.

### Section 5: Footer

- Minimal, 80px height.
- Left: Copyright, `text-xs`, `ink-tertiary`.
- Center: Small navigation links, `text-xs`.
- Right: RSS link, GitHub link, or other social — `text-xs`, `ink-tertiary`, hover `ink`.
- Top border: 1px solid `rgba(26,26,26,0.06)`.

---

## 4. Memo Experience (Detailed)

### 4.1 Information Architecture

```
/memos/                    → Memo index / explorer page
  ├── Date Selector        → Horizontal scrollable list of recent dates
  ├── Memo Stack           → Stacked cards for selected date
  └── Empty State          → Message when no memos for selected date

Content source: Hugo section `/content/memos/`
File naming: `YYYY-MM-DD-title.md` or grouped by date frontmatter
```

**Frontmatter per memo:**
```yaml
---
date: 2026-04-18T09:30:00+08:00
title: "Optional title"
tags: ["thought", "code"]
---
```

Memos without titles display the first ~80 characters of content as the card preview.

### 4.2 Memo Index Page Layout

**Header:**
- Page title: "Memos" in Newsreader `text-3xl`
- Subtitle: "Short notes, updated daily" in Inter `text-base`, `ink-secondary`

**Date Selector:**
- Horizontal scrollable row of date pills.
- Each pill shows: Day of week (Mon, Tue…), Day number, Month abbreviation.
- Active date (today by default): `accent` background with white text, `radius-full`.
- Past dates with memos: `ink` text, `surface` background.
- Past dates without memos: `ink-tertiary` text, transparent background, slightly muted.
- Future dates: Not shown or disabled.
- Scroll behavior: Snap to each pill (`scroll-snap-type: x mandatory`).
- Today is always visible on load; selector scrolls to center it.

**Memo Stack Area:**
- Centered container, max-width 640px.
- Background of the area is slightly darker `surface-warm` with `radius-lg`, creating a "desk surface" feel.
- Padding: 48px.

### 4.3 Stacked Card Behavior

**Default State (Collapsed Stack):**
- Up to 3 memo cards are visible, fanned slightly.
- Each card is offset: Card 1 at `rotate(-1deg) translateX(-4px)`, Card 2 at `rotate(0.5deg) translateX(2px) translateY(-8px)`, Card 3 at `rotate(-0.5deg) translateX(-2px) translateY(-16px)`.
- Only the top card shows its full preview text (~120 characters + "…").
- Lower cards show only the timestamp and a truncated preview line.
- Cards have `shadow-memo`, creating physical separation.

**Card Structure (Collapsed):**
- Top edge: Timestamp (`text-xs`, mono, `ink-tertiary`) + optional tag pill (`text-xs`, `radius-full`, `surface` background).
- Body: Preview text, Inter `text-base`, `ink`, max 2 lines, `overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2`.
- Bottom edge: "Expand ↓" hint, `text-xs`, `ink-tertiary`, appears on hover of the card.

**Expanded State:**
- Clicking a card expands it to full height.
- The expanded card moves to the top of the stack visually (z-index boost, `shadow-lg`).
- Other cards compress: they slide down slightly, reduce opacity to 0.6, and flatten their rotation to 0°.
- Expanded card shows:
  - Full timestamp
  - All tags
  - Full content rendered as markdown (paragraphs, links, inline code)
  - "Collapse ↑" control at bottom
- Only one card expanded at a time. Expanding a second card collapses the first.

**Multiple Memos (More than 3):**
- Show top 3 cards in the fan.
- Below the stack: "+2 more" indicator, `text-sm`, `ink-secondary`, clickable.
- Clicking reveals the remaining cards as a smooth vertical list beneath the stack, each with `shadow-sm`.

**Single Memo:**
- If only 1 memo for the day, show it centered with slight rotation (0.5°), no stacking. It feels like a single note placed on the desk.

### 4.4 Metadata on Cards

- **Timestamp:** `09:30 AM` or `14:15` — user preference. Always shown.
- **Tags:** Optional. Shown as small pills. Max 2 visible on collapsed card; overflow as "+1".
- **Title:** If present, shown in Newsreader `text-lg` above the preview body. Most memos won't have titles.

### 4.5 Active Card Distinction

- The top card in the stack (or the expanded card) has full opacity and the strongest shadow.
- Non-active cards have slightly reduced opacity (0.85) and lighter shadow.
- On hover of the stack, the hovered card lifts `translateY(-4px)` and gains full opacity.

### 4.6 Date Switching Transitions

1. User clicks a new date pill.
2. The active pill transitions background color (200ms).
3. The memo stack cross-fades out (150ms).
4. New stack cross-fades in with a slight `translateY(8px → 0)` (300ms).
5. Cards fan into position with 50ms stagger.

### 4.7 Empty State

When a selected date has no memos:
- The desk surface area remains.
- A centered, quiet message: "No memos for April 18." in Newsreader `text-xl`, `ink-tertiary`.
- Below: "Memos are usually written in the morning. Check back soon." in Inter `text-sm`.
- Optional: A small pencil or paper icon, monochrome, 48px, `ink-tertiary`.
- No call-to-action to "write one" — this is a read-only archive.

### 4.8 Mobile Adaptation

- Date selector becomes a horizontal swipeable row, full-bleed with 16px side padding.
- Memo cards stack vertically with reduced rotation (too much rotation feels chaotic on small screens).
- Card offset is purely vertical: Card 1 at `translateY(0)`, Card 2 at `translateY(-12px) scale(0.98)`, Card 3 at `translateY(-24px) scale(0.96)`.
- Tap to expand works the same. Expanded card pushes others down.
- Touch targets minimum 44px.
- Swiping left/right on the memo area could potentially switch dates (optional enhancement).

---

## 5. Blog System (Detailed)

### 5.1 Blog Index Page

**Header:**
- Title: "Writing" or "Blog" — Newsreader `text-3xl`
- Optional subtitle or description.

**Layout:** Single column, max-width 720px, centered.

**Article List:**
- Each entry is a row/block, not a card.
- Structure:
  - Date: `text-xs`, mono, `ink-tertiary`, left-aligned.
  - Title: `text-xl`, Newsreader 400, `ink`. Hover: color transitions to `accent`, 200ms.
  - Excerpt: `text-base`, Inter 400, `ink-secondary`, 2 lines max.
  - Tags: inline pills, `text-xs`, `radius-full`, `surface` background.
- Divider: 1px solid `rgba(26,26,26,0.06)` between entries.
- Spacing: 48px between entries.

**Filtering / Archive:**
- A subtle row above the list: "All", "Essays", "Tutorials", "Notes" — pill filters, `text-sm`.
- If using Hugo taxonomies, clicking a tag filters the list (JS-enhanced, falls back to tag page).
- Optional: Year-based archive sidebar on desktop (right side, sticky, `text-sm`, `ink-tertiary`).

### 5.2 Article Page Layout

**Header:**
- Title: `text-3xl` (desktop) / `text-2xl` (mobile), Newsreader 400, `ink`, max-width 680px.
- Meta row: Date · Reading time · Tags — `text-sm`, `ink-secondary`, Inter.
- Optional: Series indicator — "Part 3 of 5: Series Name" in `accent`, `text-sm`.

**Body:**
- Max-width: 680px, centered.
- Font: Inter 400, `text-base`, line-height 1.65.
- Paragraph spacing: 1.5em margin-bottom.

**Typography Hierarchy:**
- `h2`: `text-2xl`, Newsreader 400, margin-top 2.5em, margin-bottom 0.75em.
- `h3`: `text-xl`, Newsreader 400, margin-top 2em, margin-bottom 0.5em.
- `h4`: `text-lg`, Inter 500, margin-top 1.5em.
- `strong`: Inter 500, `ink`.
- `a`: `accent` color, underline on hover only. No permanent underlines.
- `blockquote`: Left border 2px `accent`, padding-left 24px, `ink-secondary`, Newsreader 400 italic, `text-lg`.
- `hr`: 1px solid `rgba(26,26,26,0.08)`, margin 3em auto, width 60%.

**Code Blocks:**
- Background: `#EDE8E0` (slightly darker than page).
- Border radius: `radius-md`.
- Font: JetBrains Mono, `text-sm`.
- Padding: 20px.
- Overflow-x: auto with subtle custom scrollbar.
- Inline code: `radius-sm`, background same as blocks, padding 2px 6px.

**Images & Captions:**
- Images: `radius-lg`, full width within the 680px column.
- Figure margin: 2em 0.
- Captions: `text-xs`, `ink-tertiary`, centered below image, margin-top 8px.

**Footnotes:**
- Divider: `hr` style.
- Footnote list: `text-sm`, `ink-secondary`, Inter.
- Backlinks: Small ↑ arrow in `accent`.

**Tags:**
- Shown at bottom of article.
- Pills: `radius-full`, `surface`, `text-sm`.

**Navigation:**
- Previous / Next article links at bottom.
- Layout: Flex row, space-between.
- Label: "Previous" / "Next" in `text-xs`, `ink-tertiary`.
- Title: `text-base`, `ink`, truncate at 1 line.
- Optional: "Related Posts" section — 2–3 cards below, `surface` background, `radius-lg`.

### 5.3 Archive / Filtering

- `/blog/tags/` and `/blog/categories/` pages use the same list layout but filtered.
- Year archive: Simple list grouped by year heading (Newsreader `text-xl`).

---

## 6. Projects System (Detailed)

### 6.1 Projects Index Page

**Header:**
- Title: "Selected Work" — Newsreader `text-3xl`
- Subtitle: Optional one-liner describing approach.

**Layout:**
- Featured projects: Large cards, 1 per row, max-width 960px, centered.
- Secondary projects: 2-column grid below, gap 32px.

**Featured Project Card:**
- Aspect ratio: 16:9 image (or placeholder surface) at top, `radius-xl`.
- Below image:
  - Project name: `text-2xl`, Newsreader 400.
  - One-line description: `text-base`, `ink-secondary`.
  - Metadata row: Role · Year · Status — `text-xs`, mono, `ink-tertiary`, separated by middots.
  - Tags: tech stack or categories as pills.
  - Link: "View case study →" or external link icon.
- Background: transparent (part of the page flow, not a card container).
- Hover: Image scales `1.02`, shadow deepens slightly. 300ms ease.

**Secondary Project Card:**
- Smaller: No image, or small 4:3 thumbnail.
- Background: `surface`, `radius-lg`, padding 24px.
- Project name: `text-xl`, Newsreader 400.
- Description: `text-sm`, `ink-secondary`, 2 lines.
- Metadata: `text-xs`, mono, `ink-tertiary`.
- Hover: `translateY(-2px)`, `shadow-md`.

**Status Indicators:**
- "Live", "In Progress", "Archived", "Concept"
- Small dot + label: Live = green dot (`#7BAE7F`), In Progress = amber (`#D4A373`), Archived = gray, Concept = `accent`.

### 6.2 Project Detail Page

**Header:**
- Project name: `text-4xl`, Newsreader 300.
- Tagline: `text-xl`, Inter 400, `ink-secondary`, max-width 600px.
- Metadata grid below: 3–4 columns on desktop (Role, Year, Stack, Status), 2 columns on mobile.
- Each meta item: Label (`text-xs`, mono, `ink-tertiary`) + Value (`text-sm`, Inter 500, `ink`).

**Hero Image:**
- Full-width within 1200px container, `radius-xl`, margin 48px 0.
- Could be a screenshot, mockup, or atmospheric photo.

**Content Body:**
- Max-width 680px, centered — same reading experience as blog.
- Case study content: Problem, Process, Solution, Outcome.
- Images interspersed: `radius-lg`, centered, with optional captions.
- Pull quotes: `blockquote` style, possibly larger (`text-2xl`).

**Navigation:**
- "Back to all projects" link at top (small, `ink-tertiary`).
- Previous / Next project at bottom, similar to blog navigation but with thumbnails.

### 6.3 Concise vs. Deep Entries

**Concise entry:**
- Project index card links to external URL (GitHub, live site).
- No detail page generated. Card is the entire presence.
- Indicated by `external: true` in frontmatter.

**Deep entry:**
- Has its own detail page with case-study content.
- `external` field absent or false.

**Frontmatter:**
```yaml
---
title: "Project Name"
description: "One-line summary"
role: "Design & Development"
year: 2025
status: "live"  # live, in-progress, archived, concept
stack: ["React", "Go", "PostgreSQL"]
featured: true
external: false
link: "https://example.com"
---
```

---

## 7. Hugo Information Architecture

### 7.1 Content Structure

```
content/
├── _index.md                    # Homepage content / frontmatter
├── about/
│   └── _index.md                # About page content
├── blog/
│   ├── _index.md                # Blog index page
│   ├── 2026-04-18-post-slug.md
│   └── 2026-04-10-another-post.md
├── projects/
│   ├── _index.md                # Projects index page
│   ├── project-one.md           # Featured / deep project
│   └── project-two.md           # External / concise project
└── memos/
    ├── _index.md                # Memos index page
    ├── 2026-04-18-morning.md
    ├── 2026-04-18-afternoon.md
    └── 2026-04-17-note.md
```

### 7.2 Taxonomies

```toml
[taxonomies]
  tag = 'tags'
  series = 'series'
  category = 'categories'  # Optional, for blog only
```

- **Tags:** Universal across blog, projects, memos.
- **Series:** Blog-only. For multi-part articles.

### 7.3 Template Structure

```
layouts/
├── _default/
│   ├── baseof.html              # Root layout: <html>, <head>, nav, footer
│   ├── list.html                # Generic list fallback
│   └── single.html              # Generic single fallback
├── partials/
│   ├── head.html                # Meta, fonts, CSS
│   ├── nav.html                 # Site navigation
│   ├── footer.html              # Site footer
│   ├── hero-3d.html             # 3D computer component (see note below)
│   ├── memo-card.html           # Individual memo card
│   ├── memo-stack.html          # Memo stack logic + container
│   ├── date-selector.html       # Date picker for memos
│   ├── project-card.html        # Project card (featured + secondary variants)
│   ├── article-item.html        # Blog list item
│   ├── tag-pill.html            # Reusable tag component
│   ├── prev-next.html           # Previous/next navigation
│   └── reduced-motion.html      # prefers-reduced-motion detection
├── index.html                   # Homepage
├── blog/
│   ├── list.html                # Blog index
│   └── single.html              # Article page
├── projects/
│   ├── list.html                # Projects index
│   └── single.html              # Project detail (only for non-external)
├── memos/
│   └── list.html                # Memo explorer (JS-enhanced)
└── about/
    └── list.html                # About page
```

### 7.4 Homepage Content Modules

The homepage is built from frontmatter-defined sections in `content/_index.md`:

```yaml
---
title: "Home"
hero:
  greeting: "Hello, I'm"
  name: "Alex Chen"
  statement: "I design and build quiet, intentional software."
  links:
    - text: "Read the blog"
      url: "/blog/"
    - text: "See projects"
      url: "/projects/"
    - text: "Browse memos"
      url: "/memos/"
about:
  text: "I'm a designer and developer based in..."
  avatar: "/images/avatar.jpg"
---
```

Content previews (latest blog, featured project, today's memos) are populated automatically via Hugo's `.Site.RegularPages` querying.

### 7.5 Memo Data Handling

Since memos are grouped by date, the memo list template should:
1. Query all memo pages.
2. Group them by date (YYYY-MM-DD).
3. Render a JSON data structure into the page for JavaScript consumption:
   ```json
   {
     "2026-04-18": [{"title":"...","content":"...","time":"09:30","tags":["thought"]}],
     "2026-04-17": [...]
   }
   ```
4. The date selector and memo stack are client-side rendered from this data.
5. This avoids page reloads when switching dates — critical to the tactile feel.

**Alternative (no-JS fallback):** Each date links to `/memos/2026/04/18/` with server-rendered cards. The JS-enhanced version intercepts these.

---

## 8. Frontend Implementation Guidance

### 8.1 Component Patterns

**3D Computer:**
- Implement as a lightweight Three.js scene OR a pre-rendered responsive image sequence OR a high-quality CSS/SVG composition.
- **Recommendation:** Use Three.js with a simple GLTF model (or primitive geometries) for the sculptural quality and subtle mouse-tilt interactivity. Keep the scene minimal — one object, one soft directional light, ambient light, ground shadow plane.
- If Three.js is too heavy, a meticulously drawn SVG with CSS transforms for tilt is acceptable.
- Screen content: Canvas texture or HTML overlay positioned to match the screen face.

**Memo Stack:**
- Pure CSS + vanilla JS. No framework needed.
- Use CSS custom properties for card rotation/offset so JS can update them cleanly.
- Expansion: Animate `max-height` or use the Web Animations API for height transitions. Avoid `height: auto` CSS transitions (they don't work).
- Consider FLIP technique if adding complex reordering animations.

**Date Selector:**
- Native horizontal scroll with `overflow-x: auto` and `scroll-snap-type`.
- JS handles click → update active state → trigger memo re-render.

### 8.2 Layout Behavior

- **Container:** `max-width: 1200px`, centered with `margin: 0 auto`, padding `0 24px` (mobile) / `0 48px` (desktop).
- **Reading column:** `max-width: 680px`, centered.
- **Breakpoints:**
  - `sm`: 640px — Minor adjustments.
  - `md`: 768px — Stack → columns for some layouts.
  - `lg`: 1024px — Full desktop layouts.
  - `xl`: 1280px — Max container width reached.
- **No fluid typography.** Use `clamp()` sparingly for hero sizes only. Prefer fixed sizes at breakpoints for predictability.

### 8.3 Responsive Behavior Summary

| Section | Mobile | Desktop |
|---------|--------|---------|
| Nav | Bottom drawer or scroll | Horizontal inline |
| Hero | Stacked, object on top | Two-column, asymmetric |
| Preview cards | Single column stack | 3-column grid |
| Blog list | Single column | Single column (same) |
| Blog article | Full width, 16px margins | Centered 680px |
| Projects index | Single column, all cards equal | Featured large, secondary 2-col |
| Project detail | Stacked meta | Meta grid |
| Memos | Vertical stack, swipe dates | Fanned stack, scroll dates |

### 8.4 Animation Implementation

| Animation | Technology | Notes |
|-----------|-----------|-------|
| Hero float | CSS `@keyframes` | Simple, performant |
| Screen glow | CSS `@keyframes` opacity | On a pseudo-element or canvas overlay |
| Cursor blink | CSS `@keyframes` steps(1) | JetBrains Mono character |
| Mouse tilt (hero) | JS + CSS `transform` | Throttle to RAF, max 5° |
| Page transitions | CSS + Hugo `main` wrapper | Fade/slide on `main` element |
| Card expand | WAAPI or CSS `max-height` | WAAPI preferred for height precision |
| Date switch | CSS `opacity` + `transform` | Cross-fade memo container |
| Stack fan | CSS `transition` on custom properties | Stagger via `transition-delay` |
| Hover lift | CSS `transition` | Universal `transition: transform 200ms ease-out, box-shadow 200ms ease-out` |

**Performance:**
- Use `transform` and `opacity` exclusively for animations. Avoid animating `width`, `height`, `top`, `left`.
- Add `will-change: transform` to the memo stack container sparingly.
- Lazy-load the Three.js scene — only initialize when the hero scrolls into view.

### 8.5 CSS Architecture

Use a single compiled CSS file (Hugo Pipes or PostCSS):

```css
/* Base */
@import "variables.css";      /* All tokens */
@import "reset.css";          /* Minimal reset */
@import "typography.css";     /* Font imports, scale */
@import "layout.css";         /* Containers, grid */

/* Components */
@import "nav.css";
@import "hero.css";
@import "memo-stack.css";
@import "blog.css";
@import "projects.css";
@import "footer.css";

/* Utilities */
@import "utilities.css";      /* Reduced motion, screen-reader only */
```

No utility-first framework (Tailwind) is recommended — the design is specific and bespoke. A small set of custom CSS properties and component classes will be cleaner and more maintainable for this aesthetic.

### 8.6 JavaScript Modules

```
assets/js/
├── main.js              # Entry point, imports modules
├── hero-3d.js           # Three.js scene init, mouse tracking
├── memos.js             # Date selector, stack rendering, expansion
├── nav.js               # Scroll behavior, mobile drawer
└── reduced-motion.js    # Detects preference, exports flag
```

**Bundle:** Use Hugo's built-in ESBuild pipeline. Target modern browsers (ES2020+).

---

## 9. Design Rationale

This concept fits the brief because it makes strong, opinionated choices rather than assembling trendy patterns.

**The 3D computer** is not decoration — it is the site's identity device. By treating it as a sculptural gallery piece rather than a gamer asset, it communicates that the owner values craft, physicality, and quiet personality. Its soft form and restrained motion prevent it from feeling like a gimmick.

**The memo stack** is the most distinctive interaction on the site, and it directly answers the "digital desk" metaphor. The fanned, tactile cards with their warm shadows and slight asymmetry evoke paper without descending into skeuomorphic excess. The date selector makes the archive browsable, and the default-to-today behavior makes it feel alive. This is not a blog wearing a costume — it is a genuinely different content pattern.

**The blog** stays conventional because long-form reading demands familiarity. By investing in typography, measure, and whitespace rather than layout tricks, the blog becomes a space of trust and calm. It contrasts intentionally with the more playful memo section.

**The projects section** acts as a curated gallery. The distinction between featured and secondary work, and between concise and deep entries, allows the owner to present their work honestly — not everything needs a case study, but selected works can be explored deeply.

**The visual system** uses warmth and restraint as its primary tools. The warm off-white background, the terracotta accent, the serif/sans pairing, and the soft physical shadows all contribute to a feeling of a personal, lived-in space rather than a corporate product page. There is no dark mode, no glassmorphism, no purple gradients — the identity is confident enough to be quiet.

**Hugo suitability** is maintained throughout. The memo explorer is the only JS-heavy feature, and it is implemented as a progressive enhancement over static date-grouped pages. All other templates are straightforward Hugo list/single pages. The theme is modular, reusable, and avoids app-style architecture.

This is a site that feels like a person made it — not a template, not a trend, not a startup.
