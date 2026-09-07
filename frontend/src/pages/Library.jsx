import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import TrackList, { TrackListSkeleton } from "../components/TrackList.jsx";
import MoodPicker from "../components/MoodPicker.jsx";
import { usePlayer } from "../context/usePlayer.js";
import { fetchLibrary, fetchMoodCounts, readError } from "../api.js";
import "./Library.css";

const Library = () => {
  const [params, setParams] = useSearchParams();
  const { play, setMood } = usePlayer();

  const q = params.get("q") || "";
  const mood = params.get("mood") || "";

  const [draft, setDraft] = useState(q);
  const [songs, setSongs] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [counts, setCounts] = useState(null);
  const firstLoad = useRef(true);

  useEffect(() => setDraft(q), [q]);

  useEffect(() => {
    fetchMoodCounts()
      .then(setCounts)
      .catch(() => setCounts(null));
  }, []);

  const load = useCallback(
    async (nextPage) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchLibrary({ q, mood, page: nextPage });
        setSongs((current) =>
          nextPage === 1 ? result.songs : [...current, ...result.songs]
        );
        setTotal(result.total);
        setHasMore(result.hasMore);
        setPage(nextPage);
      } catch (err) {
        setError(
          readError(
            err,
            "The library didn't answer. Make sure the server is running on port 3000."
          )
        );
        if (nextPage === 1) setSongs([]);
      } finally {
        setLoading(false);
        firstLoad.current = false;
      }
    },
    [q, mood]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const submit = (event) => {
    event.preventDefault();
    const next = new URLSearchParams(params);
    if (draft.trim()) next.set("q", draft.trim());
    else next.delete("q");
    setParams(next, { replace: true });
  };

  const pickMood = (next) => {
    const params2 = new URLSearchParams(params);
    if (next === mood) params2.delete("mood");
    else params2.set("mood", next);
    setParams(params2, { replace: true });
    setMood(next === mood ? null : next);
  };

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });
  const filtered = Boolean(q || mood);

  return (
    <div className="page library">
      <div className="library-head">
        <h1 className="page-title">Library</h1>
        <p className="page-lede">
          Everything the player has collected so far, filed by the mood it was
          cued for. Search it, or narrow it down to one mood.
        </p>
      </div>

      <form className="search" onSubmit={submit} role="search">
        <label className="visually-hidden" htmlFor="library-search">
          Search by title or artist
        </label>
        <input
          id="library-search"
          className="search-input"
          type="search"
          placeholder="Search a title or an artist"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="btn search-submit">
          Search
        </button>
      </form>

      <MoodPicker value={mood} onPick={pickMood} counts={counts} />

      <div className="library-results">
        <div className="library-results-head">
          <h2 className="section-title">
            {mood ? (
              <>
                Filed under <em>{mood}</em>
              </>
            ) : q ? (
              <>
                Matching <em>{q}</em>
              </>
            ) : (
              "Every track"
            )}
          </h2>
          <div className="library-results-actions">
            {!loading && (
              <span className="micro tnum">
                {total} {total === 1 ? "track" : "tracks"}
              </span>
            )}
            {filtered && (
              <button type="button" className="btn-quiet" onClick={clearAll}>
                Clear filters
              </button>
            )}
            {songs.length > 0 && (
              <button
                type="button"
                className="btn-quiet"
                onClick={() => play(songs, 0)}
              >
                Play all
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="note note-stop" role="alert">
            {error}
          </p>
        )}

        {loading && page === 1 && <TrackListSkeleton rows={6} />}

        {!loading && !error && songs.length === 0 && (
          <p className="blank">
            {filtered
              ? "Nothing here matches that. Clear the filters, or "
              : "The library is empty so far. Read a mood on the home page to start filling it, or "}
            <Link className="blank-link" to="/upload">
              add a track yourself
            </Link>
            .
          </p>
        )}

        {songs.length > 0 && <TrackList tracks={songs} showMood={!mood} />}

        {hasMore && (
          <button
            type="button"
            className="btn-quiet library-more"
            onClick={() => load(page + 1)}
            disabled={loading}
          >
            {loading ? "Loading…" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
};

export default Library;
