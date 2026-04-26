---
title: "Typography on the Web: A Practical Guide"
date: 2026-04-10T09:00:00+08:00
tags: ["typography", "css", "tutorial"]
series: "Web Fundamentals"
---

Good typography is invisible. When it's done well, readers simply enjoy the content without thinking about the letters. When it's done poorly, reading becomes a chore.

## The basics

### Measure

The measure (line length) should be between 45 and 75 characters. I prefer around 65 characters for body text. Too wide and the eye loses its place; too narrow and reading feels choppy.

### Line height

Body text typically needs a line height of 1.5 to 1.7. Headings can be tighter — around 1.2 to 1.3.

```css
body {
  font-size: 16px;
  line-height: 1.65;
  max-width: 65ch;
}
```

### Scale

Use a consistent typographic scale. I prefer a major third (1.25 ratio) for most projects. It creates enough contrast between sizes without feeling dramatic.

## Choosing typefaces

For body text, choose something highly readable at small sizes. Inter, Source Serif, and Newsreader are all excellent choices.

For display text, you have more freedom. Serif typefaces like Newsreader or Freight bring warmth and editorial character. Sans serifs like Söhne or Graphik feel modern and clean.

## Spacing

Don't crowd your text. Whitespace is not empty space — it's a design element that gives your content room to breathe.

- Paragraph spacing: 1.5em
- Heading margin-top: 2–3em
- Heading margin-bottom: 0.5–0.75em

## Conclusion

Typography is 90% of web design. Master it, and everything else becomes easier.
