import type {
  Album,
  MusicProvider,
  PlaybackState,
  Track,
} from "./musicprovider/musicprovider";

export type VinylSideTrack = {
  id: string;
  startMs: number;
  endMs: number;
};

export type VinylSide = {
  tracks: VinylSideTrack[];
  deadWaxLengthMs: number;
};

export type VinylDisk = {
  diskId: string;
  aSide: VinylSide;
  bSide?: VinylSide;
};

export type VinylData = {
  albumId: string; // The ID of the album this vinyl data is for
  albumTitle: string; // The title of the album
  albumArtist: string; // The artist of the album
  disks: VinylDisk[];
  tracks: Map<string, Track>; // id -> track
  coverUrl?: string;
};

function createNewVinylData(album: Album): VinylData {
  return {
    albumId: album.id,
    albumTitle: album.title,
    albumArtist: album.artist,
    disks: [createNewVinylDisk(album.id, 1)],
    tracks: new Map<string, Track>(),
    coverUrl: album.artworkUrl || "",
  };
}

function createNewVinylDisk(albumId: string, num: number): VinylDisk {
  return {
    diskId: `${albumId}-disk-${num}`,
    aSide: createNewVinylSide(),
  };
}

function createNewVinylSide(): VinylSide {
  return {
    tracks: [],
    deadWaxLengthMs: 0,
  };
}

function addTrackToSide(
  side: VinylSide,
  track: Track,
  totalElapsedDurationMs: number,
): void {
  side.tracks.push({
    id: track.id,
    startMs: totalElapsedDurationMs,
    endMs: totalElapsedDurationMs + track.durationMs,
  });
}

function getVinylSideStartMs(side: VinylSide): number {
  if (side.tracks.length == 0) return 0;
  return side.tracks[0].startMs;
}

function getVinylSideEndMs(side: VinylSide): number {
  if (side.tracks.length == 0) return 0;
  return side.tracks[side.tracks.length - 1].endMs;
}

function getVinylSideDurationMs(side: VinylSide): number {
  return getVinylSideEndMs(side) - getVinylSideStartMs(side);
}

function getVinylDiskDurationMs(disk: VinylDisk): number {
  const endMs = disk.bSide
    ? getVinylSideEndMs(disk.bSide)
    : getVinylSideEndMs(disk.aSide);

  return endMs - getVinylSideStartMs(disk.aSide);
}

function getVinylDataDurationMs(data: VinylData): number {
  let total = 0;

  for (const disk of data.disks) {
    total += getVinylDiskDurationMs(disk);
  }

  return total;
}

export const SingleSideMaxDurationMs = 1440000; // 24 minutes in milliseconds
const singleDiskMaxDurationMs = 2 * SingleSideMaxDurationMs;

