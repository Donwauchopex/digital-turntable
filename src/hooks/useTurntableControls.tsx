import { useCallback, useEffect, useState } from "react";
import useSound from "use-sound";
import { useMusicPlayer } from "./useMusicPlayer";

export interface TurntableControlsState {
  isTurntableOn: boolean;
  volume: number;
  toggleTurntablePower: () => void;
  handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function useTurntableControls(): TurntableControlsState {
  const { music } = useMusicPlayer();
  const [isTurntableOn, setIsTurntableOn] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);

  // Turntable motor sounds
  const [playRunning, runningSound] = useSound("/running.aac", {
    volume: 0.2,
    loop: true,
  });

  const [playStartup] = useSound("/startup.aac", {
    volume: 0.3,
    onend: () => {
      playRunning(); // Start running sound after startup
    },
  });

  const [playTurnoff] = useSound("/turnoff.aac", {
    volume: 0.3,
  });

  // Handle turntable power state changes and audio
  useEffect(() => {
    if (isTurntableOn && !runningSound.sound?.playing()) {
      playStartup(); // Play startup sound, which will trigger running sound
    } else if (!isTurntableOn && runningSound.sound?.playing()) {
      playTurnoff(); // Play turnoff sound
      runningSound.stop(); // Stop running sound
    }
  }, [isTurntableOn, playStartup, playRunning, playTurnoff, runningSound]);

  const toggleTurntablePower = () => {
    setIsTurntableOn((prevPowerState) => !prevPowerState);
  };

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
      if (music) {
        music.setVolume(newVolume);
      }
    },
    [music],
  );

  return {
    isTurntableOn,
    volume,
    toggleTurntablePower,
    handleVolumeChange,
  };
}
