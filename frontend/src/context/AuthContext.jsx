import React, { useCallback, useEffect, useState } from "react";
import { AuthContext } from "./authContext.js";
import { fetchMe, authenticate, signOut as signOutRequest, readError } from "../api.js";

/** Reads what this browser collected while signed out, for migration. */
function localCollection() {
  const read = (key) => {
    try {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  return { saved: read("mp:saved"), readings: read("mp:history") };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [migrated, setMigrated] = useState(null);
  /* The server's copy of bookmarks and journal; the player picks this up. */
  const [remote, setRemote] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((data) => {
        if (cancelled) return;
        setUser(data.user);
        if (data.user) {
          setRemote({
            saved: data.saved,
            readings: data.readings,
            prefs: data.user.prefs,
          });
        }
      })
      .catch(() => {
        /* server down — the app still works signed out */
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (mode, { email, password }) => {
    setError(null);
    try {
      const local = localCollection();
      const data = await authenticate(mode, { email, password, ...local });
      setUser(data.user);
      setRemote({
        saved: data.saved,
        readings: data.readings,
        prefs: data.user?.prefs,
      });
      setMigrated(data.migrated || null);
      return { ok: true, migrated: data.migrated };
    } catch (err) {
      const message = readError(
        err,
        mode === "register"
          ? "Couldn't create the account. Try again."
          : "Couldn't sign you in. Try again."
      );
      setError(message);
      return { ok: false, message };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await signOutRequest();
    } catch {
      /* the cookie expires on its own; clearing locally is what matters */
    }
    setUser(null);
    /* An empty collection tells the player to drop this account's data so the
       next person at this browser doesn't inherit it. */
    setRemote({ saved: [], readings: [], cleared: true });
    setMigrated(null);
  }, []);

  const value = {
    user,
    loading,
    error,
    migrated,
    remote,
    signIn,
    signOut,
    dismissMigrated: () => setMigrated(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
