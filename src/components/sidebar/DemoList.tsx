import { useState, useEffect, useMemo } from "react";
import { useMusicPlayer } from "../../hooks/useMusicPlayer";
import { ARM_ANGLE_NO_INTERSECT } from "../../constants/arm";
import type { Album, MusicProvider } from "../../lib/musicprovider/musicprovider";

interface DemoListProps {
  setAlbumID: React.Dispatch<React.SetStateAction<string>>;
  isTurntableOn: boolean;
  armActualAngle: number;
}

export function DemoList({
  setAlbumID,
  isTurntableOn,
  armActualAngle,
}: DemoListProps) {
  const { music } = useMusicPlayer();
  const [albums, setAlbums] = useState<Album[]>([]);

  const isSelectionDisabled = useMemo(() => {
    return isTurntableOn || armActualAngle > ARM_ANGLE_NO_INTERSECT;
  }, [isTurntableOn, armActualAngle]);

  async function listAlbums(music: MusicProvider) {
    try {
      const ret = await music.list();
      return ret;
    } catch (error) {
      console.error("Failed to fetch demo albums:", error);
      return [];
    }
  }

  useEffect(() => {
    async function loadAlbums() {
      const demoAlbums = await listAlbums(music);
      setAlbums(demoAlbums);
    }
    loadAlbums();
  }, [music]);

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-sm font-mono font-bold text-gray-300 tracking-widest border-b border-gray-700 pb-2">
        DEMO ALBUMS
      </h2>
      {albums.length === 0 ? (
        <div className="flex items-center justify-center space-x-2 p-4">
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
          <span className="text-gray-400 font-mono text-xs">LOADING...</span>
        </div>
      ) : (
        <div className="space-y-2">
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
                onClick={() => {
                  if (isSelectionDisabled) {
                    return;
                  }
                  setAlbumID(album.id);
                }}
                className={`ml-3 px-3 py-1 text-xs font-mono font-bold tracking-wide rounded transition-all duration-200 ${
                  isSelectionDisabled
                    ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                    : "bg-gradient-to-b from-orange-500 to-orange-700 text-white hover:from-orange-400 hover:to-orange-600 border border-orange-400 shadow-md"
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