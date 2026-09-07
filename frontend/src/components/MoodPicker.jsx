import React from "react";
import { MOODS, MOOD_COPY } from "../api.js";
import "./MoodPicker.css";

/** The way in for anyone who'd rather not turn the camera on. */
const MoodPicker = ({ value, onPick, counts, disabled = false }) => (
  <div className="mood-picker">
    {MOODS.map((mood) => (
      <button
        type="button"
        key={mood}
        className="mood-chip"
        data-mood={mood}
        data-on={value === mood}
        onClick={() => onPick(mood)}
        disabled={disabled}
        aria-pressed={value === mood}
      >
        <span className="mood-chip-swatch weave" aria-hidden="true" />
        <span className="mood-chip-name">{mood}</span>
        <span className="mood-chip-line">
          {counts
            ? `${counts[mood] || 0} in the library`
            : MOOD_COPY[mood].line}
        </span>
      </button>
    ))}
  </div>
);

export default MoodPicker;
