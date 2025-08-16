# Digital Turntable

An attempt to recreate the experience of listening to a vinyl record digitally.

Thanks to [Thomas Spark's Needledrop](https://thomaspark.co/2021/03/needledrop-a-turntable-interface-for-music-playback/) for the CSS to make the disks look great.

Demo Albums:
- [2001: A Space Odyssey](https://archive.org/details/2001-ost) by Various Artists without final track.
- [Tchaikosky - The Seasons](https://www.classicals.de/tchaikovsky-seasons) by Gregor Quendel.
- [1984](https://www.humanworkshop.com/album/victoria-darian/1984-original-soundtrack/) by Victoria Darian & Alexei Kalinkin

SFX Credits:
[Vinyl Needle Lift 02.wav by Stratocube](https://freesound.org/s/456279/) -- License: Creative Commons 0
[Stylus.wav by gadzooks](https://freesound.org/s/59984/) -- License: Attribution 4.0
[Vinyl Runout Groove 06.flac by Groschi](https://freesound.org/s/423897/) -- License: Creative Commons 0
[Vinyl Player by Ultra-Edward](https://freesound.org/s/803269/) -- License: Creative Commons 0

## Setup with Spotify
In order to integrate with Spotify you will need to [setup your own Spotify App](https://developer.spotify.com/documentation/web-api/tutorials/getting-started) and get a Client ID.

While you are setting up the app add the redirect URI ```http://127.0.0.1:3000/callback``` and add your own Spotify account as a user.

Then clone this repo and create a ```.env``` file and add this env variable.

```
VITE_SPOTIFY_CLIENT_ID = "SPOTIFYIDGOESHERE"
```

From there you can use bun (or your package manager of choice) to run the vite server with ```bun run dev```.

TODO:
- [x] Use trackIds properly in both play() functions
- [x] Fix bug with drop sound on lead in
- [x] Fix typerrors
- [ ] Remove unneeded logging
- [x] Remove useTurntableAudio
- [x] Fix armAngleUpdate being laggy for UI
