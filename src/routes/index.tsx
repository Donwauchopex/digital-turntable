import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import {
  usePlayerDevice,
  useSpotifyPlayer,
} from "react-spotify-web-playback-sdk";
import { ProviderSwitcher } from "../components/providers/ProviderSwitcher";
import { AlbumDetailsSidebar } from "../components/sidebar/AlbumDetailsSidebar";
import { DemoList } from "../components/sidebar/DemoList";
import { SpotifySearch } from "../components/sidebar/SpotifySearch";
import { TurntableArm } from "../components/turntable/Arm";
import { Vinyl } from "../components/vinyl/Vinyl";
import { ARM_ANGLE_REST } from "../constants/arm";
import { MusicPlayerContext, useMusicPlayer } from "../hooks/useMusicPlayer";
import { useTurntableControls } from "../hooks/useTurntableControls";
import { useVinylPlayer } from "../hooks/useVinylPlayer";
import { DemoProvider } from "../lib/musicprovider/demo";
import type { MusicProvider } from "../lib/musicprovider/musicprovider";
import { SpotifyProvider } from "../lib/musicprovider/spotify";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, signinRedirect, signoutRedirect } = useAuth();
  const [source, setSource] = useState<"spotify" | "demo">("demo");
  const [musicProvider, setMusicProvider] = useState<MusicProvider>(
    new DemoProvider(),
  );
  const player = useSpotifyPlayer();
  const device = usePlayerDevice();

  const spotifyClient = useMemo(() => {
    if (user?.access_token && user?.refresh_token) {
      return SpotifyApi.withAccessToken(
        import.meta.env.VITE_SPOTIFY_CLIENT_ID,
        {
          access_token: user.access_token,
          token_type: "Bearer",
          expires_in: user.expires_in || 0,
          refresh_token: user.refresh_token,
        },
      );
    }
    return null;
  }, [user]);

  useEffect(() => {
    // We wait until the spotify player is ready before creating the provider
    if (source === "spotify" && spotifyClient && player && device) {
      setMusicProvider(new SpotifyProvider(spotifyClient, player, device));
    }
  }, [source, spotifyClient, player, device]);

  useEffect(() => {
    if (user?.access_token) {
      setSource("spotify");
    } else {
      setSource("demo");
    }
  }, [user]);

  const contextValue = {
    music: musicProvider,
    source: musicProvider?.source || "demo",
    loginWithSpotify: () => signinRedirect(),
    useDemoMode: () => {
      if (user) {
        // If the user is logged in, sign them out to switch to demo
        signoutRedirect({ post_logout_redirect_uri: window.location.href });
      }
      setSource("demo");
    },
  };

  return (
    <MusicPlayerContext.Provider value={contextValue}>
      {musicProvider ? <Turntable /> : <p>Initializing Player...</p>}
    </MusicPlayerContext.Provider>
  );
}

