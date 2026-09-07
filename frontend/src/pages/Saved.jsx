import React from "react";
import { Link } from "react-router-dom";
import TrackList from "../components/TrackList.jsx";
import MoodJournal from "../components/MoodJournal.jsx";
import { usePlayer } from "../context/usePlayer.js";
import { sinceNow } from "../components/trackHelpers.js";
import "./Saved.css";

const HOW = { camera: "read from your face", picked: "picked by hand" };

const Saved = () => {
  const { saved, history, play, clearHistory, user } = usePlayer();

  return (
    <div className="page saved">
      <div className="page-head">
        <div>
          <h1 className="display">Saved</h1>
          <p className="lede">
            {user
              ? "Tracks you bookmarked and the moods you've read, synced to your account."
              : "Tracks you bookmarked, and the moods this browser has read before. Both stay on this device."}
          </p>
        </div>
      </div>

      <MoodJournal history={history} />

      <div className="saved-deck">
        <section>
          <div className="section-head saved-block-head">
            <h2 className="display-sm">Bookmarked</h2>
            {saved.length > 0 && (
              <div className="section-actions">
                <span className="micro tnum">
                  {saved.length} {saved.length === 1 ? "track" : "tracks"}
                </span>
                <button
                  type="button"
                  className="pill-ghost"
                  onClick={() => play(saved, 0)}
                >
                  Play all
                </button>
              </div>
            )}
          </div>

          {saved.length === 0 ? (
            <p className="blank">
              Nothing bookmarked yet. Hit the bookmark on any card to keep it,
              or{" "}
              <Link className="blank-link" to="/library">
                open the library
              </Link>
              .
            </p>
          ) : (
            <TrackList tracks={saved} layout="grid" showMood />
          )}
        </section>

        <section>
          <div className="section-head saved-block-head">
            <h2 className="display-sm">Readings</h2>
            {history.length > 0 && (
              <button
                type="button"
                className="pill-ghost"
                onClick={clearHistory}
              >
                Clear
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <p className="blank">
              No readings yet. Every mood you read shows up here.
            </p>
          ) : (
            <ol className="history">
              {history.map((entry, index) => (
                <li key={`${entry.at}-${index}`}>
                  <Link
                    className="history-row"
                    to={`/library?mood=${entry.mood}`}
                    data-mood={entry.mood}
                  >
                    <i className="history-dot" aria-hidden="true" />
                    <span className="history-mood">{entry.mood}</span>
                    <span className="history-when">{sinceNow(entry.at)}</span>
                    <span className="history-how">
                      {HOW[entry.how] || "read"}
                      {typeof entry.found === "number" &&
                        ` · ${entry.found} ${
                          entry.found === 1 ? "track" : "tracks"
                        }`}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
};

export default Saved;
