import { useState, useMemo } from "react";
import { useMusicPlayer } from "../../hooks/useMusicPlayer";
import { ARM_ANGLE_NO_INTERSECT } from "../../constants/arm";
import type { Album } from "../../lib/musicprovider/musicprovider";

interface SpotifySearchProps {
  setAlbumID: React.Dispatch<React.SetStateAction<string>>;
  isTurntableOn: boolean;
  armActualAngle: number;
}

export function SpotifySearch({
  setAlbumID,
  isTurntableOn,
  armActualAngle,
}: SpotifySearchProps) {
  const { music } = useMusicPlayer();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [albums, setAlbums] = useState<Album[]>();

  const isSelectionDisabled = useMemo(() => {
    return isTurntableOn || armActualAngle > ARM_ANGLE_NO_INTERSECT;
  }, [isTurntableOn, armActualAngle]);

  async function handleSearch() {
    if (!query.trim()) {
      setAlbums([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setAlbums([]);

    try {
      const res = await music.search(query);
      setAlbums(res);
    } catch (err) {
      console.error("Search failed:", err);
      setAlbums([]);
    } finally {
      setLoading(false);
    }
  }

  function handleAlbumSelection(id: string) {
    if (isSelectionDisabled) {
      return;
    }

    setAlbumID(id);
    setAlbums(undefined);
    setQuery("");
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center space-x-3">
        <input
          className="flex-grow px-3 py-2 border border-gray-700 rounded bg-gray-900 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all duration-200"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading && query.trim()) {
              handleSearch();
            }
          }}
          placeholder="Search albums..."
          disabled={loading}
        />

        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-gradient-to-b from-green-500 to-green-700 text-white text-xs font-mono font-bold tracking-wide border border-green-400 rounded shadow-lg hover:from-green-400 hover:to-green-600 disabled:from-gray-800 disabled:to-gray-900 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-500 transition-all duration-200"
        >
          SEARCH
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center space-x-2 p-4">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-gray-400 font-mono text-xs">SEARCHING...</span>
        </div>
      )}

      {!loading && albums?.length === 0 && (
        <div className="p-3 text-sm text-gray-400 bg-gray-900 border border-gray-700 rounded font-mono">
          No albums found for "{query}"
        </div>
      )}

      {!loading && albums && albums.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-mono font-bold text-gray-300 tracking-widest border-b border-gray-700 pb-2">
            SEARCH RESULTS
          </h2>

          {albums.map((album) => (
            <div
              key={album.id}
              className="flex items-center p-3 bg-gray-900 border border-gray-700 rounded hover:bg-gray-800 hover:border-gray-600 transition-all duration-200"
            >
              <img
                src={album.artworkUrl || "/favicon.svg"}
                alt={`Cover of ${album.title}`}
                className="w-10 h-10 object-cover rounded border border-gray-600 mr-3 flex-shrink-0"
              />

              <div className="flex-grow min-w-0">
                <h3 className="text-sm font-medium text-gray-100 truncate">
                  {album.title}
                </h3>
                <p className="text-xs text-gray-400 truncate font-mono">{album.artist}</p>
              </div>

              <button
                onClick={() => handleAlbumSelection(album.id)}
                className={`ml-3 px-3 py-1 text-xs font-mono font-bold tracking-wide rounded transition-all duration-200 ${
                  isSelectionDisabled
                    ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                    : "bg-gradient-to-b from-green-500 to-green-700 text-white hover:from-green-400 hover:to-green-600 border border-green-400 shadow-md"
                }`}
                aria-label={`Select album ${album.title}`}
              >
                SELECT
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}