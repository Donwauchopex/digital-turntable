import { useMemo } from "react";
import { ARM_ANGLE_NO_INTERSECT } from "../../constants/arm";
import type { PlaybackState } from "../../lib/musicprovider/musicprovider";
import type { VinylData, VinylDisk } from "../../lib/vinyldata";

interface AlbumDetailsSidebarProps {
  vinylData: VinylData;
  currentDisk: VinylDisk;
  currentSide: "a" | "b";
  playbackState: PlaybackState | null;
  onDiskChange: (disk: VinylDisk) => void;
  isTurntableOn: boolean;
  armActualAngle: number;
}

export function AlbumDetailsSidebar({
  vinylData,
  currentDisk,
  currentSide,
  playbackState,
  onDiskChange,
  isTurntableOn,
  armActualAngle,
}: AlbumDetailsSidebarProps) {
  const sideObject =
    currentSide === "a" ? currentDisk.aSide : currentDisk.bSide;

  const isSelectionDisabled = useMemo(() => {
    return isTurntableOn || armActualAngle > ARM_ANGLE_NO_INTERSECT;
  }, [isTurntableOn, armActualAngle]);

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-3">
        <h3 className="text-sm font-mono font-bold text-gray-300 tracking-widest border-b border-gray-700 pb-2">
          DISKS
        </h3>
        <div className="flex flex-wrap gap-3">
          {vinylData.disks.map((disk, i) => (
            <button
              key={disk.diskId}
              onClick={() => {
                if (isSelectionDisabled) {
                  return;
                }
                onDiskChange(disk);
              }}
              className={`relative  w-12 h-12 rounded-full transition-all duration-200 bg-gray-900 ${
                disk.diskId === currentDisk.diskId
                  ? "border-2 border-green-400 "
                  : isSelectionDisabled
                    ? "border-2 border-gray-700 cursor-not-allowed opacity-50"
                    : "border-2 border-gray-600 hover:border-gray-500  hover:cursor-pointer"
              }`}
              disabled={isSelectionDisabled}
              aria-label={`Select disk ${i + 1}`}
            >
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800"></div>
              <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 rounded-full border border-gray-700"></div>
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold text-gray-400">
                {i + 1}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-mono font-bold text-gray-300 tracking-widest border-b border-gray-700 pb-2">
          NOW PLAYING
        </h2>
        <div className="p-3 bg-gray-900 border border-gray-700 rounded">
          <div className="flex items-center">
            <img
              src={vinylData.coverUrl || "/favicon.svg"}
              alt={`Cover of ${vinylData.albumTitle}`}
              className="w-12 h-12 object-cover rounded border border-gray-600 mr-3 flex-shrink-0"
            />
            <div className="flex-grow min-w-0">
              <h3 className="text-sm font-medium text-gray-100 truncate">
                {vinylData.albumTitle}
              </h3>
              <p className="text-xs text-gray-400 truncate font-mono">
                {vinylData.albumArtist}
              </p>
            </div>
          </div>
        </div>
      </div>

      {sideObject && (
        <div className="space-y-3">
          <h3 className="text-sm font-mono font-bold text-gray-300 tracking-widest border-b border-gray-700 pb-2">
            SIDE {currentSide.toUpperCase()} TRACKS
          </h3>
          <div className="space-y-1">
            {sideObject.tracks.map((track) => (
              <div
                key={track.id}
                className={`p-2 rounded text-xs transition-all duration-200 ${
                  playbackState?.currentTrackId === track.id &&
                  !playbackState.isPaused
                    ? "bg-green-900 border border-green-500 shadow-md"
                    : "bg-gray-900 hover:bg-gray-800 border border-gray-700"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span
                    className={`font-medium truncate ${
                      playbackState?.currentTrackId === track.id &&
                      !playbackState.isPaused
                        ? "text-green-100"
                        : "text-gray-100"
                    }`}
                  >
                    {vinylData.tracks.get(track.id)?.title}
                  </span>
                  <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                    {playbackState?.currentTrackId === track.id &&
                      !playbackState.isPaused && (
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      )}
                    <span className="text-gray-400 font-mono text-xs">
                      {Math.floor(
                        vinylData.tracks.get(track.id)!.durationMs / 60000,
                      )}
                      :
                      {String(
                        Math.floor(
                          (vinylData.tracks.get(track.id)!.durationMs % 60000) /
                            1000,
                        ),
                      ).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