export async function CalculateVinylData(
  provider: MusicProvider,
  albumId: string,
): Promise<VinylData> {
  // const albumData = await spotifyClient.albums.get(albumID);
  const albumData = await provider.getAlbumDetails(albumId);
  if (!albumData) {
    throw new Error(`Album with ID ${albumId} not found`);
  }
  const avd = createNewVinylData(albumData);
  let albumDurationMs = 0;
  for (const track of albumData.tracks) {
    albumDurationMs += track.durationMs;
  }

  const minSides = Math.ceil(albumDurationMs / SingleSideMaxDurationMs);
  const minDisks = Math.ceil(minSides / 2);
  const targetSides = minDisks * 2;
  const targetSideDuration = Math.ceil(albumDurationMs / targetSides);
  const targetDiskDuration = targetSideDuration * 2;

  avd.coverUrl = albumData.artworkUrl || "";

  for (const track of albumData.tracks) {
    avd.tracks.set(track.id, track);
    const latestDisk = avd.disks[avd.disks.length - 1];
    const totalElapsedDurationMs = getVinylDataDurationMs(avd);
    if (getVinylDiskDurationMs(latestDisk) > targetDiskDuration) {
      const newDisk = createNewVinylDisk(albumId, avd.disks.length + 1);
      addTrackToSide(newDisk.aSide, track, totalElapsedDurationMs);
      avd.disks.push(newDisk);
      continue;
    }

    const canFitOnDiskOverall =
      getVinylDiskDurationMs(latestDisk) + track.durationMs <=
      singleDiskMaxDurationMs;

    if (!canFitOnDiskOverall) {
      const newDisk = createNewVinylDisk(albumId, avd.disks.length + 1);

      addTrackToSide(newDisk.aSide, track, totalElapsedDurationMs);

      avd.disks.push(newDisk);

      continue;
    }

    const aSideDuration = getVinylSideDurationMs(latestDisk.aSide);

    const canFitOnASide =
      aSideDuration + track.durationMs <= SingleSideMaxDurationMs;

    // Can fit on A and we are less than target length
    if (canFitOnASide && aSideDuration <= targetSideDuration) {
      addTrackToSide(latestDisk.aSide, track, totalElapsedDurationMs);
    } else {
      if (!latestDisk.bSide) {
        latestDisk.bSide = createNewVinylSide();
      }
      addTrackToSide(latestDisk.bSide, track, totalElapsedDurationMs);
    }
  }

  // Ensure the last disk has a B side if it has an A side
  if (avd.disks.length > 0 && !avd.disks[avd.disks.length - 1].bSide) {
    avd.disks[avd.disks.length - 1].bSide = createNewVinylSide();
  }

  for (const disk of avd.disks) {
    const getSideMusicDuration = (side: VinylSide) =>
      side.tracks.reduce((acc, t) => {
        const trackInfo = avd.tracks.get(t.id);
        return acc + (trackInfo?.durationMs || 0);
      }, 0);

    const aSideMusicDuration = getSideMusicDuration(disk.aSide);
    disk.aSide.deadWaxLengthMs = SingleSideMaxDurationMs - aSideMusicDuration;

    if (disk.bSide) {
      const bSideMusicDuration = getSideMusicDuration(disk.bSide);
      disk.bSide.deadWaxLengthMs = SingleSideMaxDurationMs - bSideMusicDuration;
    }
  }

  return avd;
}

export type CurrentSideProgress = {
  trackIdOnSide: string | null;
  progressOnSideMs: number;
  totalSideDurationMs: number;
  trackProgressInItselfMs: number;
  isLastTrackOnSide: boolean;
};

export function CalculateSideProgress(
  currentSideTracks: VinylSideTrack[],
  allTracksMap: Map<string, Track>, // Map of all album tracks (id -> SimplifiedTrack)
  playbackState: PlaybackState,
): CurrentSideProgress | null {
  console.log(playbackState);
  if (!playbackState.currentTrackId || currentSideTracks.length === 0) {
    return null;
  }

  let progressOnSideMs = 0;
  let foundCurrentTrackOnSide = false;
  const trackProgressInItselfMs = playbackState.positionMs;
  let trackIdOnSide: string | null = null;
  let isLastTrackOnSide = false;

  for (let i = 0; i < currentSideTracks.length; i++) {
    const sideTrackEntry = currentSideTracks[i]; // This is { id: string, startMs: number, endMs: number }
    const fullTrackInfo = allTracksMap.get(sideTrackEntry.id);

    if (!fullTrackInfo) {
      console.warn(
        `Track info not found in allTracksMap for ID: ${sideTrackEntry.id}`,
      );
      continue; // Should not happen if vinylData.tracks is correctly populated
    }

    if (sideTrackEntry.id === playbackState.currentTrackId) {
      progressOnSideMs += playbackState.positionMs; // Add current track's own progress
      trackIdOnSide = sideTrackEntry.id;
      foundCurrentTrackOnSide = true;
      isLastTrackOnSide = i === currentSideTracks.length - 1;
      break; // Found current track, progress calculated up to its current position
    } else {
      // This track has finished on this side
      progressOnSideMs += fullTrackInfo.durationMs;
    }
  }

  if (!foundCurrentTrackOnSide) {
    return null;
  }

  const totalSideDurationMs = currentSideTracks.reduce((acc, st) => {
    const ft = allTracksMap.get(st.id);
    return acc + (ft ? ft.durationMs : 0);
  }, 0);

  return {
    trackIdOnSide,
    progressOnSideMs: Math.min(progressOnSideMs, totalSideDurationMs), // Cap progress at total duration
    totalSideDurationMs,
    trackProgressInItselfMs,
    isLastTrackOnSide,
  };
}
