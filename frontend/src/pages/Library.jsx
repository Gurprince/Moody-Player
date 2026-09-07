import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiSearch } from "react-icons/fi";
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
    const updated = new URLSearchParams(params);
    if (next === mood) updated.delete("mood");
    else updated.set("mood", next);
    setParams(updated, { replace: true });
    setMood(next === mood ? null : next);
  };

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });
  const filtered = Boolean(q || mood);

  return (
    <div className="page library">
      <div className="page-head">
        <div>
          <h1 className="display">Library</h1>
          <p className="lede">
            Everything the player has collected, filed by the mood it was cued
            for.
          </p>
        </div>
      </div>

      <div className="library-controls">
        <form className="search" onSubmit={submit} role="search">
          <FiSearch size={16} strokeWidth={2} aria-hidden="true" />
          <label className="visually-hidden" htmlFor="library-search">
            Search by title or artist
          </label>
          <input
            id="library-search"
            type="search"
            placeholder="Search a title or an artist"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="search-go">
            Search
          </button>
        </form>

        <MoodPicker value={mood} onPick={pickMood} counts={counts} />
      </div>

      <div className="section-head library-results-head">
        <h2 className="display-sm">
          {mood ? (
            <>
              Filed under <span className="tint">{mood}</span>
            </>
          ) : q ? (
            <>Matching “{q}”</>
          ) : (
            "Every track"
          )}
        </h2>
        <div className="section-actions">
          {!loading && (
            <span className="micro tnum">
              {total} {total === 1 ? "track" : "tracks"}
            </span>
          )}
          {filtered && (
            <button type="button" className="pill-ghost" onClick={clearAll}>
              Clear filters
            </button>
          )}
          {songs.length > 0 && (
            <button
              type="button"
              className="pill-ghost"
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

      {loading && page === 1 && <TrackListSkeleton rows={10} layout="grid" />}

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

      {songs.length > 0 && (
        <TrackList tracks={songs} layout="grid" showMood={!mood} />
      )}

      {hasMore && (
        <button
          type="button"
          className="pill-ghost library-more"
          onClick={() => load(page + 1)}
          disabled={loading}
        >
          {loading ? "Loading…" : "Show more"}
        </button>
      )}
    </div>
  );
};

export default Library;
