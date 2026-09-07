import React, { useEffect, useRef, useState } from "react";
import { FiGlobe, FiMusic, FiCornerDownLeft } from "react-icons/fi";
import { fetchOptions } from "../api.js";
import "./TasteBar.css";

/**
 * What to search for, in the listener's own terms: a language, a genre, and
 * — when the four moods don't cover it — whatever word they'd actually use.
 */
const TasteBar = ({
  language,
  genre,
  onLanguage,
  onGenre,
  onFeeling,
  busy,
}) => {
  const [options, setOptions] = useState(null);
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchOptions()
      .then((data) => !cancelled && setOptions(data))
      .catch(() => {
        /* the pickers just stay closed if the server is unreachable */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    onFeeling(value);
  };

  const applyHint = (word) => {
    setText(word);
    onFeeling(word);
  };

  return (
    <div className="taste">
      <div className="taste-row">
        <label className="taste-select">
          <FiGlobe size={13} strokeWidth={2} aria-hidden="true" />
          <span className="visually-hidden">Language</span>
          <select
            value={language}
            onChange={(e) => onLanguage(e.target.value)}
            disabled={busy || !options}
          >
            {(options?.languages || [{ id: language, label: "Language" }]).map(
              (l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              )
            )}
          </select>
        </label>

        <label className="taste-select">
          <FiMusic size={13} strokeWidth={2} aria-hidden="true" />
          <span className="visually-hidden">Genre</span>
          <select
            value={genre}
            onChange={(e) => onGenre(e.target.value)}
            disabled={busy || !options}
          >
            {(options?.genres || [{ id: genre, label: "Genre" }]).map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <form className="taste-feeling" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="feeling-input">
          Describe how you feel
        </label>
        <input
          id="feeling-input"
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="…or say how you feel, in your words"
          maxLength={60}
          disabled={busy}
        />
        <button
          type="submit"
          className="taste-go"
          disabled={busy || !text.trim()}
          aria-label="Find tracks for that"
        >
          <FiCornerDownLeft size={14} strokeWidth={2} />
        </button>
      </form>

      {options?.feelings?.length > 0 && (
        <ul className="taste-hints">
          {options.feelings.map((word) => (
            <li key={word}>
              <button
                type="button"
                onClick={() => applyHint(word)}
                disabled={busy}
              >
                {word}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TasteBar;
