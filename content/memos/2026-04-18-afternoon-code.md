---
date: 2026-04-18T11:15:00+08:00
tags: ["code"]
---

Spent the afternoon refining the memo card stack interaction. The key insight: the fan effect needs to feel physical but not chaotic.

Current approach uses subtle rotation (±0.5deg) and vertical offsets. On mobile, rotation is too noisy, so it switches to pure vertical stacking with scale reduction.
