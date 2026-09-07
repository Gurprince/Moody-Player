import React from "react";
import { FiPlay, FiPause, FiBookmark, FiMusic } from "react-icons/fi";
import { usePlayer } from "../context/usePlayer.js";
import { trackKey } from "../api.js";
import { COVER_FALLBACK } from "./trackHelpers.js";
import "./TrackList.css";

/** Artwork cards, laid out in a scrolling rail or a wrapping grid. */
const TrackList = ({ tracks, layout = "grid", showMood = true }) => {
  const { track: current, playing, playTrack, isSaved, toggleSaved } =
    usePlayer();

  return (
    <ul className={layout === "rail" ? "rail cards" : "grid cards"}>
      {tracks.map((song, index) => {
        const isCurrent = current && trackKey(current) === trackKey(song);
        const bookmarked = isSaved(song);
        return (
          <li
            className="card"
            key={`${trackKey(song)}-${index}`}
            data-current={Boolean(isCurrent)}
          >
            <div className="card-art">
              <img
                src={song.songCover || COVER_FALLBACK}
                alt=""
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = COVER_FALLBACK;
                }}
              />

              {showMood && song.mood && (
                <span className="badge card-badge-left">{song.mood}</span>
              )}
              {isCurrent && playing && (
                <span className="badge card-badge-right">
                  <FiMusic size={10} strokeWidth={2} />
                  Now
                </span>
              )}

              <button
                type="button"
                className="card-play"
                onClick={() => playTrack(tracks, index)}
                aria-label={`${
                  isCurrent && playing ? "Pause" : "Play"
                } ${song.title} by ${song.artist || "unknown artist"}`}
              >
                {isCurrent && playing ? (
                  <FiPause size={16} strokeWidth={2} />
                ) : (
                  <FiPlay size={16} strokeWidth={2} />
                )}
              </button>

              <button
                type="button"
                className="card-save"
                data-on={bookmarked}
                onClick={() => toggleSaved(song)}
                aria-pressed={bookmarked}
                aria-label={
                  bookmarked
                    ? `Remove ${song.title} from saved`
                    : `Save ${song.title}`
                }
              >
                <FiBookmark
                  size={14}
                  strokeWidth={2}
                  fill={bookmarked ? "currentColor" : "none"}
                />
              </button>
            </div>

            <h3 className="card-title">{song.title || "Untitled"}</h3>
            <p className="card-artist">{song.artist || "Unknown artist"}</p>
          </li>
        );
      })}
    </ul>
  );
};

export const TrackListSkeleton = ({ rows = 5, layout = "rail" }) => (
  <ul
    className={layout === "rail" ? "rail cards" : "grid cards"}
    aria-hidden="true"
  >
    {Array.from({ length: rows }, (_, n) => (
      <li className="card card-waiting" key={n}>
        <span className="card-art" />
        <span className="card-line" style={{ width: `${58 + (n % 3) * 12}%` }} />
        <span className="card-line card-line-short" />
      </li>
    ))}
  </ul>
);

export default TrackList;
