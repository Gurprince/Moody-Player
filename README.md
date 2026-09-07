# Moody Player

Reads the mood on your face through the webcam and cues Punjabi tracks that match it.
Expression detection runs entirely in the browser — only the resulting mood word is
sent to the server to look up music.

## What's in it

- **Read a mood** — webcam expression detection (face-api.js) mapped to happy / sad /
  angry / neutral, with a confidence readout. A manual mood picker covers anyone who
  would rather not turn the camera on.
- **Library** — everything collected so far, searchable and filterable by mood.
- **Player** — a persistent dock with queue, shuffle, repeat, volume and seeking that
  keeps playing as you move between pages.
- **Saved** — bookmarked tracks and past readings, kept in the browser.
- **Add a track** — upload audio and cover art into the library under a chosen mood.

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
| `GET` | `/songs?mood=` | Tracks for a mood, fresh from JioSaavn, falling back to the library |
| `GET` | `/library?q=&mood=&page=` | The saved library, searchable and paginated |
| `GET` | `/moods` | Track count per mood |
| `POST` | `/songs` | Add a track (multipart: title, artist, mood, audio, cover) |
