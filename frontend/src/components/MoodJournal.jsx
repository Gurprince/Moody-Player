import React, { useMemo, useState } from "react";
import { FiBarChart2, FiList } from "react-icons/fi";
import { MOODS } from "../api.js";
import "./MoodJournal.css";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* A hand-picked mood is a whole reading of that mood; a camera read carries
   its own distribution. Both normalise to shares that sum to 1. */
function shares(entry) {
  const raw = entry.scores;
  if (!raw) return { [entry.mood]: 1 };
  const total = MOODS.reduce((sum, m) => sum + (raw[m] || 0), 0);
  if (!total) return { [entry.mood]: 1 };
  return Object.fromEntries(MOODS.map((m) => [m, (raw[m] || 0) / total]));
}

const dayLabel = (ts) =>
  new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });

const timeLabel = (ts) =>
  new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

const MoodJournal = ({ history }) => {
  const [view, setView] = useState("chart"); // chart | table
  const [hover, setHover] = useState(null);

  const data = useMemo(() => {
    // oldest first, so the timeline reads left to right
    const rows = [...history].reverse().map((entry) => ({
      ...entry,
      share: shares(entry),
    }));

    const totals = Object.fromEntries(MOODS.map((m) => [m, 0]));
    rows.forEach((row) => {
      MOODS.forEach((m) => {
        totals[m] += row.share[m] || 0;
      });
    });

    const dominant = MOODS.reduce((a, b) => (totals[a] >= totals[b] ? a : b));

    const byDay = DAYS.map((label, index) => {
      const inDay = rows.filter((r) => new Date(r.at).getDay() === index);
      const sum = Object.fromEntries(MOODS.map((m) => [m, 0]));
      inDay.forEach((r) => {
        MOODS.forEach((m) => {
          sum[m] += r.share[m] || 0;
        });
      });
      const total = MOODS.reduce((s, m) => s + sum[m], 0);
      return {
        label,
        count: inDay.length,
        share: total
          ? Object.fromEntries(MOODS.map((m) => [m, sum[m] / total]))
          : null,
      };
    }).filter((d) => d.count > 0);

    return { rows, totals, dominant, byDay };
  }, [history]);

  if (history.length === 0) return null;

  const { rows, totals, dominant, byDay } = data;
  const dominantPct = Math.round(
    (totals[dominant] / MOODS.reduce((s, m) => s + totals[m], 0)) * 100
  );

  return (
    <section className="journal">
      <div className="section-head journal-head">
        <h2 className="display-sm">Your journal</h2>
        <div className="section-actions">
          <button
            type="button"
            className="pill-ghost"
            data-on={view === "chart"}
            onClick={() => setView("chart")}
          >
            <FiBarChart2 size={13} strokeWidth={2} />
            Chart
          </button>
          <button
            type="button"
            className="pill-ghost"
            data-on={view === "table"}
            onClick={() => setView("table")}
          >
            <FiList size={13} strokeWidth={2} />
            Table
          </button>
        </div>
      </div>

      <p className="journal-hero">
        Across {rows.length} {rows.length === 1 ? "reading" : "readings"} you
        mostly read <span className="tint-mood" data-mood={dominant}>{dominant}</span>
        <span className="journal-hero-pct tnum"> · {dominantPct}%</span>
      </p>

      {/* identity is never colour alone: every mood is named here too */}
      <ul className="journal-legend">
        {MOODS.map((mood) => (
          <li key={mood} data-mood={mood}>
            <i />
            {mood}
          </li>
        ))}
      </ul>

      {view === "table" ? (
        <div className="journal-table-wrap">
          <table className="journal-table">
            <caption className="visually-hidden">
              Every reading, with the share of each mood
            </caption>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Read</th>
                <th scope="col">How</th>
                {MOODS.map((m) => (
                  <th scope="col" key={m}>
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((row, i) => (
                <tr key={`${row.at}-${i}`}>
                  <td>
                    {dayLabel(row.at)} {timeLabel(row.at)}
                  </td>
                  <td className="journal-cell-mood">{row.mood}</td>
                  <td>{row.how === "camera" ? "camera" : row.how}</td>
                  {MOODS.map((m) => (
                    <td className="tnum" key={m}>
                      {Math.round((row.share[m] || 0) * 100)}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <figure className="journal-figure">
            <figcaption className="micro">Readings over time</figcaption>
            <div className="timeline" onMouseLeave={() => setHover(null)}>
              {rows.map((row, i) => (
                <div
                  className="timeline-col"
                  key={`${row.at}-${i}`}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  role="img"
                  aria-label={`${dayLabel(row.at)} ${timeLabel(row.at)}: read ${
                    row.mood
                  }`}
                  data-active={hover === i}
                >
                  <div className="timeline-stack">
                    {MOODS.map((mood) => {
                      const value = row.share[mood] || 0;
                      if (value <= 0.005) return null;
                      return (
                        <span
                          key={mood}
                          data-mood={mood}
                          style={{ height: `${value * 100}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}

              {hover !== null && rows[hover] && (
                <div
                  className="timeline-tip"
                  style={{
                    left: `${Math.min(
                      92,
                      Math.max(8, ((hover + 0.5) / rows.length) * 100)
                    )}%`,
                  }}
                >
                  <p className="timeline-tip-when">
                    {dayLabel(rows[hover].at)} · {timeLabel(rows[hover].at)}
                  </p>
                  {MOODS.filter((m) => (rows[hover].share[m] || 0) > 0.005).map(
                    (m) => (
                      <p className="timeline-tip-row" key={m} data-mood={m}>
                        <i />
                        {m}
                        <b className="tnum">
                          {Math.round(rows[hover].share[m] * 100)}%
                        </b>
                      </p>
                    )
                  )}
                </div>
              )}
            </div>
            <div className="timeline-axis micro">
              <span>{dayLabel(rows[0].at)}</span>
              <span>{dayLabel(rows[rows.length - 1].at)}</span>
            </div>
          </figure>

          {rows.length >= 7 && byDay.length > 1 && (
            <figure className="journal-figure">
              <figcaption className="micro">How the week goes</figcaption>
              <div className="weekdays">
                {byDay.map((day) => (
                  <div className="weekday" key={day.label}>
                    <span className="weekday-label">{day.label}</span>
                    <span className="weekday-bar">
                      {MOODS.map((mood) => {
                        const value = day.share?.[mood] || 0;
                        if (value <= 0.005) return null;
                        return (
                          <i
                            key={mood}
                            data-mood={mood}
                            style={{ width: `${value * 100}%` }}
                            title={`${mood} ${Math.round(value * 100)}%`}
                          />
                        );
                      })}
                    </span>
                    <span className="weekday-count tnum">{day.count}</span>
                  </div>
                ))}
              </div>
            </figure>
          )}
        </>
      )}
    </section>
  );
};

export default MoodJournal;
