import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiLogOut, FiCheck } from "react-icons/fi";
import { useAuth } from "../context/authContext.js";
import { usePlayer } from "../context/usePlayer.js";
import "./Account.css";

const Account = () => {
  const { user, loading, signIn, signOut, migrated, dismissMigrated } = useAuth();
  const { saved, history } = usePlayer();

  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  useEffect(() => {
    setProblem(null);
  }, [mode]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setProblem(null);
    const result = await signIn(mode, { email, password });
    if (!result.ok) setProblem(result.message);
    else {
      setEmail("");
      setPassword("");
    }
    setBusy(false);
  };

  if (loading) {
    return (
      <div className="page account">
        <p className="blank">Checking your session…</p>
      </div>
    );
  }

  /* ---------------- signed in ---------------- */

  if (user) {
    const since = new Date(user.since).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });

    return (
      <div className="page account">
        <div className="page-head">
          <div>
            <h1 className="display">Account</h1>
            <p className="lede">
              Your bookmarks, journal and what the player has learned about your
              taste now follow you to any browser you sign in on.
            </p>
          </div>
        </div>

        {migrated && (migrated.tracks || migrated.entries || migrated.signals) > 0 && (
          <div className="account-migrated">
            <FiCheck size={16} strokeWidth={2.5} aria-hidden="true" />
            <p>
              Brought over{" "}
              {[
                migrated.tracks &&
                  `${migrated.tracks} ${
                    migrated.tracks === 1 ? "bookmark" : "bookmarks"
                  }`,
                migrated.entries &&
                  `${migrated.entries} ${
                    migrated.entries === 1 ? "reading" : "readings"
                  }`,
                migrated.signals &&
                  `${migrated.signals} taste ${
                    migrated.signals === 1 ? "signal" : "signals"
                  }`,
              ]
                .filter(Boolean)
                .join(", ")}{" "}
              from this browser.
            </p>
            <button
              type="button"
              className="pill-ghost"
              onClick={dismissMigrated}
            >
              Got it
            </button>
          </div>
        )}

        <div className="account-card panel">
          <div className="account-identity">
            <span className="account-avatar" aria-hidden="true">
              {user.email.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <p className="account-email">{user.email}</p>
              <p className="account-since">Member since {since}</p>
            </div>
          </div>

          <dl className="account-stats">
            <div>
              <dt className="micro">Bookmarks</dt>
              <dd className="tnum">{saved.length}</dd>
            </div>
            <div>
              <dt className="micro">Readings</dt>
              <dd className="tnum">{history.length}</dd>
            </div>
          </dl>

          <button type="button" className="pill-ghost" onClick={signOut}>
            <FiLogOut size={14} strokeWidth={2} />
            Sign out
          </button>
        </div>

        <p className="account-note">
          Signing out clears the bookmarks and journal from this device — they
          stay on the account and come back when you sign in again. Expression
          reading still happens entirely in your browser either way.
        </p>
      </div>
    );
  }

  /* ---------------- signed out ---------------- */

  const carrying = saved.length + history.length > 0;

  return (
    <div className="page account">
      <div className="page-head">
        <div>
          <h1 className="display">
            {mode === "login" ? "Sign in" : "Create account"}
          </h1>
          <p className="lede">
            Keep your bookmarks, your journal and everything the player has
            learned about your taste across devices.
          </p>
        </div>
      </div>

      <div className="account-deck">
        <form className="account-form panel" onSubmit={submit}>
          <div className="account-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className="account-tab"
              data-on={mode === "login"}
              onClick={() => setMode("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className="account-tab"
              data-on={mode === "register"}
              onClick={() => setMode("register")}
            >
              Create account
            </button>
          </div>

          <label className="field">
            <span className="micro">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="field">
            <span className="micro">Password</span>
            <input
              type="password"
              name="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "register" ? "At least 8 characters" : ""}
              minLength={mode === "register" ? 8 : undefined}
              required
            />
          </label>

          <button type="submit" className="pill" disabled={busy}>
            {busy
              ? "Just a moment…"
              : mode === "login"
              ? "Sign in"
              : "Create account"}
          </button>

          {problem && (
            <p className="note note-stop" role="alert">
              {problem}
            </p>
          )}
        </form>

        <aside className="account-aside">
          <h2 className="display-sm">What comes with you</h2>
          <dl className="account-facts">
            <div>
              <dt className="micro">Bookmarks</dt>
              <dd>Every track you kept, on any browser you sign in on.</dd>
            </div>
            <div>
              <dt className="micro">Journal</dt>
              <dd>Your readings over time, instead of one device's worth.</dd>
            </div>
            <div>
              <dt className="micro">Taste</dt>
              <dd>
                What you skip and save keeps shaping results rather than
                starting over.
              </dd>
            </div>
          </dl>

          {carrying && (
            <p className="note">
              This browser is holding{" "}
              {[
                saved.length &&
                  `${saved.length} ${
                    saved.length === 1 ? "bookmark" : "bookmarks"
                  }`,
                history.length &&
                  `${history.length} ${
                    history.length === 1 ? "reading" : "readings"
                  }`,
              ]
                .filter(Boolean)
                .join(" and ")}
              . They move to your account automatically — nothing is lost.
            </p>
          )}

          <p className="account-note">
            You can keep using everything without an account; it just stays on
            this one device. Read a mood from{" "}
            <Link className="blank-link" to="/">
              the home page
            </Link>
            .
          </p>
        </aside>
      </div>
    </div>
  );
};

export default Account;
