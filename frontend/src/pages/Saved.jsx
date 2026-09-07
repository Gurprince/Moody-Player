import React from "react";
import { Link } from "react-router-dom";
import TrackList from "../components/TrackList.jsx";
import { usePlayer } from "../context/usePlayer.js";
import { sinceNow } from "../components/trackHelpers.js";
import "./Saved.css";

const HOW = { camera: "read from your face", picked: "picked by hand" };

const Saved = () => {
  const { saved, history, play, clearHistory } = usePlayer();

  return (
    <div className="page saved">
      <div className="saved-head">
        <h1 className="page-title">Saved</h1>
        <p className="page-lede">
          Tracks you bookmarked, and the moods this browser has read before.
          Both stay on this device.
        </p>
      </div>

      <div className="saved-deck">
        <section className="saved-tracks">
          <div className="saved-block-head">
            <h2 className="section-title">Bookmarked tracks</h2>
            {saved.length > 0 && (
              <div className="saved-block-actions">
                <span className="micro tnum">
                  {saved.length} {saved.length === 1 ? "track" : "tracks"}
                </span>
                <button
                  type="button"
                  className="btn-quiet"
                  onClick={() => play(saved, 0)}
                >
                  Play all
                </button>
              </div>
            )}
          </div>

          {saved.length === 0 ? (
            <p className="blank">
              Nothing bookmarked yet. Hit the bookmark on any row to keep it, or{" "}
              <Link className="blank-link" to="/library">
                open the library
              </Link>
              .
            </p>
          ) : (
            <TrackList tracks={saved} showMood />
          )}
        </section>

        <section className="saved-history">
          <div className="saved-block-head">
            <h2 className="section-title">Past readings</h2>
            {history.length > 0 && (
              <button type="button" className="btn-quiet" onClick={clearHistory}>
                Clear
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <p className="blank blank-small">
              No readings yet. Every mood you read shows up here.
            </p>
          ) : (
            <ol className="history">
              {history.map((entry, index) => (
                <li className="history-row" key={`${entry.at}-${index}`}>
                  <Link
                    className="history-mood"
                    to={`/library?mood=${entry.mood}`}
                    data-mood={entry.mood}
                  >
                    <span className="history-swatch weave" aria-hidden="true" />
                    {entry.mood}
                  </Link>
                  <span className="history-when">{sinceNow(entry.at)}</span>
                  <span className="history-how">
                    {HOW[entry.how] || "read"}
                    {typeof entry.found === "number" &&
                      ` · ${entry.found} ${
                        entry.found === 1 ? "track" : "tracks"
                      }`}
                  </span>
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
