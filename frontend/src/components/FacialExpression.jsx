import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js/dist/face-api.js";
import { Rings } from "./Chrome.jsx";
import "./FacialExpression.css";

/* face-api reports seven expressions; the library stocks four moods,
   so neighbouring expressions fold into the closest one. */
const MOOD_GROUPS = {
  happy: ["happy", "surprised"],
  sad: ["sad", "fearful"],
  angry: ["angry", "disgusted"],
  neutral: ["neutral"],
};

const MOODS = Object.keys(MOOD_GROUPS);

function scoreMoods(expressions) {
  const scores = {};
  for (const mood of MOODS) {
    scores[mood] = MOOD_GROUPS[mood].reduce(
      (sum, key) => sum + (expressions[key] || 0),
      0
    );
  }
  return scores;
}

const FacialExpression = ({ onRead, fetching, mood, children }) => {
  const videoRef = useRef(null);
  const [phase, setPhase] = useState("starting"); // starting | live | blocked
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [scores, setScores] = useState(null);

  const busy = reading || fetching;

  useEffect(() => {
    let stream;
    let cancelled = false;

    (async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceExpressionNet.loadFromUri("/models"),
        ]);
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
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleRead = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    setReading(true);
    setNotice(null);
    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (!detection) {
        setNotice("No face in the frame. Move into the light and read again.");
        return;
      }

      const next = scoreMoods(detection.expressions);
      setScores(next);
      const top = MOODS.reduce((a, b) => (next[a] > next[b] ? a : b));
      onRead(top, next);
    } catch (err) {
      console.error("Expression read failed:", err);
      setNotice("The read didn't finish. Try again.");
    } finally {
      setReading(false);
    }
  };

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
        </div>
      </div>

      {children}

      <button
        type="button"
        className="pill reader-button"
        onClick={handleRead}
        disabled={busy || phase !== "live"}
      >
        {busy ? "Reading…" : mood ? "Read again" : "Read my mood"}
      </button>

      {notice && (
        <p className={`note ${phase === "blocked" ? "note-stop" : ""}`} role="status">
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
