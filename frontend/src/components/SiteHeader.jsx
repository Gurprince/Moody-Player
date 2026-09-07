import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { usePlayer } from "../context/usePlayer.js";
import "./SiteHeader.css";

const LINKS = [
  { to: "/", label: "Read a mood", end: true },
  { to: "/library", label: "Library" },
  { to: "/saved", label: "Saved" },
  { to: "/upload", label: "Add a track" },
];

const SiteHeader = () => {
  const { mood, saved } = usePlayer();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <NavLink to="/" className="wordmark">
          Moody<span>Player</span>
        </NavLink>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Menu"}
        </button>

        <nav className="site-nav" data-open={open} aria-label="Sections">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
              {link.to === "/saved" && saved.length > 0 && (
                <span className="nav-count tnum">{saved.length}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {mood && (
          <p className="header-mood">
            reading&nbsp;<em>{mood}</em>
          </p>
        )}
      </div>

      <div className="header-band" aria-hidden="true">
        <span className="header-band-weave weave" key={mood || "idle"} />
        <span className="header-band-solid" />
      </div>
    </header>
  );
};

export default SiteHeader;
