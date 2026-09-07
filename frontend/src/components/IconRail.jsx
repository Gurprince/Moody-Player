import React, { useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FiActivity, FiDisc, FiBookmark, FiPlus } from "react-icons/fi";
import { usePlayer } from "../context/usePlayer.js";
import "./IconRail.css";

const LINKS = [
  { to: "/", label: "Read", key: "r", icon: FiActivity, end: true },
  { to: "/library", label: "Library", key: "l", icon: FiDisc },
  { to: "/saved", label: "Saved", key: "s", icon: FiBookmark },
  { to: "/upload", label: "Add", key: "a", icon: FiPlus },
];

const IconRail = () => {
  const { saved } = usePlayer();
  const navigate = useNavigate();

  /* Single-letter jumps, the way the rail advertises them. */
  useEffect(() => {
    const onKey = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const el = event.target;
      if (
        el instanceof HTMLElement &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable)
      )
        return;
      const match = LINKS.find((link) => link.key === event.key.toLowerCase());
      if (match) navigate(match.to);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <nav className="icon-rail" aria-label="Sections">
      {LINKS.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className="rail-item"
          >
            <Icon size={17} strokeWidth={1.75} />
            <span className="rail-tip">
              <b className="rail-key">{link.key.toUpperCase()}</b>
              {link.label}
            </span>
            {link.to === "/saved" && saved.length > 0 && (
              <i className="rail-dot" aria-hidden="true" />
            )}
            <span className="visually-hidden">{link.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default IconRail;
