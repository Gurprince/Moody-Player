import { createContext, useContext } from "react";

export const PlayerContext = createContext(null);

export function usePlayer() {
  const value = useContext(PlayerContext);
  if (!value) throw new Error("usePlayer must be used inside a PlayerProvider");
  return value;
}
