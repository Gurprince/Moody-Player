import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PlayerContext } from "./playerContext.js";
import useStoredState from "../hooks/useStoredState.js";
import { trackKey } from "../api.js";

const REPEAT_STATES = ["off", "all", "one"];

function shuffled(length, first) {
  const rest = [];
  for (let i = 0; i < length; i += 1) if (i !== first) rest.push(i);
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return first === undefined ? rest : [first, ...rest];
}

const identity = (length) => Array.from({ length }, (_, i) => i);

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  if (audioRef.current === null && typeof Audio !== "undefined") {
    audioRef.current = new Audio();
  }

  const [queue, setQueue] = useState([]);
  const [order, setOrder] = useState([]);
  const [cursor, setCursor] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [stalled, setStalled] = useState(false);

  const [shuffle, setShuffle] = useStoredState("mp:shuffle", false);
  const [repeat, setRepeat] = useStoredState("mp:repeat", "off");
  const [volume, setVolume] = useStoredState("mp:volume", 0.8);
  const [muted, setMuted] = useStoredState("mp:muted", false);
  const [saved, setSaved] = useStoredState("mp:saved", []);
  const [history, setHistory] = useStoredState("mp:history", []);
  const [mood, setMood] = useStoredState("mp:mood", null);

  const track = cursor >= 0 ? queue[order[cursor]] : null;

  /* ---------------- audio element wiring ---------------- */

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onTime = () => setTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onPlay = () => {
      setPlaying(true);
      setStalled(false);
    };
    const onPause = () => setPlaying(false);
    const onError = () => {
      setPlaying(false);
      setStalled(true);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
      audio.pause();
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = Math.min(Math.max(volume, 0), 1);
      audio.muted = muted;
    }
  }, [volume, muted]);

  /* Load and start whichever track the cursor now points at. */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track?.audio) return;
    setTime(0);
    setDuration(0);
    setStalled(false);
    audio.src = track.audio;
    audio.play().catch(() => {
      setPlaying(false);
      setStalled(true);
    });
  }, [track?.audio]);

  /* ---------------- transport ---------------- */

  const step = useCallback(
    (delta) => {
      setCursor((prev) => {
        if (prev < 0 || order.length === 0) return prev;
        const next = prev + delta;
        if (next >= order.length) return repeat === "all" ? 0 : prev;
        if (next < 0) return repeat === "all" ? order.length - 1 : 0;
        return next;
      });
    },
    [order.length, repeat]
  );

  const next = useCallback(() => step(1), [step]);

  const previous = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    step(-1);
  }, [step]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const onEnded = () => {
      if (repeat === "one") {
        audio.currentTime = 0;
        audio.play().catch(() => setPlaying(false));
        return;
      }
      if (cursor >= 0 && cursor < order.length - 1) {
        setCursor(cursor + 1);
      } else if (repeat === "all" && order.length > 0) {
        setCursor(0);
      } else {
        setPlaying(false);
      }
    };
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [cursor, order.length, repeat]);

  const play = useCallback(
    (list, startIndex = 0) => {
      const playable = list.filter((item) => item?.audio);
      if (playable.length === 0) return;
      const start = Math.max(
        0,
        playable.findIndex((item) => item === list[startIndex])
      );
      const nextOrder = shuffle
        ? shuffled(playable.length, start)
        : identity(playable.length);
      setQueue(playable);
      setOrder(nextOrder);
      setCursor(shuffle ? 0 : start);
    },
    [shuffle]
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (audio.paused) audio.play().catch(() => setStalled(true));
    else audio.pause();
  }, [track]);

  /** Play this track if it isn't current; otherwise toggle it. */
  const playTrack = useCallback(
    (list, index) => {
      const target = list[index];
      if (track && trackKey(track) === trackKey(target)) {
        toggle();
        return;
      }
      play(list, index);
    },
    [play, toggle, track]
  );

  const seek = useCallback((seconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setTime(seconds);
  }, []);

  const jumpTo = useCallback((position) => setCursor(position), []);

  /* Reorder around whatever is playing, so the current track keeps going. */
  const toggleShuffle = useCallback(() => {
    const nowOn = !shuffle;
    setShuffle(nowOn);
    if (order.length === 0) return;
    const playingIndex = order[cursor] ?? 0;
    if (nowOn) {
      setOrder(shuffled(order.length, playingIndex));
      setCursor(0);
    } else {
      setOrder(identity(order.length));
      setCursor(playingIndex);
    }
  }, [cursor, order, shuffle, setShuffle]);

  const cycleRepeat = useCallback(() => {
    setRepeat((current) => {
      const at = REPEAT_STATES.indexOf(current);
      return REPEAT_STATES[(at + 1) % REPEAT_STATES.length];
    });
  }, [setRepeat]);

  const clearQueue = useCallback(() => {
    audioRef.current?.pause();
    setQueue([]);
    setOrder([]);
    setCursor(-1);
    setTime(0);
    setDuration(0);
  }, []);

  /* ---------------- saved tracks & readings ---------------- */

  const isSaved = useCallback(
    (item) => saved.some((row) => trackKey(row) === trackKey(item)),
    [saved]
  );

  const toggleSaved = useCallback(
    (item) => {
      setSaved((rows) =>
        rows.some((row) => trackKey(row) === trackKey(item))
          ? rows.filter((row) => trackKey(row) !== trackKey(item))
          : [{ ...item, savedAt: Date.now() }, ...rows]
      );
    },
    [setSaved]
  );

  const recordReading = useCallback(
    (entry) => {
      setHistory((rows) => [{ ...entry, at: Date.now() }, ...rows].slice(0, 40));
    },
    [setHistory]
  );

  const clearHistory = useCallback(() => setHistory([]), [setHistory]);

  /* ---------------- keyboard transport ---------------- */

  useEffect(() => {
    const onKey = (event) => {
      const el = event.target;
      const typing =
        el instanceof HTMLElement &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable);
      if (typing || !track) return;

      if (event.code === "Space") {
        event.preventDefault();
        toggle();
      } else if (event.key === "ArrowRight" && event.shiftKey) {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft" && event.shiftKey) {
        event.preventDefault();
        previous();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, previous, toggle, track]);

  const upcoming = useMemo(
    () => order.slice(cursor + 1).map((i) => queue[i]),
    [order, cursor, queue]
  );

  const value = {
    track,
    queue,
    order,
    cursor,
    upcoming,
    playing,
    stalled,
    time,
    duration,
    shuffle,
    repeat,
    volume,
    muted,
    saved,
    history,
    mood,
    play,
    playTrack,
    toggle,
    next,
    previous,
    seek,
    jumpTo,
    toggleShuffle,
    cycleRepeat,
    setVolume,
    setMuted,
    clearQueue,
    isSaved,
    toggleSaved,
    recordReading,
    clearHistory,
    setMood,
  };

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}
