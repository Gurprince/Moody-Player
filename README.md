# Moody Player

Reads the mood on your face through the webcam and cues Punjabi tracks that match it.
Expression detection runs entirely in the browser — only the resulting mood word is
sent to the server to look up music.

## What's in it

- **Read a mood** — the camera opens on the click, samples ~10 frames over three
  seconds weighted by detector confidence, and closes again the moment it is done.
  Nothing turns it on at page load, and only ambient mode keeps it running.
- **Say it in your own words** — type "nostalgic", "hyped", "heartbroken" and the
  words become the search. Known words also set the mood the site tints to; a word
  it doesn't know still shapes the search, and it says so rather than guessing.
- **Language and genre** — ten languages and ten genres. Storefront and query are
  built per language, and results are re-ranked on the genre the provider reports
  so a request for Korean never comes back Punjabi. Signed in, the choice follows
  your account.
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
- **Accounts** — optional email and password. Everything works signed out, on one
  device; sign in and your bookmarks, journal and taste follow you anywhere. Whatever
  the browser collected beforehand moves onto the account on the way in.
- **Library** — everything collected so far, searchable and filterable by mood.
- **Player** — a persistent dock with queue, shuffle, repeat, volume and seeking
  that keeps playing as you move between pages.
- **Add a track** — upload audio and cover art into the library under a chosen mood.

## Where the music comes from

Sources live behind an adapter (`backend/src/service/sources/`) and are tried in
order, falling back to the stored library when none answer. The active source is
the iTunes Search API: no key, and an accurate catalogue per language once the
storefront is pinned. Its previews are 30 seconds; tracks uploaded through the app
play in full. Adding a provider is one entry in `sources/index.js`.

Two things the provider makes you work around, both handled in `service/taste.js`:
its search is relevance-ranked rather than filtered, so a query longer than about
two words drifts off-language — queries stay short and walk a ladder from specific
to loose, and results are re-ordered on the genre it reports. And the Korean
storefront returns nothing for any query at all, so Korean is served from the US
one.

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
| `GET` | `/songs?mood=&lang=&genre=` | Tracks for one mood, language and genre |
| `GET` | `/songs?blend=neutral:0.7,happy:0.2` | A playlist blended in those proportions |
| `GET` | `/songs?feeling=nostalgic` | Tracks for a feeling in someone's own words |
| `GET` | `/options` | The languages, genres and feeling words on offer |
| `GET` | `/library?q=&mood=&page=` | The saved library, searchable and paginated |
| `GET` | `/moods` | Track count per mood |
| `GET` | `/health` | Which providers are answering, and library size |
| `POST` | `/feedback` | One signal (save / unsave / play / skip / down) about a track |
| `GET` | `/taste` | What this browser's signals add up to |
| `POST` | `/songs` | Add a track (multipart: title, artist, mood, audio, cover) |
| `POST` | `/auth/register` | Create an account, adopting this browser's data |
| `POST` | `/auth/login` | Sign in, adopting this browser's data |
| `POST` | `/auth/logout` | Clear the session |
| `GET` | `/auth/me` | The signed-in user, with their bookmarks and journal |
| `PUT` | `/me/saved` | Replace the account's bookmarks |
| `PUT` | `/me/readings` | Replace the account's journal |
| `PUT` | `/me/prefs` | Save the account's language and genre |

Signed out, requests carry an `X-Client-Id` header — an anonymous per-browser id
that personalises ranking without an account. Signing in moves those signals onto
the account and the id stops being used. Search, upload and sign-in endpoints are
rate limited.

## Accounts and sessions

Passwords are hashed with bcrypt (12 rounds) and the session travels in an
httpOnly, sameSite cookie, so page scripts can never read the token. Because the
cookie is credentialed, the API names its allowed origin explicitly — set
`FRONTEND_URL` to wherever the frontend runs (comma-separate several). Sign-in
failures return one message whether or not the email exists, so the endpoint
can't be used to discover who has an account.

Signing out clears bookmarks and the journal from the device — they stay on the
account — so the next person at a shared browser doesn't inherit them.
