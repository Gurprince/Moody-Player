import React from "react";
import { FaPlay, FaPause, FaRegBookmark, FaBookmark } from "react-icons/fa";
import { usePlayer } from "../context/usePlayer.js";
import { trackKey } from "../api.js";
import { COVER_FALLBACK } from "./trackHelpers.js";
import "./TrackList.css";

/** The playlist row used on every page. */
const TrackList = ({ tracks, showMood = false }) => {
  const { track: current, playing, playTrack, isSaved, toggleSaved } =
    usePlayer();

  return (
    <ul className="tracks">
      {tracks.map((song, index) => {
        const isCurrent = current && trackKey(current) === trackKey(song);
        const bookmarked = isSaved(song);
        return (
          <li
            className="track"
            key={`${trackKey(song)}-${index}`}
            data-current={Boolean(isCurrent)}
          >
            <img
              className="track-cover"
              src={song.songCover || COVER_FALLBACK}
              alt=""
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = COVER_FALLBACK;
              }}
            />

            <div className="track-meta">
              <h3 className="track-title">{song.title || "Untitled"}</h3>
              <p className="track-artist">
                {song.artist || "Unknown artist"}
                {showMood && song.mood && (
                  <span className="track-mood">{song.mood}</span>
                )}
              </p>
            </div>

            <div className="track-actions">
              <button
                type="button"
                className="track-save"
                data-on={bookmarked}
                onClick={() => toggleSaved(song)}
                aria-pressed={bookmarked}
                aria-label={
                  bookmarked
                    ? `Remove ${song.title} from saved`
                    : `Save ${song.title}`
                }
              >
                {bookmarked ? (
                  <FaBookmark size={13} />
                ) : (
                  <FaRegBookmark size={13} />
                )}
              </button>

              <button
                type="button"
                className="track-play"
                onClick={() => playTrack(tracks, index)}
                aria-label={`${
                  isCurrent && playing ? "Pause" : "Play"
                } ${song.title} by ${song.artist || "unknown artist"}`}
              >
                {isCurrent && playing ? (
                  <FaPause size={11} />
                ) : (
                  <FaPlay size={11} />
                )}
              </button>
            </div>

            {isCurrent && <span className="track-marker" aria-hidden="true" />}
          </li>
        );
      })}
    </ul>
  );
};

export const TrackListSkeleton = ({ rows = 4 }) => (
  <ul className="tracks" aria-hidden="true">
    {Array.from({ length: rows }, (_, n) => (
      <li className="track track-waiting" key={n}>
        <span className="track-cover" />
        <span className="track-lines">
          <i style={{ width: `${50 + n * 9}%` }} />
          <i style={{ width: `${26 + n * 5}%` }} />
        </span>
      </li>
    ))}
  </ul>
);

export default TrackList;
