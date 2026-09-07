import React, { useCallback, useEffect, useRef, useState } from "react";
import { FiUsers, FiRadio } from "react-icons/fi";
import { Rings } from "./Chrome.jsx";
import { loadReader, readFace, MOODS, moodDistance } from "../lib/faceReader.js";
import useStoredState from "../hooks/useStoredState.js";
import "./FacialExpression.css";

/** How often ambient mode takes another look. */
const AMBIENT_EVERY_MS = 3 * 60 * 1000;
/** How much the face has to change before the queue is worth disturbing. */
const AMBIENT_SHIFT = 0.28;

/** Minutes until the next ambient look. */
const Countdown = ({ until }) => {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, []);
  if (!until) return null;
  const left = Math.max(0, Math.round((until - Date.now()) / 60000));
  return (
    <span className="tnum">
      {left === 0 ? " Any moment now." : ` Next look in ${left} min.`}
    </span>
  );
};

const FacialExpression = ({ onRead, fetching, mood, children }) => {
  const videoRef = useRef(null);
  const abortRef = useRef(null);
  const lastScores = useRef(null);

  const [phase, setPhase] = useState("starting"); // starting | live | blocked
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [notice, setNotice] = useState(null);
  const [scores, setScores] = useState(null);
  const [faces, setFaces] = useState(0);

  const [room, setRoom] = useStoredState("mp:room", false);
  const [ambient, setAmbient] = useStoredState("mp:ambient", false);
  const [nextAt, setNextAt] = useState(null);

  const busy = reading || fetching;

  useEffect(() => {
    let stream;
    let cancelled = false;

    (async () => {
      try {
        await loadReader();
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        if (cancelled) return;
        console.error("Camera setup failed:", err);
        setPhase("blocked");
        setNotice(
          err?.name === "NotAllowedError" || err?.name === "NotFoundError"
            ? "Camera access is off. Turn it on for this site, or pick a mood below."
            : "The camera or the detection models didn't load. Pick a mood below."
        );
      }
    })();

    return () => {
      cancelled = true;
      abortRef.current?.abort();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const run = useCallback(
    async ({ silent = false } = {}) => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return null;

      const controller = new AbortController();
      abortRef.current = controller;
      setReading(true);
      if (!silent) setNotice(null);

      try {
        const result = await readFace(video, {
          room,
          signal: controller.signal,
          onProgress: setProgress,
        });

        if (!result.ok) {
          if (result.reason === "aborted") return null;
          if (!silent) {
            setNotice(
              room
                ? "No faces in the frame. Get everyone in shot and read again."
                : "No face in the frame. Move into the light and read again."
            );
          }
          return null;
        }

        setScores(result.scores);
        setFaces(result.faces);
        lastScores.current = result.scores;
        onRead(result.mood, result.scores, { silent, faces: result.faces });
        return result;
      } catch (err) {
        console.error("Expression read failed:", err);
        if (!silent) setNotice("The read didn't finish. Try again.");
        return null;
      } finally {
        setReading(false);
        setProgress(null);
        abortRef.current = null;
      }
    },
    [onRead, room]
  );

  /* Ambient mode keeps looking, and only disturbs the queue once the face
     has actually moved on. */
  useEffect(() => {
    if (!ambient || phase !== "live") {
      setNextAt(null);
      return undefined;
    }

    setNextAt(Date.now() + AMBIENT_EVERY_MS);
    const timer = setInterval(async () => {
      if (document.hidden) return;
      const before = lastScores.current;
      const result = await readFace(videoRef.current, { room }).catch(() => null);
      if (!result?.ok) return;

      setScores(result.scores);
      setFaces(result.faces);
      const shifted = moodDistance(before, result.scores) >= AMBIENT_SHIFT;
      lastScores.current = result.scores;
      setNextAt(Date.now() + AMBIENT_EVERY_MS);

      if (shifted) {
        onRead(result.mood, result.scores, {
          silent: true,
          ambient: true,
          faces: result.faces,
        });
      }
    }, AMBIENT_EVERY_MS);

    return () => clearInterval(timer);
  }, [ambient, phase, room, onRead]);

  const pct = progress ? Math.min(1, progress.frames / progress.expected) : 0;

  return (
    <div className="reader">
      <div className="lens-wrap">
        <Rings live={busy} />
        <div className="lens" data-state={phase} data-reading={reading}>
          <video
            ref={videoRef}
            className="lens-feed"
            autoPlay
            muted
            playsInline
            onPlaying={() => setPhase("live")}
          />
          {phase === "starting" && (
            <p className="lens-status">Waking the camera</p>
          )}
          {phase === "blocked" && <p className="lens-status">No camera</p>}

          {reading && (
            <svg
              className="lens-progress"
              viewBox="0 0 100 100"
              aria-hidden="true"
            >
              <circle
                cx="50"
                cy="50"
                r="48"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={1 - pct}
              />
            </svg>
          )}
        </div>

        {room && faces > 0 && (
          <span className="badge lens-faces">
            <FiUsers size={11} strokeWidth={2} />
            {faces} {faces === 1 ? "face" : "faces"}
          </span>
        )}
      </div>

      {children}

      <div className="reader-actions">
        <button
          type="button"
          className="pill reader-button"
          onClick={() => run()}
          disabled={busy || phase !== "live"}
        >
          {reading
            ? `Reading ${Math.round(pct * 100)}%`
            : fetching
            ? "Finding tracks…"
            : mood
            ? "Read again"
            : "Read my mood"}
        </button>

        <div className="reader-toggles">
          <button
            type="button"
            className="pill-ghost"
            data-on={room}
            onClick={() => setRoom(!room)}
            aria-pressed={room}
            title="Read every face in the frame"
          >
            <FiUsers size={13} strokeWidth={2} />
            Room
          </button>
          <button
            type="button"
            className="pill-ghost"
            data-on={ambient}
            onClick={() => setAmbient(!ambient)}
            aria-pressed={ambient}
            disabled={phase !== "live"}
            title="Keep reading and let the queue drift with you"
          >
            <FiRadio size={13} strokeWidth={2} />
            Ambient
          </button>
        </div>
      </div>

      {ambient && phase === "live" && (
        <p className="reader-ambient">
          Watching. The queue shifts when your face does.
          <Countdown until={nextAt} />
        </p>
      )}

      {notice && (
        <p
          className={`note ${phase === "blocked" ? "note-stop" : ""}`}
          role="status"
        >
          {notice}
        </p>
      )}

      {scores && (
        <dl className="readout">
          {MOODS.map((name) => {
            const value = Math.round((scores[name] || 0) * 100);
            return (
              <div className="readout-cell" key={name} data-top={name === mood}>
                <dt>{name}</dt>
                <dd className="tnum">{value}</dd>
                <span className="readout-bar" aria-hidden="true">
                  <i style={{ width: `${value}%` }} />
                </span>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
};

export default FacialExpression;
