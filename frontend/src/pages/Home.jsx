import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import FacialExpression from "../components/FacialExpression.jsx";
import MoodPicker from "../components/MoodPicker.jsx";
import TrackList, { TrackListSkeleton } from "../components/TrackList.jsx";
import { usePlayer } from "../context/usePlayer.js";
import { fetchMoodSongs, readError, describeBlend, MOOD_COPY } from "../api.js";
import "./Home.css";

const Home = () => {
  const { mood, setMood, recordReading, play, enqueue, track } = usePlayer();
  const [songs, setSongs] = useState([]);
  const [blend, setBlend] = useState(null);
  const [personalised, setPersonalised] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null); // camera | picked | ambient
  const [drift, setDrift] = useState(null);
  const restored = useRef(false);
  const playingRef = useRef(false);

  useEffect(() => {
    playingRef.current = Boolean(track);
  }, [track]);

  const load = useCallback(
    async (nextMood, how, scores, meta = {}) => {
      setMood(nextMood);
      setSource(how);
      setFetching(true);
      setError(null);
      try {
        const result = await fetchMoodSongs(nextMood, scores);
        setSongs(result.songs);
        setBlend(result.blend);
        setPersonalised(result.personalised);

        /* Ambient shouldn't cut the music off — it lengthens the queue and
           says so, rather than replacing what you are listening to. */
        if (meta.ambient && playingRef.current) {
          const added = enqueue(result.songs);
          setDrift(
            added
              ? `Your face changed — ${added} ${
                  added === 1 ? "track" : "tracks"
                } added to the queue`
              : null
          );
        } else {
          setDrift(null);
        }

        /* Re-cueing a remembered mood on load isn't a new reading. */
        if (how !== "restored") {
          recordReading({
            mood: nextMood,
            how,
            scores: scores || null,
            found: result.songs.length,
            faces: meta.faces || 1,
          });
        }
      } catch (err) {
        setSongs([]);
        setBlend(null);
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
    [recordReading, setMood, enqueue]
  );

  /* The site remembers the last mood, so come back with it already cued. */
  useEffect(() => {
    if (restored.current || !mood) return;
    restored.current = true;
    load(mood, "restored");
  }, [mood, load]);

  const handleRead = useCallback(
    (nextMood, scores, meta) =>
      load(nextMood, meta?.ambient ? "ambient" : "camera", scores, meta),
    [load]
  );

  const blendLine = describeBlend(blend);
  const mixed = blend && blend.length > 1;

  return (
    <div className="home">
      <section className="stage">
        <div className="stage-inner">
          <FacialExpression onRead={handleRead} fetching={fetching} mood={mood}>
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

        {!fetching && (mixed || source === "camera" || personalised || drift) && (
          <div className="cue-facts">
            {mixed && <span className="tag">Mixed {blendLine}</span>}
            {source === "camera" && <span className="tag">From your face</span>}
            {source === "ambient" && <span className="tag">Ambient read</span>}
            {personalised && <span className="tag">Tuned to your skips</span>}
            {drift && <span className="tag tag-live">{drift}</span>}
          </div>
        )}

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
          <TrackList tracks={songs} layout="rail" showMood={mixed} />
        )}
      </section>
    </div>
  );
};

export default Home;
