import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import type { PlayerDevice } from "react-spotify-web-playback-sdk";
import type { Album, MusicProvider, PlaybackState } from "./musicprovider";

const startResumePlaybackEndpoint = "me/player/play";

// Note: Spotify sdk passes position_ms as positionMs making it always be ignored
type PatchedStartResumePlaybackBody = {
  // context_uri: string;
  offset: {
    uri: string;
  };
  uris: string[];
  position_ms: number;
};

export class SpotifyProvider implements MusicProvider {
  readonly source = "spotify";
  private needleDropSound: Howl;
  private spotifyDevice: PlayerDevice;
  private spotifyApi: SpotifyApi;
  private spotifyPlayer: Spotify.Player;

  constructor(api: SpotifyApi, player: Spotify.Player, device: PlayerDevice) {
    this.spotifyApi = api;
    this.spotifyPlayer = player;
    this.spotifyDevice = device;

    // Preload the needle drop sound
    this.needleDropSound = new Howl({
      src: ["/needledrop.aac"],
      html5: false,
      format: ["aac"],
      volume: 0.5, // Default volume for needle drop
    });
  }

  async search(query: string): Promise<Album[]> {
    const response = await this.spotifyApi.search(query, ["album"]);
    const spotifyAlbums = response.albums?.items || [];

    return spotifyAlbums
      .filter((a) => {
        return a.album_type === "album"; // filters single or compilation albums
      })
      .map((album) => {
        return {
          id: `spotify:album:${album.id}`,
          title: album.name,
          artist: album.artists.map((a) => a.name).join(", "),
          artworkUrl: album.images.length > 0 ? album.images[0].url : "",
          tracks: [], // Not fetched when searching
        };
      });
  }

  async list(): Promise<Album[]> {
    const response = await this.spotifyApi.currentUser.albums.savedAlbums();
    const spotifyAlbums = response.items || [];

    return spotifyAlbums
      .filter((a) => {
        return a.album.album_type === "album"; // filters single or compilation albums
      })
      .map((item) => {
        const album = item.album;
        return {
          id: `spotify:album:${album.id}`,
          title: album.name,
          artist: album.artists.map((a) => a.name).join(", "),
          artworkUrl: album.images.length > 0 ? album.images[0].url : "",
          tracks: [], // Not fetched when listing
        };
      });
  }

  async getAlbumDetails(albumId: string): Promise<Album | null> {
    const spotifyId = albumId.replace("spotify:album:", "");
    const spotifyAlbum = await this.spotifyApi.albums.get(spotifyId);
    if (!spotifyAlbum) return null;
    return {
      id: `spotify:album:${spotifyAlbum.id}`,
      title: spotifyAlbum.name,
      artist: spotifyAlbum.artists.map((a) => a.name).join(", "),
      artworkUrl:
        spotifyAlbum.images.length > 0 ? spotifyAlbum.images[0].url : "",
      tracks: spotifyAlbum.tracks.items.map((track) => {
        return {
          id: `spotify:track:${track.id}`,
          uri: track.uri,
          title: track.name,
          durationMs: track.duration_ms,
        };
      }),
    };
  }

  async play(
    _: string,
    trackIds: string[],
    dropped = false,
    positionMs = 0,
  ): Promise<void> {
    const deviceId = this.spotifyDevice?.device_id;
    if (!deviceId) {
      throw new Error(
        "No active Spotify device found. Please ensure a device is connected.",
      );
    }

    if (!trackIds || trackIds.length === 0) {
      return;
    }

    const trackId = trackIds[0]; // First track is the current track
    const body: PatchedStartResumePlaybackBody = {
      offset: {
        uri: `${trackId}`,
      },
      uris: trackIds,
      position_ms: Math.floor(positionMs),
    };

    await this.spotifyApi
      .makeRequest(
        "PUT",
        `${startResumePlaybackEndpoint}?device_id=${deviceId}`,
        JSON.stringify(body),
      )
      .then(() => {
        if (dropped) {
          this.needleDropSound.play();
        }
      });
  }

  async pause(): Promise<void> {
    await this.spotifyPlayer.pause();
  }

  async setVolume(volume: number): Promise<void> {
    if (this.spotifyPlayer) {
      this.spotifyPlayer.setVolume(volume);
    }
  }

  //  const pause

  // async stopAfterTrackId(albumId: string, trackId: string): Promise<void> {
  //   const albumData = await this.getAlbumDetails(albumId);

  //   // Find the trackId after the provided trackId
  //   if (!albumData || !albumData.tracks) {
  //     throw new Error(`Album with ID ${albumId} not found or has no tracks`);
  //   }
  //   const trackIndex = albumData.tracks.findIndex(
  //     (track) => track.id === trackId,
  //   );
  //   if (trackIndex === -1 || trackIndex === albumData.tracks.length - 1) {
  //     // No next track will auto stop
  //     console.log("Spotify will stop");
  //     return;
  //   }

  //   const nextTrackId = albumData.tracks[trackIndex + 1].id;

  //   const callbackFn = (state: Spotify.PlaybackState) => {
  //     if (state && state.track_window.current_track.id === nextTrackId) {
  //       console.log("Next track marked as stoppage");
  //       this.spotifyPlayer.pause();
  //     }
  //   };

  //   // Remove any existing listeners to avoid duplicates
  //   this.spotifyPlayer.removeListener("player_state_changed", callbackFn);

  //   // Register a listener to the spotify player to stop playback when the provided trackId is reached
  //   this.spotifyPlayer.addListener("player_state_changed", callbackFn);

  //   return;
  // }

  async getPlaybackState(): Promise<PlaybackState | null> {
    const state = await this.spotifyPlayer.getCurrentState();
    if (!state) {
      return null;
    }

    return {
      isPlaying: !state.paused,
      isPaused: state.paused,
      positionMs: state.position,
      durationMs: state.track_window.current_track.duration_ms,
      currentTrackId: state.track_window.current_track?.id
        ? `spotify:track:${state.track_window.current_track.id}`
        : null,
    };
  }

  teardown(): void {}
}
