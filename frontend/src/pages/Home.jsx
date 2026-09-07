import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import FacialExpression from "../components/FacialExpression.jsx";
import MoodPicker from "../components/MoodPicker.jsx";
import TrackList, { TrackListSkeleton } from "../components/TrackList.jsx";
import { usePlayer } from "../context/usePlayer.js";
import { fetchMoodSongs, readError, MOOD_COPY } from "../api.js";
import "./Home.css";

const Home = () => {
  const { mood, setMood, recordReading, play } = usePlayer();
  const [songs, setSongs] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null); // "camera" | "picked"
  const restored = useRef(false);

  const load = useCallback(
    async (nextMood, how, scores) => {
      setMood(nextMood);
      setSource(how);
      setFetching(true);
      setError(null);
      try {
        const found = await fetchMoodSongs(nextMood);
        setSongs(found);
        /* Re-cueing a remembered mood on load isn't a new reading. */
        if (how !== "restored") {
          recordReading({
            mood: nextMood,
            how,
            scores: scores || null,
            found: found.length,
          });
        }
      } catch (err) {
        setSongs([]);
        setError(
          readError(
            err,
            "The song service didn't answer. Make sure the server is running on port 3000, then try again."
          )
        );
      } finally {
        setFetching(false);
      }
    },
    [recordReading, setMood]
  );

  /* The site remembers the last mood, so come back with it already cued. */
  useEffect(() => {
    if (restored.current || !mood) return;
    restored.current = true;
    load(mood, "restored");
  }, [mood, load]);

  return (
    <div className="home">
      <section className="stage">
        <div className="stage-inner">
          <FacialExpression
            onRead={(nextMood, scores) => load(nextMood, "camera", scores)}
            fetching={fetching}
            mood={mood}
          >
            <h1 className="display stage-title">
              {mood ? (
                <>
                  Today you read <span className="tint">{mood}</span>
                </>
              ) : (
                "Play what your face already said"
              )}
            </h1>
          </FacialExpression>

          <MoodPicker
            value={mood}
            onPick={(nextMood) => load(nextMood, "picked")}
            disabled={fetching}
          />

          <p className="stage-note">
            {mood
              ? MOOD_COPY[mood].line
              : "Look at the camera, or pick a mood by hand."}
          </p>
        </div>
      </section>

      <section className="page cued">
        <div className="section-head">
          <h2 className="display-sm">
            {mood ? (
              <>
                Cued for <span className="tint">{mood}</span>
              </>
            ) : (
              "Nothing cued yet"
            )}
          </h2>
          {songs.length > 0 && !fetching && (
            <div className="section-actions">
              <span className="micro tnum">
                {songs.length} {songs.length === 1 ? "track" : "tracks"}
                {source === "camera" ? " · from your face" : ""}
              </span>
              <button
                type="button"
                className="pill-ghost"
                onClick={() => play(songs, 0)}
              >
                Play all
              </button>
            </div>
          )}
        </div>

        {error && (
          <p className="note note-stop" role="alert">
            {error}
          </p>
        )}

        {fetching && <TrackListSkeleton rows={6} layout="rail" />}

        {!fetching && !error && songs.length === 0 && (
          <p className="blank">
            {mood && source
              ? `Nothing came back for ${mood}. Try another mood, or `
              : "Read your mood or pick one, and the tracks land here. You can also "}
            <Link className="blank-link" to="/library">
              browse the library
            </Link>
            .
          </p>
        )}

        {!fetching && songs.length > 0 && (
          <TrackList tracks={songs} layout="rail" showMood={false} />
        )}
      </section>
    </div>
  );
};

export default Home;
