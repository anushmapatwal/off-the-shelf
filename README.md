# Off the Shelf

A read-it-later app that matches your saved things to the time you actually have.
You tell it when you need to stop; it hands you one thing that fits.

Designed and built by Anushma Patwal, with Claude.

## Running it locally

```bash
npm install
npm run dev
```

## Where things are

| File | What it does |
| --- | --- |
| `src/App.jsx` | The clock page: greeting, readout, actions |
| `src/Clock.jsx` | The clock itself — drag interaction, arc, hands |
| `src/Logo.jsx` | The "Off the Shelf" lockup |
| `src/shelf.js` | Placeholder saved items, replaced in session 2 |
| `public/scene.jpg` | The illustrated room behind everything |

## How the clock works

- The dial is a real clock. A full sweep of the brass hand is one hour.
- You drag the hand to **when you need to stop**. The amber arc shows the time
  between now and then.
- End times snap to the nearest five minutes, so the readout says "Until 6:30"
  rather than "Until 6:29".
- The window quietly counts down: come back ten minutes later and you have ten
  minutes less.
- Arrow keys nudge the end time by five minutes; the clock is a labelled slider
  for screen readers.

## Build plan

1. **The clock** — done.
2. The shelf and the clock-to-shelf reveal.
3. Saving, reading and reflecting, with AI filling in link details.
4. The empty shelf, Substack suggestions, and polish.
