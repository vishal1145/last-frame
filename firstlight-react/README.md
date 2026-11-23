# First Light Films — React landing page

Cinematic product-ad agency landing page (Vite + React 18).

## Run
```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
```

## Where things live
- `src/data.js` — ALL content: ticker lines, projects, services, process steps, carousel tiles, email. Edit here first.
- `src/components/` — one component per section.
- `src/styles.css` — the full design system (tokens at the top of `:root`).

## Notes
- The booking form (`src/components/Contact.jsx`) currently shows a success message on submit — wire `onSubmit` to your backend/email service.
- Carousel tiles are self-playing animated placeholders; swap each `<Tile/>` for a `<video muted autoPlay loop playsInline src=...>` when you have real footage.
- Client marquee intentionally shows categories, not fake brands — drop your real logos into `Clients.jsx`.
