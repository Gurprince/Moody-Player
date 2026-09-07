import React from "react";
import { Link } from "react-router-dom";
import "./Chrome.css";

/** Concentric hairline rings — the backdrop the reader sits inside. */
export const Rings = ({ live = false }) => (
  <div className="rings" data-live={live} aria-hidden="true">
    <span className="rings-field" />
    <span className="rings-glow" />
  </div>
);

/** Sine mark plus name, sitting at the top of every page. */
export const Wordmark = () => (
  <Link to="/" className="wordmark">
    <svg viewBox="0 0 40 20" className="wordmark-mark" aria-hidden="true">
      <path
        d="M3 14C6 2 11 2 14 10s8 8 11 0 8-8 11 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    <span className="wordmark-name">
      Moody Player<sup>™</sup>
    </span>
  </Link>
);
