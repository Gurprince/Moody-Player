import React from "react";
import { MOODS } from "../api.js";
import "./MoodPicker.css";

/** The way in for anyone who'd rather not turn the camera on. */
const MoodPicker = ({ value, onPick, counts, disabled = false }) => (
  <div className="mood-picker">
    {MOODS.map((mood) => (
      <button
        type="button"
        key={mood}
        className="mood-pill"
        data-mood={mood}
        data-on={value === mood}
        onClick={() => onPick(mood)}
        disabled={disabled}
        aria-pressed={value === mood}
      >
        <i className="mood-dot" aria-hidden="true" />
        {mood}
        {counts && <span className="mood-count tnum">{counts[mood] || 0}</span>}
      </button>
    ))}
  </div>
);

export default MoodPicker;
