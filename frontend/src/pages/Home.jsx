import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import FacialExpression from "../components/FacialExpression.jsx";
import MoodPicker from "../components/MoodPicker.jsx";
import TrackList, { TrackListSkeleton } from "../components/TrackList.jsx";
import TasteBar from "../components/TasteBar.jsx";
import { usePlayer } from "../context/usePlayer.js";
import { fetchMoodSongs, readError, describeBlend, MOOD_COPY } from "../api.js";
import "./Home.css";

const Home = () => {
  const {
    mood,
    setMood,
    recordReading,
    play,
    enqueue,
    track,
    language,
    genre,
    setLanguage,
    setGenre,
  } = usePlayer();
  const [songs, setSongs] = useState([]);
  const [blend, setBlend] = useState(null);
  const [personalised, setPersonalised] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null); // camera | picked | ambient
  const [drift, setDrift] = useState(null);
  const [feeling, setFeeling] = useState(null);
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
      if (how !== "feeling") setFeeling(null);
      try {
        const result = await fetchMoodSongs(nextMood, scores, {
          language,
          genre,
          feeling: meta.feeling,
        });
        if (result.feeling) setFeeling(result.feeling);
        /* A typed feeling works out its own mood — adopt it so the whole
           site tints to what the words actually meant. */
        const settled = result.mood || nextMood;
        if (settled !== nextMood) setMood(settled);
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
            mood: settled,
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
    [recordReading, setMood, enqueue, language, genre]
  );

  /* The site remembers the last mood, so come back with it already cued. */
  useEffect(() => {
    if (restored.current || !mood) return;
    restored.current = true;
    load(mood, "restored");
  }, [mood, load]);

  /* Changing language or genre re-cues straight away — waiting for another
     read would make the picker feel broken. */
  const firstTaste = useRef(true);
  useEffect(() => {
    if (firstTaste.current) {
      firstTaste.current = false;
      return;
    }
    if (!mood) return;
    if (feeling?.text) load(mood, "feeling", null, { feeling: feeling.text });
    else load(mood, source === "camera" ? "camera" : "picked");
  }, [language, genre]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRead = useCallback(
    (nextMood, scores, meta) =>
      load(nextMood, meta?.ambient ? "ambient" : "camera", scores, meta),
    [load]
  );

  const handleFeeling = useCallback(
    (text) => load(mood || "neutral", "feeling", null, { feeling: text }),
    [load, mood]
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

          <TasteBar
            language={language}
            genre={genre}
            onLanguage={setLanguage}
            onGenre={setGenre}
            onFeeling={handleFeeling}
            busy={fetching}
          />

          <p className="stage-note">
            {mood
              ? MOOD_COPY[mood].line
              : "Look at the camera, pick a mood, or just say how you feel."}
          </p>
        </div>
      </section>

      <section className="page cued">
        <div className="section-head">
          <h2 className="display-sm">
            {feeling ? (
              <>
                Cued for <span className="tint">{feeling.text}</span>
              </>
            ) : mood ? (
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

        {!fetching && songs.length > 0 && (
          <div className="cue-facts">
            {feeling && (
              <span className="tag tag-live">
                {feeling.understood
                  ? `Your words: ${feeling.matched.join(", ")}`
                  : `Searched “${feeling.text}”`}
              </span>
            )}
            {mixed && <span className="tag">Mixed {blendLine}</span>}
            {source === "camera" && <span className="tag">From your face</span>}
            <span className="tag">{language}</span>
            {genre !== "any" && <span className="tag">{genre}</span>}
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