function Turntable() {
  const { music } = useMusicPlayer();
  const [albumId, setAlbumID] = useState("");
  const [armAngle, setArmAngle] = useState(ARM_ANGLE_REST);
  const { isTurntableOn, volume, toggleTurntablePower, handleVolumeChange } =
    useTurntableControls();

  const {
    playbackState,
    vinylData,
    currentDisk,
    currentSide,
    shouldStartOffscreen,
    changeDisk,
    flipDisk,
    vinylRef,
  } = useVinylPlayer({
    music,
    albumId,
    isTurntableOn,
    getArmActualAngle: () => armAngle,
  });

  const currentSideObject = useMemo(() => {
    console.log("Creating currentSideObject with:", {
      vinylData,
      currentDisk,
      currentSide,
    });

    if (!vinylData || !currentDisk) {
      console.log("Missing vinylData or currentDisk");
      return undefined;
    }

    if (currentSide === "a") {
      console.log("Returning aSide:", currentDisk.aSide);
      return currentDisk.aSide;
    } else if (currentSide === "b") {
      console.log("Returning bSide:", currentDisk.bSide);
      return currentDisk.bSide;
    }

    console.log("currentSide is neither 'a' nor 'b':", currentSide);
    return undefined;
  }, [vinylData, currentDisk, currentSide]);

  useEffect(() => {
    if (playbackState && !playbackState.isPaused) {
      if (!isTurntableOn) {
        music.pause();
      }
    }
  }, [isTurntableOn, music, playbackState]);

  return (
    <div className="h-screen flex">
      <div className="bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white w-2/5 overflow-clip flex flex-col gap-2 p-6 overflow-y-auto max-h-screen border-r-4 border-gray-700 shadow-2xl">
        <div className="text-center pb-2 mb-2">
          <h2 className="text-lg font-mono font-light tracking-wider text-gray-100">
            DIGITAL TURNTABLE
          </h2>
        </div>
        <ProviderSwitcher />
        {music && music.source === "spotify" && (
          <SpotifySearch
            setAlbumID={setAlbumID}
            isTurntableOn={isTurntableOn}
            armActualAngle={armAngle}
          />
        )}
        {music && music.source === "demo" && (
          <DemoList
            setAlbumID={setAlbumID}
            isTurntableOn={isTurntableOn}
            armActualAngle={armAngle}
          />
        )}
        {music && vinylData && currentDisk && (
          <AlbumDetailsSidebar
            vinylData={vinylData}
            currentDisk={currentDisk}
            currentSide={currentSide}
            playbackState={playbackState}
            onDiskChange={changeDisk}
            isTurntableOn={isTurntableOn}
            armActualAngle={armAngle}
          />
        )}
        
        {/* GitHub Link */}
        <div className="mt-auto pt-4">
          <a
            href="https://github.com/Donwauchopex/digital-turntable"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200 text-sm"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </a>
        </div>
      </div>

      <div className="relative perspective-distant w-full overflow-hidden h-screen flex items-center justify-center bg-zinc-500">
        <TurntableArm
          albumId={albumId}
          power={isTurntableOn}
          togglePower={toggleTurntablePower}
          disk={currentSideObject}
          setArmAngle={setArmAngle}
          style={{ transformOrigin: "100% 50%" }}
          className="z-30 absolute top-[calc(50%-35vmin)] left-[calc(50%-12vmin)] w-[67.5vmin]"
        />
        {vinylData && (
          <Vinyl
            ref={vinylRef}
            isSpinning={isTurntableOn}
            coverArtUrl={vinylData?.coverUrl}
            handleDiskFlip={flipDisk}
            currentDisk={currentDisk}
            shouldStartOffscreen={shouldStartOffscreen}
          />
        )}
        <div className="absolute left-auto top-auto w-[90vmin] h-[90vmin] bg-gradient-to-br from-zinc-400 to-zinc-500 rounded-full pointer-events-none z-10"></div>
        {/* Display current song title */}
        {/* Volume and Power Controls - positioned to avoid disk overlap */}
        <div className="absolute bottom-[5vmin] left-[5vmin] z-40">
          <div className="bg-zinc-800 border border-zinc-700 p-4 flex flex-col items-center gap-y-4 shadow-2xl rounded-lg backdrop-blur-sm bg-opacity-95 min-w-[12vmin]">
            {/* Volume Control */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-xs font-mono text-zinc-400 tracking-wider">
                VOLUME
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={handleVolumeChange}
                className="w-[8vmin] accent-green-500"
                aria-label="Volume Slider"
              />
              <div className="text-xs font-mono text-zinc-400">
                {Math.round(volume * 100)}
              </div>
            </div>
            {/* Power Button */}
            <button
              onClick={() => toggleTurntablePower()}
              className={`w-[8vmin] h-[4vmin] border-2 flex items-center justify-center transition-all duration-200 rounded font-mono text-[1.2vmin] font-bold tracking-wider shadow-inner ${
                isTurntableOn
                  ? "border-red-600 bg-gradient-to-b from-red-400 to-red-600 text-white hover:from-red-300 hover:to-red-500 shadow-red-900/50"
                  : "border-green-600 bg-gradient-to-b from-green-400 to-green-600 text-white hover:from-green-300 hover:to-green-500 shadow-green-900/50"
              }`}
            >
              <span className="drop-shadow-sm">
                {isTurntableOn ? "STOP" : "START"}
              </span>
            </button>

            {/* Power Indicator LED */}
            <div className="flex items-center gap-2">
              <div
                className={`w-[0.8vmin] h-[0.8vmin] rounded-full transition-all duration-300 ${
                  isTurntableOn
                    ? "bg-green-400 shadow-green-400/50 shadow-md animate-pulse"
                    : "bg-zinc-600"
                }`}
              />
              <span className="text-xs font-mono text-zinc-500">PWR</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
