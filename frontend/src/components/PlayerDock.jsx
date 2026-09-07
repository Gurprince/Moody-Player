import React, { useState } from "react";
import {
  FaPlay,
  FaPause,
  FaStepForward,
  FaStepBackward,
  FaRandom,
  FaRedo,
  FaVolumeUp,
  FaVolumeMute,
  FaListUl,
  FaTimes,
} from "react-icons/fa";
import { usePlayer } from "../context/usePlayer.js";
import { trackKey } from "../api.js";
import { COVER_FALLBACK, clock } from "./trackHelpers.js";
import "./PlayerDock.css";

const REPEAT_LABEL = {
  off: "Repeat off",
  all: "Repeat the whole queue",
  one: "Repeat this track",
};

const PlayerDock = () => {
  const {
    track,
    queue,
    order,
    cursor,
    playing,
    stalled,
    time,
    duration,
    shuffle,
    repeat,
    volume,
    muted,
    toggle,
    next,
    previous,
    seek,
    jumpTo,
    toggleShuffle,
    cycleRepeat,
    setVolume,
    setMuted,
    clearQueue,
  } = usePlayer();

  const [queueOpen, setQueueOpen] = useState(false);

  if (!track) return null;

  const played = duration ? (time / duration) * 100 : 0;

  return (
    <>
      {queueOpen && (
        <div className="queue-panel">
          <div className="queue-inner">
            <div className="queue-head">
              <h2 className="section-title">Up next</h2>
              <div className="queue-head-actions">
                <button type="button" className="btn-quiet" onClick={clearQueue}>
                  Clear queue
                </button>
                <button
                  type="button"
                  className="queue-close"
                  onClick={() => setQueueOpen(false)}
                  aria-label="Close the queue"
                >
                  <FaTimes size={14} />
                </button>
              </div>
            </div>
            <ol className="queue-list">
              {order.map((songIndex, position) => {
                const item = queue[songIndex];
                if (!item) return null;
                return (
                  <li key={`${trackKey(item)}-${position}`}>
                    <button
                      type="button"
                      className="queue-row"
                      data-current={position === cursor}
                      data-past={position < cursor}
                      onClick={() => jumpTo(position)}
                    >
                      <span className="queue-index tnum">{position + 1}</span>
                      <span className="queue-name">{item.title}</span>
                      <span className="queue-artist">{item.artist}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}

      <div className="dock">
        <div className="dock-inner">
          <div className="dock-now">
            <img
              className="dock-cover"
              src={track.songCover || COVER_FALLBACK}
              alt=""
              onError={(e) => {
                e.currentTarget.src = COVER_FALLBACK;
              }}
            />
            <div className="dock-meta">
              <p className="dock-title">{track.title}</p>
              <p className="dock-artist">
                {stalled
                  ? "This track wouldn't stream. Skip to the next one."
                  : track.artist || "Unknown artist"}
              </p>
            </div>
          </div>

          <div className="dock-transport">
            <button
              type="button"
              className="transport-toggle"
              data-on={shuffle}
              onClick={toggleShuffle}
              aria-pressed={shuffle}
              aria-label="Shuffle"
              title="Shuffle"
            >
              <FaRandom size={13} />
            </button>
            <button
              type="button"
              className="transport-step"
              onClick={previous}
              aria-label="Previous track"
            >
              <FaStepBackward size={14} />
            </button>
            <button
              type="button"
              className="transport-play"
              onClick={toggle}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <FaPause size={15} /> : <FaPlay size={15} />}
            </button>
            <button
              type="button"
              className="transport-step"
              onClick={next}
              aria-label="Next track"
            >
              <FaStepForward size={14} />
            </button>
            <button
              type="button"
              className="transport-toggle"
              data-on={repeat !== "off"}
              onClick={cycleRepeat}
              aria-label={REPEAT_LABEL[repeat]}
              title={REPEAT_LABEL[repeat]}
            >
              <FaRedo size={13} />
              {repeat === "one" && <i className="repeat-one tnum">1</i>}
            </button>
          </div>

          <div className="dock-scrub">
            <span className="dock-time tnum">{clock(time)}</span>
            <input
              className="scrub"
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={Math.min(time, duration || 0)}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="Seek"
              style={{ "--played": `${played}%` }}
            />
            <span className="dock-time tnum">{clock(duration)}</span>
          </div>

          <div className="dock-side">
            <button
              type="button"
              className="transport-toggle"
              onClick={() => setMuted(!muted)}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted || volume === 0 ? (
                <FaVolumeMute size={13} />
              ) : (
                <FaVolumeUp size={13} />
              )}
            </button>
            <input
              className="scrub scrub-volume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={muted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                if (muted) setMuted(false);
              }}
              aria-label="Volume"
              style={{ "--played": `${(muted ? 0 : volume) * 100}%` }}
            />
            <button
              type="button"
              className="transport-toggle"
              data-on={queueOpen}
              onClick={() => setQueueOpen((open) => !open)}
              aria-expanded={queueOpen}
              aria-label="Queue"
              title="Queue"
            >
              <FaListUl size={13} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PlayerDock;
