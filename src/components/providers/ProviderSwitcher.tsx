import { useMusicPlayer } from "../../hooks/useMusicPlayer";

export function ProviderSwitcher() {
  const { source, loginWithSpotify, useDemoMode } = useMusicPlayer();
  return (
    <div className="p-3 border border-gray-700 rounded bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 shadow-inner">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={useDemoMode}
            disabled={source === "demo"}
            className="px-3 py-2 bg-gradient-to-b from-orange-500 to-orange-700 text-white text-xs font-mono tracking-wide border border-orange-600 rounded-sm shadow-lg hover:from-orange-400 hover:to-orange-600 disabled:from-orange-700 disabled:to-orange-800 disabled:cursor-not-allowed disabled:border-orange-800 transition-all duration-200"
          >
            DEMO
          </button>
          <button
            onClick={() => {
              const proceed = confirm("Note: Spotify integration only works if you've been added to the developer app allowlist. To set up your own digital turntable, clone the repo and create your own Spotify app at developer.spotify.com\n\nDo you want to continue with Spotify login?");
              if (proceed) {
                loginWithSpotify();
              }
            }}
            disabled={source === "spotify"}
            className="px-3 py-2 bg-gradient-to-b from-green-500 to-green-700 text-white text-xs font-mono tracking-wide border border-green-600 rounded-sm shadow-lg hover:from-green-400 hover:to-green-600 disabled:from-green-800 disabled:to-green-900 disabled:cursor-not-allowed disabled:border-green-900 transition-all duration-200"
          >
            SPOTIFY
          </button>
        </div>
        <div className="flex items-center justify-end space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              source === "demo"
                ? "bg-orange-400 shadow-orange-400/50 shadow-lg"
                : "bg-green-400 shadow-green-400/50 shadow-lg"
            }`}
          ></div>
          <div className="text-xs font-mono text-gray-200 tracking-widest uppercase font-bold">
            {source}
          </div>
        </div>
      </div>
    </div>
  );
}
