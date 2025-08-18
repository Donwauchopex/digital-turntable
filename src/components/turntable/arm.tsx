import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSound from "use-sound";
import {
  ARM_ANGLE_REST,
  ARM_END_ANGLE,
  ARM_LEAD_IN_START_ANGLE,
  ARM_START_ANGLE,
} from "../../constants/arm";
import { useMusicPlayer } from "../../hooks/useMusicPlayer";
import type { VinylSide } from "../../lib/vinyldata";
import { SingleSideMaxDurationMs } from "../../lib/vinyldata";
import dropSfx from "/needledrop.aac";
import runoutSfx from "/runout.aac";

// Register the plugin
gsap.registerPlugin(Draggable);

type TurntableArmProps = {
  // Core state
  albumId: string;
  power: boolean;
  togglePower: () => void;
  disk?: VinylSide;

  // Callbacks
  setArmAngle: React.Dispatch<React.SetStateAction<number>>;

  // Styling
  style?: React.CSSProperties;
  className?: string;
};

export function TurntableArm({
  albumId,
  power: isTurntableOn,
  togglePower,
  disk,
  setArmAngle,
  style,
  className,
}: TurntableArmProps) {
  const { music } = useMusicPlayer();
  const [isArmLifted, setIsArmLifted] = useState(false);
  const armNonBaseRef = useRef<HTMLDivElement>(null);
  const armRef = useRef<HTMLDivElement>(null);
  const draggableRef = useRef<Draggable | null>(null);
  const armAnimationRef = useRef<gsap.core.Tween | null>(null);
  const trackableRef = useRef<boolean>(false);
  const resumeRef = useRef<((positionms: number) => void) | null>(null);
  const onDropRef = useRef<((positionMs: number) => void) | null>(null);
  const onPickupRef = useRef<(() => void) | null>(null);

  const getArmRotation = useCallback(() => {
    if (!armRef.current) return ARM_ANGLE_REST;
    return gsap.getProperty(armRef.current, "rotation") as number;
  }, []);

  const [playRunout, runoutSound] = useSound(runoutSfx, {
    volume: 0.7,
    loop: true,
    onplay: () => {
      console.log("Runout sound started");
      if (armAnimationRef.current) {
        armAnimationRef.current.timeScale(25);
        console.log("Runout sound started, adjusting animation time scale");
      }
    },
    onend: () => {
      console.log("Runout sound ended");
    },
  });

  // Create refs for stable references to avoid recreating intervals
  const runoutSoundRef = useRef(runoutSound);
  const playRunoutRef = useRef(playRunout);
  const togglePowerRef = useRef(togglePower);

  const [playDrop] = useSound(dropSfx, {
    volume: 0.5,
    onplay: () => {
      console.log("Drop sound started");
    },
    onend: () => {
      console.log("Drop sound ended");
    },
  });

  // Create ref for playDrop after it's declared
  const playDropRef = useRef(playDrop);

  // Update refs when dependencies change
  useEffect(() => {
    runoutSoundRef.current = runoutSound;
    playRunoutRef.current = playRunout;
    playDropRef.current = playDrop;
    togglePowerRef.current = togglePower;
  }, [runoutSound, playRunout, playDrop, togglePower]);

  // Using the disk data we can predetermine the angle at which the runout sound should play
  const runoutAtAngle = useMemo(() => {
    if (!disk || !disk.tracks || disk.tracks.length === 0) {
      return ARM_END_ANGLE;
    }
    // Use deadwaxlengthms to determine the runout angle
    const deadwaxLengthMs = disk.deadWaxLengthMs;
    const totalDurationMs = disk.tracks.reduce(
      (acc, track) => acc + (track.endMs - track.startMs),
      0,
    );
    const runoutAngle =
      ARM_END_ANGLE -
      (deadwaxLengthMs / SingleSideMaxDurationMs) *
        (ARM_END_ANGLE - ARM_START_ANGLE);
    console.log(
      "Calculated runout angle:",
      runoutAngle,
      "for deadwax length:",
      deadwaxLengthMs,
      "and total duration:",
      totalDurationMs,
    );
    return runoutAngle;
  }, [disk]);

  // When the arm angle exceeds the runout angle, we play the runout sound
  // We need to poll the arm rotation periodically to check if it exceeds the runout angle
  useEffect(() => {
    const checkRunout = () => {
      const angle = getArmRotation();
      if (!isTurntableOn) {
        return;
      }
      if (angle >= runoutAtAngle && !runoutSoundRef.current.sound?.playing()) {
        console.log("Arm angle exceeded runout angle, playing runout sound");
        playRunoutRef.current();
      } else if (
        angle < runoutAtAngle &&
        runoutSoundRef.current.sound?.playing()
      ) {
        console.log("Arm angle below runout angle, pausing runout sound");
        runoutSoundRef.current.pause();
      }
    };

    if (isTurntableOn) {
      const intervalId = setInterval(checkRunout, 1000);
      return () => clearInterval(intervalId);
    }
  }, [runoutAtAngle, isTurntableOn, getArmRotation]);

  const handleArmPickup = useCallback(() => {
    console.log("Arm picked up");
    runoutSound.pause();
    music.pause();
  }, [music, runoutSound]);

  const getPositionFromAngle = useCallback((angle: number): number => {
    const totalAngleRange = ARM_END_ANGLE - ARM_START_ANGLE;
    const clampedRotation = Math.min(
      Math.max(angle, ARM_START_ANGLE),
      ARM_END_ANGLE,
    );
    const angleProgress = (clampedRotation - ARM_START_ANGLE) / totalAngleRange;
    return angleProgress * SingleSideMaxDurationMs;
  }, []);

  const getTrackFromPosition = useCallback(
    (
      positionMs: number,
    ): {
      trackId: string;
      localPositionMs: number;
    } | null => {
      if (!disk) {
        console.warn("No disk present, cannot get track from position.");
        return null;
      }

      // Track.startMs is relative to the album length but we care about relative to disk length.
      // So when we check we add the start of the first track in ms to positionMs

      const adjustedPositionMs = positionMs + disk.tracks[0].startMs;
      const track = disk.tracks.find(
        (track) =>
          adjustedPositionMs >= track.startMs &&
          adjustedPositionMs <= track.endMs,
      );

      if (!track) {
        return null;
      }

      const localPositionMs = adjustedPositionMs - track.startMs;
      console.log(
        "Found track for position:",
        positionMs,
        "Track ID:",
        track.id,
        "Local position in track:",
        localPositionMs,
      );

      return {
        trackId: track.id,
        localPositionMs,
      };
    },
    [disk],
  );

  const handleArmDrop = useCallback(
    (positionMs: number) => {
      console.log("Arm dropped at position:", positionMs);
      const track = getTrackFromPosition(positionMs);
      if (!track) {
        console.warn("No track found at position:", positionMs);
        return;
      }

      const trackIds = disk?.tracks.map((track) => track.id) || [];
      // Find current track position and create array from current track onwards
      const currentTrackIndex = trackIds.findIndex(
        (id) => id === track.trackId,
      );
      const remainingTrackIds =
        currentTrackIndex >= 0
          ? trackIds.slice(currentTrackIndex)
          : [track.trackId];

      music.play(
        albumId,
        remainingTrackIds,
        true,
        Math.floor(track.localPositionMs),
      );
    },
    [albumId, music, getTrackFromPosition, disk],
  );

  // Helper function to update arm angle and handle end conditions
  const updateArmAngle = useCallback(() => {
    const angle = getArmRotation();
    setArmAngle(angle);
    if (angle >= ARM_END_ANGLE) {
      // Pause the runout sound if arm is at end angle
      if (runoutSoundRef.current.sound?.playing()) {
        console.log("Pausing runout sound as arm is at end angle");
        runoutSoundRef.current.pause();
      }
      // Cut the power
      if (isTurntableOn) {
        console.log("Cutting power as arm is at end angle");
        togglePowerRef.current();
      }
    }
  }, [getArmRotation, setArmAngle, isTurntableOn]);

  const handleArmResume = useCallback(
    (positionMs: number) => {
      console.log("Arm resumed at position:", positionMs);
      const track = getTrackFromPosition(positionMs);
      if (!track) {
        return;
      }
      const trackIds = disk?.tracks.map((track) => track.id) || [];
      // Find current track position and create array from current track onwards
      const currentTrackIndex = trackIds.findIndex(
        (id) => id === track.trackId,
      );
      const remainingTrackIds =
        currentTrackIndex >= 0
          ? trackIds.slice(currentTrackIndex)
          : [track.trackId];

      music.play(
        albumId,
        remainingTrackIds,
        false,
        Math.floor(track.localPositionMs),
      );
    },
    [albumId, music, getTrackFromPosition, disk],
  );

  useEffect(() => {
    console.log("Turntable power state changed:", isTurntableOn);
    if (isTurntableOn && disk) {
      console.log("Turntable powered on with disk:", disk);
      trackableRef.current = true;
      // Check where the arm is currently
      const currentRotation = getArmRotation();
      console.log(
        "Turntable powered on with disk. Current arm angle:",
        currentRotation,
      );
      // Handle lead in
      if (
        currentRotation < ARM_START_ANGLE &&
        currentRotation >= ARM_LEAD_IN_START_ANGLE
      ) {
        console.log("Arm is in lead-in area, animating to start angle.");
        if (armAnimationRef.current) {
          armAnimationRef.current.kill();
        }
        const extraAngle = currentRotation - ARM_LEAD_IN_START_ANGLE;
        console.log("Extra angle in lead-in area:", extraAngle);
        // Use 1 degree per second for lead-in area
        const duration = (Math.abs(extraAngle) / 360) * SingleSideMaxDurationMs;
        console.log("Duration for lead-in animation:", duration);
        armAnimationRef.current = gsap.to(armRef.current, {
          rotation: ARM_START_ANGLE,
          duration: duration / 1000,
          ease: "none",
          onUpdate: updateArmAngle,
          onComplete: () => {
            armAnimationRef.current = gsap.to(armRef.current, {
              rotation: ARM_END_ANGLE,
              duration: SingleSideMaxDurationMs / 1000,
              ease: "none",
              onUpdate: updateArmAngle,
            });
            if (disk?.tracks && disk.tracks.length > 0) {
              const trackIds = disk.tracks.map((track) => track.id);
              music.play(albumId, trackIds, false, 0);
            }
          },
        });
      }

      if (
        currentRotation >= ARM_START_ANGLE &&
        currentRotation <= ARM_END_ANGLE
      ) {
        // If arm is already on the disk, animate to end
        console.log("Arm is on disk, animating to end.");
        if (armAnimationRef.current) {
          armAnimationRef.current.kill();
        }
        const positionMs = getPositionFromAngle(currentRotation);
        console.log("Current position in ms:", positionMs);
        const remainingMs = SingleSideMaxDurationMs - positionMs;
        console.log("Starting resume animation with remainingMs:", remainingMs);
        armAnimationRef.current = gsap.to(armRef.current, {
          rotation: ARM_END_ANGLE,
          duration: remainingMs / 1000,
          ease: "none",
          onUpdate: updateArmAngle,
        });
        if (disk?.tracks && disk.tracks.length > 0) {
          const positionMs = getPositionFromAngle(currentRotation);
          const track = getTrackFromPosition(positionMs);
          if (track) {
            const trackIds = disk.tracks.map((track) => track.id);
            const currentTrackIndex = trackIds.findIndex(
              (id) => id === track.trackId,
            );
            const remainingTrackIds =
              currentTrackIndex >= 0
                ? trackIds.slice(currentTrackIndex)
                : [track.trackId];
            music.play(
              albumId,
              remainingTrackIds,
              false,
              Math.floor(track.localPositionMs),
            );
          }
        }
      }
    } else {
      console.log("No power or no disk. Killing animation.");
      trackableRef.current = false;
      if (armAnimationRef.current) {
        armAnimationRef.current.kill();
      }
      // runoutSound?.stop();
    }
  }, [
    albumId,
    music,
    getTrackFromPosition,
    isTurntableOn,
    disk,
    getArmRotation,
    getPositionFromAngle,
    handleArmResume,
    playDrop,
    updateArmAngle,
  ]);

  useEffect(() => {
    onDropRef.current = handleArmDrop;
    onPickupRef.current = handleArmPickup;
    resumeRef.current = handleArmResume;
  }, [handleArmDrop, handleArmPickup, handleArmResume]);

  // Handle power down and runout sound
  useEffect(() => {
    if (!isTurntableOn && runoutSound?.sound?.playing()) {
      console.log("Stopping runout sound as turntable is off");
      runoutSound.stop();
    }
  }, [isTurntableOn, runoutSound]);

  useGSAP(() => {
    draggableRef.current = Draggable.create(armRef.current, {
      type: "rotation",
      edgeResistance: 0.65,
      trigger: armRef.current,
      bounds: {
        minRotation: ARM_ANGLE_REST,
        maxRotation: ARM_END_ANGLE + 1,
      },

      onDragStart: function () {
        setIsArmLifted(true);
        if (armAnimationRef.current) {
          armAnimationRef.current.timeScale(1);
          armAnimationRef.current.kill();
        }
        onPickupRef.current?.();
      },
      onDragEnd: function () {
        setIsArmLifted(false);
        const angle = draggableRef.current?.rotation || ARM_ANGLE_REST;
        console.log("start drop: angle", angle);
        setArmAngle(angle);

        if (!trackableRef.current) {
          console.log(
            "Turntable is off or there is no disk arm will not move.",
          );
          return;
        }

        if (angle < ARM_LEAD_IN_START_ANGLE) {
          // Arm is is not on disk, so leave it be
          console.log("Arm is not on disk, leaving it at rest position.");
          return;
        }
        if (angle < ARM_START_ANGLE && angle >= ARM_LEAD_IN_START_ANGLE) {
          const extraAngle = angle - ARM_LEAD_IN_START_ANGLE;
          console.log("Arm is in lead-in area, extra angle:", extraAngle);
          playDropRef.current(); // Play drop sound for manual lead-in drop
          // Use 1 degree per second for lead-in area
          const duration =
            (Math.abs(extraAngle) / 360) * SingleSideMaxDurationMs;
          console.log("dragEnded in lead-in area, duration:", duration);
          if (armAnimationRef.current) {
            armAnimationRef.current.kill();
          }
          // Chain the animation and then the regular playback animation
          armAnimationRef.current = gsap.to(armRef.current, {
            rotation: ARM_START_ANGLE,
            duration: duration / 1000,
            ease: "none",
            onUpdate: updateArmAngle,
            onComplete: () => {
              armAnimationRef.current = gsap.to(armRef.current, {
                rotation: ARM_END_ANGLE,
                duration: SingleSideMaxDurationMs / 1000,
                ease: "none",
                onUpdate: updateArmAngle,
              });
              resumeRef.current?.(0);
            },
          });
          return;
        }

        if (angle >= ARM_START_ANGLE) {
          const positionMs = getPositionFromAngle(angle);
          console.log("dragEnded at positionMs on vinyl side.", positionMs);
          const remainingMs = SingleSideMaxDurationMs - positionMs;
          console.log("remainingMs to animate", remainingMs);
          if (armAnimationRef.current) {
            armAnimationRef.current.kill();
          }
          armAnimationRef.current = gsap.to(armRef.current, {
            rotation: ARM_END_ANGLE,
            duration: remainingMs / 1000,
            ease: "none",
            onUpdate: updateArmAngle,
          });
          onDropRef.current?.(positionMs);
          return;
        }
      },
    })[0];

    gsap.set(armRef.current, { rotation: ARM_ANGLE_REST });
  }, [armRef]);

  // Arm lifting animation
  useEffect(() => {
    const arm = armNonBaseRef.current;
    if (!arm) return;

    gsap.to(arm, {
      z: isArmLifted ? "3vh" : "0",
      filter: isArmLifted
        ? "drop-shadow(0px 20px 15px rgba(0,0,0,0.5))"
        : "drop-shadow(0px 0px 0px rgba(0,0,0,0))",
      duration: 0.3,
      ease: "power2.out",
    });
  }, [isArmLifted]);

  useEffect(() => {
    if (!isTurntableOn) {
      music.pause();
    }
  }, [isTurntableOn, music]);

  return (
    <div
      ref={armRef}
      style={style}
      className={`absolute h-[1vh] bg-gradient-to-b from-slate-200 to-slate-400 rounded-full shadow-lg ${className || ""} cursor-grab z-30`}
    >
      <div
        ref={armNonBaseRef}
        style={{ transformOrigin: "100% 50% 0" }}
        className="absolute w-full h-full"
      >
        <div className="h-[1vh] bg-gradient-to-b from-slate-200 to-slate-400 rounded-full shadow-lg">
          <div className="absolute w-[5vh] h-[2.5vh] bg-zinc-900 left-[-1vh] top-1/2 -translate-y-1/2 rounded-sm skew-x-[-15deg] border-b-2 border-zinc-700">
            <div className="absolute w-[1vh] h-[1vh] bg-slate-400 left-[0.5vh] bottom-[0.1vh] rounded-sm" />
          </div>
        </div>
      </div>
      <div className="absolute h-[2vh] w-[4vh] bg-zinc-600 -right-[4vh] top-1/2 -translate-y-1/2 rounded-sm shadow-inner" />
      <div className="absolute h-[4vh] w-[4vh] bg-gradient-to-b from-zinc-400 to-zinc-600 -right-[7vh] top-1/2 -translate-y-1/2 rounded-full border-1 border-zinc-900 shadow-lg" />
      <div className="absolute w-[4vh] h-[4vh] bg-zinc-700 rounded-full -right-[2.5vh] top-1/2 -translate-y-1/2 shadow-inner flex items-center justify-center border-2 border-zinc-800">
        <div className="w-[1vh] h-[1vh] bg-slate-300 rounded-full" />
      </div>
    </div>
  );
}
