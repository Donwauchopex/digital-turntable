import { useCallback, useState } from "react";
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

  const toggleTurntablePower = () => {
    setIsTurntableOn((prevPowerState) => {
      const newPowerState = !prevPowerState;
      return newPowerState;
    });
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
