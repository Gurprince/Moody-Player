# Moody Player

Reads the mood on your face through the webcam and cues Punjabi tracks that match it.
Expression detection runs entirely in the browser — only the resulting mood word is
sent to the server to look up music.

## What's in it

- **Read a mood** — the camera samples ~10 frames over three seconds and averages
  them, weighted by detector confidence, so a read reflects your face rather than
  the instant you happened to click. A manual mood picker covers anyone who would
  rather not turn the camera on.
- **Mood blends** — a read returns the full distribution, and a 70/20/10 result
  builds a playlist in those proportions instead of pretending the top mood is the
  only one present.
- **Ambient mode** — leave it watching. Every few minutes it looks again, and when
  your face has actually moved on it lengthens the queue rather than cutting the
  music off.
- **Room mode** — reads every face in frame and cues for the room, not for whoever
  is nearest the camera.
- **Learns what you skip** — skips, saves and thumbs-down are recorded against the
  mood they happened in and reorder what comes back next time. No account needed;
  the browser holds an anonymous id.
- **Journal** — every reading charted over time, with a weekday breakdown and a
  table view.
- **Library** — everything collected so far, searchable and filterable by mood.
- **Player** — a persistent dock with queue, shuffle, repeat, volume and seeking
  that keeps playing as you move between pages.
- **Add a track** — upload audio and cover art into the library under a chosen mood.

## Where the music comes from

Sources live behind an adapter (`backend/src/service/sources/`) and are tried in
order, falling back to the stored library when none answer. The active source is
the iTunes Search API: no key, and an accurate Punjabi catalogue when the storefront
is pinned to India. Its previews are 30 seconds; tracks uploaded through the app play
in full. Adding a provider is one entry in `sources/index.js`.

## Stack

React 19 · Vite · React Router · face-api.js — Express · MongoDB (Mongoose) · ImageKit

## Running it

Backend:

```bash
cd backend
npm install
cp .env.example .env   # then fill in the values
node server.js         # http://localhost:3000
```

Frontend:

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Set `VITE_API_URL` in `frontend/.env` if the API isn't on `http://localhost:3000`.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/songs?mood=` | Tracks for one mood |
| `GET` | `/songs?blend=neutral:0.7,happy:0.2` | A playlist blended in those proportions |
| `GET` | `/library?q=&mood=&page=` | The saved library, searchable and paginated |
| `GET` | `/moods` | Track count per mood |
| `GET` | `/health` | Which providers are answering, and library size |
| `POST` | `/feedback` | One signal (save / unsave / play / skip / down) about a track |
| `GET` | `/taste` | What this browser's signals add up to |
| `POST` | `/songs` | Add a track (multipart: title, artist, mood, audio, cover) |

Requests carry an `X-Client-Id` header — an anonymous per-browser id used to
personalise ranking. Search and upload endpoints are rate limited.
