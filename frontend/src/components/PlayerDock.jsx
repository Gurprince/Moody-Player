import React, { useState } from "react";
import {
  FiPlay,
  FiPause,
  FiSkipForward,
  FiSkipBack,
  FiShuffle,
  FiRepeat,
  FiVolume2,
  FiVolumeX,
  FiList,
  FiX,
  FiThumbsDown,
} from "react-icons/fi";
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
    dismiss,
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
        <div className="queue">
          <div className="queue-inner">
            <div className="section-head">
              <h2 className="display-sm">Up next</h2>
              <div className="section-actions">
                <button
                  type="button"
                  className="pill-ghost"
                  onClick={clearQueue}
                >
                  Clear queue
                </button>
                <button
                  type="button"
                  className="queue-close"
                  onClick={() => setQueueOpen(false)}
                  aria-label="Close the queue"
                >
                  <FiX size={16} strokeWidth={2} />
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
                      <img
                        src={item.songCover || COVER_FALLBACK}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.src = COVER_FALLBACK;
                        }}
                      />
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
                ? "This track wouldn't stream. Skip ahead."
                : track.artist || "Unknown artist"}
            </p>
          </div>
        </div>

        <div className="dock-transport">
          <button
            type="button"
            className="dock-icon"
            data-on={shuffle}
            onClick={toggleShuffle}
            aria-pressed={shuffle}
            aria-label="Shuffle"
            title="Shuffle"
          >
            <FiShuffle size={15} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="dock-icon"
            onClick={previous}
            aria-label="Previous track"
          >
            <FiSkipBack size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="dock-play"
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <FiPause size={16} strokeWidth={2.2} />
            ) : (
              <FiPlay size={16} strokeWidth={2.2} />
            )}
          </button>
          <button
            type="button"
            className="dock-icon"
            onClick={next}
            aria-label="Next track"
          >
            <FiSkipForward size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="dock-icon dock-down"
            onClick={dismiss}
            aria-label="Never play this in this mood"
            title="Never play this in this mood"
          >
            <FiThumbsDown size={15} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="dock-icon"
            data-on={repeat !== "off"}
            onClick={cycleRepeat}
            aria-label={REPEAT_LABEL[repeat]}
            title={REPEAT_LABEL[repeat]}
          >
            <FiRepeat size={15} strokeWidth={2} />
            {repeat === "one" && <i className="dock-one tnum">1</i>}
          </button>
        </div>

        <div className="dock-scrub">
          <span className="dock-time tnum">{clock(time)}</span>
          <input
            className="slider"
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
            className="dock-icon"
            onClick={() => setMuted(!muted)}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted || volume === 0 ? (
              <FiVolumeX size={15} strokeWidth={2} />
            ) : (
              <FiVolume2 size={15} strokeWidth={2} />
            )}
          </button>
          <input
            className="slider slider-volume"
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
            className="dock-icon"
            data-on={queueOpen}
            onClick={() => setQueueOpen((open) => !open)}
            aria-expanded={queueOpen}
            aria-label="Queue"
            title="Queue"
          >
            <FiList size={15} strokeWidth={2} />
          </button>
        </div>
      </div>
    </>
  );
};

export default PlayerDock;
