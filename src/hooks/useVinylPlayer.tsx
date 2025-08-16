import { useCallback, useEffect, useRef, useState } from "react";
import type { VinylAnimationRef } from "../components/vinyl/Vinyl";
import { ARM_ANGLE_NO_INTERSECT } from "../constants/arm";
import type {
  MusicProvider,
  PlaybackState,
} from "../lib/musicprovider/musicprovider";
import type { VinylData, VinylDisk } from "../lib/vinyldata";
import { CalculateVinylData } from "../lib/vinyldata";

export interface VinylPlayerState {
  playbackState: PlaybackState | null;
  vinylData: VinylData | undefined;
  currentDisk: VinylDisk | undefined;
  currentSide: "a" | "b";
  shouldStartOffscreen: boolean;
  changeDisk: (newDisk?: VinylDisk) => Promise<void>;
  flipDisk: () => boolean;
  vinylRef: React.RefObject<VinylAnimationRef | null>;
}

export function useVinylPlayer({
  music,
  albumId,
  isTurntableOn,
  getArmActualAngle,
}: {
  music: MusicProvider;
  albumId: string;
  isTurntableOn: boolean;
  getArmActualAngle: () => number;
}): VinylPlayerState {
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(
    null,
  );
  const [vinylData, setVinylData] = useState<VinylData | undefined>(undefined);
  const [currentDisk, setCurrentDisk] = useState<VinylDisk | undefined>(
    undefined,
  );
  const [currentSide, setCurrentSide] = useState<"a" | "b">("a");
  const [shouldStartOffscreen, setShouldStartOffscreen] =
    useState<boolean>(false);

  const vinylRef = useRef<VinylAnimationRef>(null);
  const previousAlbumIdRef = useRef<string>("");
  const isLoadingAlbumRef = useRef<boolean>(false);
  const shouldAnimateInRef = useRef<boolean>(false);

  // Playback state polling
  useEffect(() => {
    if (!music) {
      return;
    }
    const intervalId = window.setInterval(async () => {
      const newState = await music.getPlaybackState();
      setPlaybackState(newState);
    }, 1818);

    return () => window.clearInterval(intervalId);
  }, [music]);

  // Album loading logic
  useEffect(() => {
    if (!music || !albumId) {
      setVinylData(undefined);
      setCurrentDisk(undefined);
      previousAlbumIdRef.current = "";
      return;
    }

    if (isLoadingAlbumRef.current) return; // Prevent concurrent loads

    const loadAlbumWithAnimation = async () => {
      isLoadingAlbumRef.current = true;

      try {
        // Check if this is a different album from the previous one
        const isDifferentAlbum =
          previousAlbumIdRef.current && previousAlbumIdRef.current !== albumId;

        // Animate for album switches OR first album load
        const shouldAnimate =
          isDifferentAlbum || previousAlbumIdRef.current === "";

        // If switching albums and there's a current disk, animate it out first
        if (isDifferentAlbum && vinylRef.current) {
          try {
            await vinylRef.current.animateOut();
          } catch (error) {
            console.error("Failed to animate out current disk:", error);
          }
        }

        // Clear state and load new album data
        setVinylData(undefined);
        setCurrentDisk(undefined);

        const avd = await CalculateVinylData(music, albumId);
        setVinylData(avd);

        // Set new disk from new album
        setCurrentDisk(avd.disks[0]);
        setCurrentSide("a");

        // Mark that we should animate in after the component mounts
        if (shouldAnimate) {
          shouldAnimateInRef.current = true;
          setShouldStartOffscreen(true);
        }

        // Update the previous album ID reference
        previousAlbumIdRef.current = albumId;
      } catch (error) {
        console.error("Failed to load album:", error);
      } finally {
        isLoadingAlbumRef.current = false;
      }
    };

    loadAlbumWithAnimation();
  }, [albumId, music]);

  // Handle animation in when disk/vinyl data changes
  useEffect(() => {
    if (!shouldAnimateInRef.current || !vinylRef.current) return;

    const animateIn = async () => {
      if (!vinylRef.current) return;
      try {
        shouldAnimateInRef.current = false;
        await vinylRef.current.animateIn();
        setShouldStartOffscreen(false);
      } catch (error) {
        console.error("Failed to animate in new disk:", error);
        setShouldStartOffscreen(false);
      }
    };

    // Small delay to ensure component is fully rendered
    const timeoutId = setTimeout(animateIn, 50);
    return () => clearTimeout(timeoutId);
  }, [currentDisk, vinylData]);

  const changeDisk = useCallback(
    async (newDisk?: VinylDisk) => {
      console.log("Changing disk to:", newDisk?.diskId || "none");
      if (isTurntableOn) {
        console.log("Turntable must be off to flip disk.");
        // Optionally provide user feedback (e.g., a toast notification)
        return;
      }

      if (getArmActualAngle() > ARM_ANGLE_NO_INTERSECT) {
        console.log(
          `Arm must be clear of the record (at or beyond ${ARM_ANGLE_NO_INTERSECT} deg). Currently: ${getArmActualAngle().toFixed(1)} deg.`,
        );
        return;
      }
      if (!newDisk) {
        console.log("No disk provided to change to.");
        return;
      }
      if (currentDisk?.diskId === newDisk.diskId) {
        console.log("Already on the requested disk.");
        return;
      }

      // Use ref animation for disk changes within the same album
      if (vinylRef.current && currentDisk) {
        try {
          await vinylRef.current.animateOut();
          setCurrentDisk(newDisk);
          setCurrentSide("a");
          await new Promise((resolve) => setTimeout(resolve, 50));
          await vinylRef.current.animateIn();
        } catch (error) {
          console.error("Animation failed:", error);
          setCurrentDisk(newDisk);
          setCurrentSide("a");
        }
      } else {
        setCurrentDisk(newDisk);
        setCurrentSide("a");
      }
    },
    [getArmActualAngle, isTurntableOn, currentDisk],
  );

  const flipDisk = useCallback((): boolean => {
    if (isTurntableOn) {
      console.log("Turntable must be off to flip disk.");
      // Optionally provide user feedback (e.g., a toast notification)
      return false;
    }

    if (getArmActualAngle() > ARM_ANGLE_NO_INTERSECT) {
      console.log(
        `Arm must be clear of the record (at or beyond ${ARM_ANGLE_NO_INTERSECT} deg). Currently: ${getArmActualAngle().toFixed(1)} deg.`,
      );
      return false;
    }

    if (!currentDisk || !currentSide) return false;

    if (currentSide == "a" && !currentDisk.bSide) {
      return false;
    }

    if (currentSide == "a") {
      setCurrentSide("b");
    } else {
      setCurrentSide("a");
    }

    return true;
  }, [isTurntableOn, getArmActualAngle, currentDisk, currentSide]);

  return {
    playbackState,
    vinylData,
    currentDisk,
    currentSide,
    shouldStartOffscreen,
    changeDisk,
    flipDisk,
    vinylRef,
  };
}
