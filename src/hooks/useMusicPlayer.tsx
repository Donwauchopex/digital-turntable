import { createContext, useContext } from "react";
import type { MusicProvider } from "../lib/musicprovider/musicprovider";

// Define the shape of the context value
interface MusicPlayerContextType {
  music: MusicProvider;
  source: "spotify" | "demo";
  loginWithSpotify: () => void;
  useDemoMode: () => void;
}

// Create the context with a default value
export const MusicPlayerContext = createContext<MusicPlayerContextType | null>(
  null,
);

// Create the custom hook for easy access
export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error("useMusicPlayer must be used within a MusicPlayerProvider");
  }
  return context;
};
