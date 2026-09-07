import React, { useEffect } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import SiteHeader from "./components/SiteHeader.jsx";
import PlayerDock from "./components/PlayerDock.jsx";
import { usePlayer } from "./context/usePlayer.js";
import Home from "./pages/Home.jsx";
import Library from "./pages/Library.jsx";
import Saved from "./pages/Saved.jsx";
import Upload from "./pages/Upload.jsx";
import NotFound from "./pages/NotFound.jsx";
import { MOODS } from "./api.js";
import "./App.css";

const App = () => {
  const { mood, track } = usePlayer();
  const location = useLocation();

  /* The mood the site is in tints every page, so it lives on the shell. */
  useEffect(() => {
    const root = document.documentElement;
    if (mood) root.setAttribute("data-mood", mood);
    else root.removeAttribute("data-mood");
  }, [mood]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <div className="shell" data-docked={Boolean(track)}>
      <SiteHeader />

      <main className="shell-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/library" element={<Library />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="colophon">
        <div className="colophon-inner">
          <div className="colophon-lead">
            <p className="colophon-mark">Moody Player</p>
            <p className="colophon-note">
              Expressions are read in your browser and never leave this device.
              Only the mood word is sent to find music. Saved tracks and past
              readings stay in this browser too.
            </p>
          </div>

          <nav className="colophon-nav" aria-label="Moods">
            <p className="micro">Moods</p>
            {MOODS.map((name) => (
              <Link key={name} to={`/library?mood=${name}`} data-mood={name}>
                <span className="colophon-swatch weave" aria-hidden="true" />
                {name}
              </Link>
            ))}
          </nav>

          <nav className="colophon-nav" aria-label="Pages">
            <p className="micro">Pages</p>
            <Link to="/">Read a mood</Link>
            <Link to="/library">Library</Link>
            <Link to="/saved">Saved</Link>
            <Link to="/upload">Add a track</Link>
          </nav>
        </div>
      </footer>

      <PlayerDock />
    </div>
  );
};

export default App;
