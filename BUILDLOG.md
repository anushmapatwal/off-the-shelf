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


## 24 September 2026 — Session 3: saving, and the two quiet states

**Shipped:** "Save to shelf" — a dialog that takes a link and guesses the type,
the source and a length from the URL, then keeps it on this device. And the two
states the book had been skipping over.

*Not enough time.* The book used to say "Nothing fits that window" and then show
an empty heading on the right-hand page. It now says how short you are — "the
shortest thing here is 6 min and you have 3" — and lists the shelf shortest
first, so the gap is something you can act on.

*An empty shelf.* The idea this app started from: one book on an empty shelf
that asks to be filled. The left page reads "Nothing here yet", with a single
action — *Add to this shelf* — and the right page is left genuinely blank.

**Decisions**

- The no-fit copy names the number, not the failure. "Nudge the clock a little"
  is a move; "nothing fits" is a dead end.
- The empty page has one action, not two. A second choice at the moment of
  having nothing is a way of avoiding the first.
- On a phone the book is too small to write inside, so it opens at the top and
  its pages are laid out on a sheet of paper below it.
- `?empty` in the URL shows the empty state without clearing what you saved —
  useful for screenshots of a state you can only see once.

## 25 September 2026 — Session 4: the link reads itself

**Shipped:** paste a link into *Save to shelf* and the form fills itself in —
title, source, type and length. `/api/meta` fetches the page and reads it:
OpenGraph tags for the title and publication, `lengthSeconds` for a YouTube
video, `music:duration` or a JSON-LD `PT1H4M20S` for a podcast or talk, and a
word count at 220 words a minute for an article. Where a page still won't say
how long it is, Claude Haiku is asked for an estimate from the title and type,
and the number is marked as one.

**Decisions**

- It never overwrites you. Each field remembers whether you typed in it; the
  reader fills only what you haven't touched.
- The same code answers `/api/meta` on Vercel and in `npm run dev`, through a
  small Vite middleware — so the dev server isn't a different app.
- Timeouts are set so the whole thing answers inside Vercel's 10 seconds:
  6s for the page, 3.5s for the estimate.
- Podcast pages don't use the OpenGraph duration tag; they bury the number in
  the JSON they ship to their own player. Apple counts in milliseconds under
  `durationInMilliseconds`, Spotify under `duration_ms`, and both name the show
  in there too — so an episode saves with its real length and the show's name,
  with no API key anywhere.
- A failed read is not a dead end. The address bar guess (type and a default
  length from the domain) stays in the form, and the status line says so.
