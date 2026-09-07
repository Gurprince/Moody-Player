import React, { useCallback, useEffect, useRef, useState } from "react";
import { FiUsers, FiRadio, FiCamera, FiCameraOff } from "react-icons/fi";
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
  const streamRef = useRef(null);
  const abortRef = useRef(null);
  const lastScores = useRef(null);

  const [phase, setPhase] = useState("off"); // off | opening | live | blocked
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [notice, setNotice] = useState(null);
  const [scores, setScores] = useState(null);
  const [faces, setFaces] = useState(0);

  const [room, setRoom] = useStoredState("mp:room", false);
  const [ambient, setAmbient] = useStoredState("mp:ambient", false);
  const [nextAt, setNextAt] = useState(null);

  const busy = reading || fetching;

  /* The camera is only ever on while it is being used. Nothing opens it on
     page load, and it closes again the moment a read is finished — unless
     ambient mode is deliberately watching. */

  const closeCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setPhase((current) => (current === "blocked" ? current : "off"));
  }, []);

  const openCamera = useCallback(async () => {
    if (streamRef.current) return true;
    setPhase("opening");
    setNotice(null);
    try {
      await loadReader();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      return true;
    } catch (err) {
      console.error("Camera setup failed:", err);
      setPhase("blocked");
      setNotice(
        err?.name === "NotAllowedError" || err?.name === "NotFoundError"
          ? "Camera access is off. Turn it on for this site, or pick a mood below."
          : "The camera or the detection models didn't load. Pick a mood below."
      );
      return false;
    }
  }, []);

  /** Waits for the first decodable frame, so a read never samples a blank. */
  const waitForFrame = useCallback(async () => {
    const started = Date.now();
    while (Date.now() - started < 6000) {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) return true;
      await new Promise((r) => setTimeout(r, 120));
    }
    return false;
  }, []);

  // stop the camera if the component goes away mid-read
  useEffect(
    () => () => {
      abortRef.current?.abort();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    },
    []
  );

  const run = useCallback(
    async ({ silent = false, keepOpen = false } = {}) => {
      if (!(await openCamera())) return null;
      if (!(await waitForFrame())) {
        if (!silent) setNotice("The camera didn't start in time. Try again.");
        if (!keepOpen && !ambient) closeCamera();
        return null;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setReading(true);
      if (!silent) setNotice(null);

      try {
        const result = await readFace(videoRef.current, {
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
        if (!keepOpen && !ambient) closeCamera();
      }
    },
    [ambient, closeCamera, onRead, openCamera, room, waitForFrame]
  );

  /* Ambient mode is the one case where the camera stays on — and it says so
     the whole time it is watching. */
  useEffect(() => {
    if (!ambient) {
      setNextAt(null);
      if (!reading) closeCamera();
      return undefined;
    }

    let cancelled = false;
    openCamera().then((ok) => {
      if (!cancelled && ok) setNextAt(Date.now() + AMBIENT_EVERY_MS);
    });

    const timer = setInterval(async () => {
      if (document.hidden || !streamRef.current) return;
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

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // `reading` is deliberately not a dependency: a read must not restart this
  }, [ambient, room, onRead, openCamera, closeCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = progress ? Math.min(1, progress.frames / progress.expected) : 0;
  const cameraOn = phase === "live" || phase === "opening";

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

          {phase === "off" && (
            <div className="lens-idle">
              <FiCameraOff size={20} strokeWidth={1.75} aria-hidden="true" />
              <p>Camera off</p>
            </div>
          )}
          {phase === "opening" && <p className="lens-status">Opening camera</p>}
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

        {cameraOn && (
          <span className="badge lens-live">
            <i className="lens-live-dot" aria-hidden="true" />
            {room && faces > 0 ? `${faces} in frame` : "Camera on"}
          </span>
        )}
      </div>

      {children}

      <div className="reader-actions">
        <button
          type="button"
          className="pill reader-button"
          onClick={() => run()}
          disabled={busy}
        >
          {reading ? (
            `Reading ${Math.round(pct * 100)}%`
          ) : fetching ? (
            "Finding tracks…"
          ) : (
            <>
              <FiCamera size={15} strokeWidth={2} />
              {mood ? "Read again" : "Read my mood"}
            </>
          )}
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
            title="Keep watching and let the queue drift with you"
          >
            <FiRadio size={13} strokeWidth={2} />
            Ambient
          </button>
        </div>
      </div>

      <p className="reader-ambient">
        {ambient
          ? "Ambient is watching — the camera stays on until you switch it off."
          : "The camera opens for the read and closes straight after."}
        {ambient && <Countdown until={nextAt} />}
      </p>

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
