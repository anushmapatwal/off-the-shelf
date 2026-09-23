# Build log

A running record of what shipped, when, and what it took.

## 23 September 2026 — Session 1: the clock

**Shipped:** the welcome clock. Illustrated room backdrop, the Off the Shelf
lockup, a draggable red alarm clock that sets an end time, a live readout
("Until 6:30 · 26 minutes"), and a peek at what fits.

**Decisions made along the way**

- The clock sets an **end time**, not a duration. People think "I'm free until
  6:30", not "I have 26 minutes", and it saves them the arithmetic.
- The headline still asks "How much time do you have?" and the readout answers
  in both forms, so the question stays warm without confusing the input.
- A full sweep of the hand is one hour, so a 25-minute window is a 150° arc —
  big enough to feel, unlike a 12-hour dial where it would be 12°.
- End times snap to five-minute marks. Durations don't, so the readout keeps its
  honest "27 minutes".
- The app opens with the end time already set, about 25 minutes out. Most visits
  should be one tap.

**Built with:** React + Vite, hand-written SVG for the clock (no animation tool,
no illustration files) so every part of it can be changed in a sentence.

**Time:** one session, from the visual direction to a deployed page.

## 23 September 2026 — Session 2: the shelf and the book

**Shipped:** "From your shelf" is no longer a dead-end popup. It changes the
scene: the room becomes the shelf illustration, the shelf softens, and the book
comes forward and opens, with what fits your window written on its pages —
the closest fit on the left, everything else that fits on the right.

**Also this session:** the welcome page was rebuilt against the Figma design —
the scalloped bubble, the blue/red palette, Satoshi throughout, and the clock
illustration with live hands, a time arc and a drag handle drawn over it.

**Decisions**

- The clock illustration is used with no hands drawn in, so the real hands can
  move over it. The page overlays are positioned from the dial's measured centre
  and radius, which keeps them aligned at any size.
- The book's pages are real text, not an image, so what you saved is readable
  and clickable.
- Reduced-motion skips straight to the open book.

