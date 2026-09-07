import React, { useEffect, useRef, useState } from "react";
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

  const load = async (nextMood, how, scores) => {
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
  };

  /* The site remembers the last mood, so come back with it already cued. */
  useEffect(() => {
    if (restored.current || !mood) return;
    restored.current = true;
    load(mood, "restored");
  }, [mood]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page home">
      <div className="home-intro">
        <h1 className="page-title">
          Play what your
          <br />
          face already said
        </h1>
        <p className="page-lede">
          One look at the camera sorts you into happy, sad, angry or neutral,
          and the player fills up with Punjabi tracks cut to that mood. No
          camera? Pick the mood yourself.
        </p>
      </div>

      <div className="home-deck">
        <div className="home-instrument">
          <FacialExpression
            onRead={(nextMood, scores) => load(nextMood, "camera", scores)}
            fetching={fetching}
            mood={mood}
          />
        </div>

        <div className="home-results">
          <section className="home-block">
            <div className="home-block-head">
              <h2 className="section-title">Or choose a mood</h2>
            </div>
            <MoodPicker
              value={mood}
              onPick={(nextMood) => load(nextMood, "picked")}
              disabled={fetching}
            />
          </section>

          <section className="home-block">
            <div className="home-block-head">
              <h2 className="section-title" id="cued">
                {mood ? (
                  <>
                    Cued for <em>{mood}</em>
                  </>
                ) : (
                  "Nothing cued yet"
                )}
              </h2>
              {songs.length > 0 && !fetching && (
                <div className="home-block-actions">
                  <span className="micro">
                    {songs.length} {songs.length === 1 ? "track" : "tracks"}
                    {source === "camera" ? " · from your face" : ""}
                  </span>
                  <button
                    type="button"
                    className="btn-quiet"
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

            {fetching && <TrackListSkeleton rows={5} />}

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

            {!fetching && songs.length > 0 && <TrackList tracks={songs} />}

            {mood && songs.length > 0 && (
              <p className="home-mood-note">{MOOD_COPY[mood].line}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Home;
