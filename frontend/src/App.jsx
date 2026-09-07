import React, { Suspense, lazy, useEffect } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import IconRail from "./components/IconRail.jsx";
import PlayerDock from "./components/PlayerDock.jsx";
import { Wordmark } from "./components/Chrome.jsx";
import { usePlayer } from "./context/usePlayer.js";
const Home = lazy(() => import("./pages/Home.jsx"));
const Library = lazy(() => import("./pages/Library.jsx"));
const Saved = lazy(() => import("./pages/Saved.jsx"));
const Upload = lazy(() => import("./pages/Upload.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));
import { MOODS } from "./api.js";
import "./App.css";

const App = () => {
  const { mood, track } = usePlayer();
  const location = useLocation();

  /* The mood the site is in tints every page, so it lives on the root. */
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
      <div className="topbar">
        <Wordmark />
      </div>

      <IconRail />

      <main className="shell-main">
        <Suspense fallback={<div className="route-wait" aria-hidden="true" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/library" element={<Library />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>

      <footer className="colophon">
        <div className="colophon-inner">
          <p className="colophon-note">
            Expressions are read in your browser and never leave this device.
            Only the mood word is sent to find music. Saved tracks and past
            readings stay in this browser too.
          </p>

          <nav className="colophon-nav colophon-moods" aria-label="Moods">
            <p className="micro">Moods</p>
            {MOODS.map((name) => (
              <Link key={name} to={`/library?mood=${name}`} data-mood={name}>
                <i className="colophon-dot" aria-hidden="true" />
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
