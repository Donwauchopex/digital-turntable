import { useCallback, useEffect } from "react";
import useSound from "use-sound";

// Sound file paths
const startupSfx = "/startup.aac";
const runningSfx = "/running.aac";
const turnoffSfx = "/turnoff.aac";
const runoutSfx = "/runout.aac";

export interface TurntableAudioControls {
  playDrop: () => void;
  playRunout: () => void;
  runningSound: {
    sound?: {
      playing(): boolean;
    };
    stop(): void;
  };
  runoutSound: {
    sound?: {
      playing(): boolean;
    };
    stop(): void;
  };
}

export function useTurntableAudio(
  isTurntableOn: boolean,
): TurntableAudioControls {
  const [playRunning, runningSound] = useSound(runningSfx, {
    volume: 0.2,
    loop: true,
    onend: () => {
      console.log("Running sound ended");
    },
  });

  const [playStartup] = useSound(startupSfx, {
    volume: 0.3,
    onend: () => {
      playRunning(); // Start running sound after startup
    },
  });

  const [playTurnoff] = useSound(turnoffSfx, {
    volume: 0.3,
    onend: () => {
      console.log("Turnoff sound ended");
    },
  });

  const [playRunout, runoutSound] = useSound(runoutSfx, {
    volume: 0.7,
    loop: true,
    onplay: () => {
      console.log("Runout sound started");
    },
    onend: () => {
      console.log("Runout sound ended");
    },
  });

  // Handle turntable power state changes
  useEffect(() => {
    if (isTurntableOn && !runningSound.sound?.playing()) {
      playStartup(); // Play startup sound
      playRunning(); // Start running sound
    } else if (!isTurntableOn && runningSound.sound?.playing()) {
      playTurnoff(); // Play turnoff sound
      runningSound.stop(); // Stop running sound
      runoutSound.stop(); // Stop runout sound if playing
    }
  }, [
    isTurntableOn,
    playStartup,
    playRunning,
    playTurnoff,
    runningSound,
    runoutSound,
  ]);

  const handlePlayRunout = useCallback(() => {
    if (!runoutSound.sound?.playing()) {
      playRunout();
    }
  }, [playRunout, runoutSound]);

  return {
    playRunout: handlePlayRunout, // Move to musicplayer probably
    runningSound,
    runoutSound,
  };
}
