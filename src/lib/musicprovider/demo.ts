import { Howl } from "howler";
import {
  type Album,
  type MusicProvider,
  type PlaybackState,
  type Track,
} from "./musicprovider";

type AlbumManifest = {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  tracks: {
    id: string;
    title: string;
    durationMs: number;
  }[];
};

export class DemoProvider implements MusicProvider {
  readonly source = "demo";
  private needleDropSound: Howl;
  private currentSound: Howl | null = null;
  private currentVolume: number = 1.0; // Default volume
  private currentTrackId: string | null = null;
  private albumBaseUrl = "/demo/albums";

  constructor() {
    // Preload the needle drop sound
    this.needleDropSound = new Howl({
      src: ["/needledrop.aac"],
      html5: false,
      format: ["aac"],
      volume: 0.5, // Default volume for needle drop
    });
  }

  async search(query: string): Promise<Album[]> {
    try {
      const response = await fetch(`${this.albumBaseUrl}/manifest.json`);
      const allAlbums: Omit<Album, "tracks">[] = await response.json();

      if (!query.trim()) {
        return allAlbums.map((a) => ({ ...a, tracks: [] }));
      }

      // Filter albums based on the query (case-insensitive)
      const lowerCaseQuery = query.toLowerCase();
      const results = allAlbums.filter(
        (album) =>
          album.title.toLowerCase().includes(lowerCaseQuery) ||
          album.artist.toLowerCase().includes(lowerCaseQuery),
      );

      // Return partial album data; details will be fetched later
      return results.map((a) => ({ ...a, tracks: [] }));
    } catch (error) {
      console.error("Failed to fetch demo album manifest:", error);
      return [];
    }
  }

  async list(): Promise<Album[]> {
    try {
      const response = await fetch(`${this.albumBaseUrl}/manifest.json`);
      const allAlbums: Omit<Album, "tracks">[] = await response.json();

      return allAlbums.map((a) => ({ ...a, tracks: [] }));
    } catch (error) {
      console.error("Failed to fetch demo album manifest:", error);
      return [];
    }
  }

  async getAlbumDetails(albumId: string): Promise<Album | null> {
    try {
      const response = await fetch(
        `${this.albumBaseUrl}/${albumId}/manifest.json`,
      );
      const albumData = (await response.json()) as AlbumManifest;

      // Map the file paths to full Track objects
      const tracks: Track[] = albumData.tracks.map((t) => ({
        id: `${t.id}`,
        title: t.title,
        durationMs: t.durationMs,
      }));

      return { ...albumData, tracks };
    } catch (error) {
      console.error(`Failed to fetch details for album ${albumId}:`, error);
      return null;
    }
  }

  async play(
    albumId: string,
    trackId: string,
    dropped = false,
    stopAfterTrackId?: string,
    trackIds?: string[],
    positionMs = 0,
  ): Promise<void> {
    console.log("Trying to play ", albumId, trackId, positionMs);
    // If there's an existing sound, stop and unload it to free up memory
    if (this.currentSound) {
      this.currentSound.unload();
    }

    this.currentTrackId = trackId;

    // Find the track URI from the albumId and trackId
    const trackUri = `${this.albumBaseUrl}/${albumId}/${trackId}.aac`;

    return new Promise((resolve) => {
      this.currentSound = new Howl({
        src: [trackUri],
        html5: false,
        format: ["aac"],
        volume: this.currentVolume,
        preload: true,

        onload: () => {
          console.log(`Audio loaded for ${trackId}. Dropped ${dropped}`);
          if (dropped) {
            this.needleDropSound.play();
          }
          if (this.currentSound) {
            // Start playing first
            const soundId = this.currentSound.play();

            if (positionMs > 0) {
              console.log(`Seeking to position: ${positionMs}ms`);
              this.currentSound.seek(positionMs / 1000, soundId);
            }
          }
          resolve();
        },

        onloaderror: (id, error) => {
          console.error(`Failed to load ${trackId}:`, error);
          resolve(); // Still resolve to prevent hanging
        },

        onend: () => {
          console.log("Playback finished for track:", trackId);
          if (stopAfterTrackId && trackId === stopAfterTrackId) {
            // If this is the last track, we don't need to play the next one
            console.log("Last track reached, not playing next.");
            return;
          }
          this.getNextTrackId(albumId, trackId).then((nextTrackId) => {
            if (nextTrackId) {
              this.play(albumId, nextTrackId, false, stopAfterTrackId, 0);
            } else {
              console.log("No next track available.");
            }
          });
        },
      });
    });
  }

  async getNextTrackId(
    albumId: string,
    trackId: string,
  ): Promise<string | null> {
    // Fetch the album details to find the track list
    const albumDetails = await this.getAlbumDetails(albumId);
    if (!albumDetails || !albumDetails.tracks) {
      return null;
    }

    // Find the index of the current track
    const currentIndex = albumDetails.tracks.findIndex(
      (track) => track.id === trackId,
    );
    // TODO: handle disks ending better

    // If it's the last track, return null (no next track)
    if (
      currentIndex === -1 ||
      currentIndex === albumDetails.tracks.length - 1
    ) {
      return null;
    }

    // Return the next track's ID
    return albumDetails.tracks[currentIndex + 1].id;
  }

  async pause(): Promise<void> {
    this.currentSound?.pause();
  }

  async setVolume(volume: number): Promise<void> {
    this.currentVolume = volume;
    if (this.currentSound) {
      this.currentSound.volume(volume);
    }
  }

  async getPlaybackState(): Promise<PlaybackState | null> {
    if (!this.currentSound || !this.currentTrackId) {
      return null;
    }

    const positionSec = (this.currentSound.seek() as number) || 0;

    return {
      isPlaying: this.currentSound.playing(),
      isPaused: !this.currentSound.playing(),
      positionMs: positionSec * 1000,
      durationMs: this.currentSound.duration() * 1000,
      currentTrackId: this.currentTrackId,
    };
  }

  teardown(): void {
    this.currentSound?.unload();
  }
}
