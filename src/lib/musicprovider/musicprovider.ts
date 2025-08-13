export interface Track {
  id: string; // e.g., "spotify:track:12345" or "01"
  title: string;
  durationMs: number;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  tracks: Track[];
}

export interface MusicProvider {
  readonly source: "spotify" | "demo"; //todo: apple

  search(query: string): Promise<Album[]>;
  list(): Promise<Album[]>;
  getAlbumDetails(albumId: string): Promise<Album | null>;

  play(
    albumId: string,
    trackId: string,
    dropped?: boolean,
    stopAfterTrackId?: string,
    trackIds?: string[],
    positionMs?: number,
  ): Promise<void>;
  pause(): Promise<void>;
  setVolume(volume: number): Promise<void>;

  getPlaybackState(): Promise<PlaybackState | null>;

  teardown(): void;
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  positionMs: number;
  durationMs: number;
  currentTrackId: string | null;
}
