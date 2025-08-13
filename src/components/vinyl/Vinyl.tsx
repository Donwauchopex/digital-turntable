import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { VinylDisk } from "../../lib/vinyldata";
import { VinylFace } from "./VinylFace";

export interface VinylAnimationRef {
  animateDiskChange: () => Promise<void>;
  animateOut: () => Promise<void>;
  animateIn: () => Promise<void>;
}

export interface VinylProps {
  handleDiskFlip: () => boolean;
  coverArtUrl?: string;
  isSpinning: boolean;
  currentDisk?: VinylDisk;
  shouldStartOffscreen?: boolean;
}

export const Vinyl = forwardRef<VinylAnimationRef, VinylProps>(
  (
    {
      handleDiskFlip,
      coverArtUrl,
      isSpinning,
      currentDisk,
      shouldStartOffscreen,
    },
    ref,
  ) => {
    // Local refs for the spinning element and the GSAP animation
    const diskRef = useRef<HTMLDivElement | null>(null);
    const spinTween = useRef<gsap.core.Tween | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const { contextSafe } = useGSAP({ scope: diskRef });
    const [displayDisk, setDisplayDisk] = useState<VinylDisk | undefined>(
      currentDisk,
    );

    // Simple effect to update displayDisk when currentDisk changes
    useEffect(() => {
      setDisplayDisk(currentDisk);

      // Reset visual flip to side A when disk changes
      if (diskRef.current) {
        gsap.set(diskRef.current, { rotationY: 0 });
      }
    }, [currentDisk]);

    // Expose animation methods to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        animateDiskChange: async () => {
          return new Promise<void>((resolve) => {
            if (!containerRef.current) {
              resolve();
              return;
            }

            const tl = gsap.timeline();

            // Animate out
            tl.to(containerRef.current, {
              y: "-100vh",
              opacity: 0,
              duration: 0.6,
              ease: "power2.in",
            });

            // Animate in
            tl.fromTo(
              containerRef.current,
              {
                y: "100vh",
                opacity: 0,
              },
              {
                y: "0%",
                opacity: 1,
                duration: 0.6,
                ease: "power2.out",
                onComplete: () => resolve(),
              },
            );
          });
        },

        animateOut: async () => {
          return new Promise<void>((resolve) => {
            if (!containerRef.current) {
              resolve();
              return;
            }
            gsap.to(containerRef.current, {
              y: "-100vh",
              opacity: 0,
              duration: 0.6,
              ease: "power2.in",
              onComplete: () => resolve(),
            });
          });
        },

        animateIn: async () => {
          return new Promise<void>((resolve) => {
            if (!containerRef.current) {
              resolve();
              return;
            }
            gsap.fromTo(
              containerRef.current,
              {
                y: "100vh",
                opacity: 0,
              },
              {
                y: "0%",
                opacity: 1,
                duration: 0.6,
                ease: "power2.out",
                onComplete: () => resolve(),
              },
            );
          });
        },
      }),
      [],
    );

    // 1. Set up the continuous rotation animation ONCE when the component mounts.
    // It will be created but won't move until its timeScale is changed.
    useGSAP(() => {
      if (!diskRef.current) return;
      spinTween.current = gsap.to(diskRef.current, {
        rotation: 360,
        duration: 1.818, // 33 1/3 RPM
        repeat: -1,
        ease: "none",
      });
      // Set the initial speed based on the starting prop value
      gsap.set(spinTween.current, { timeScale: isSpinning ? 1 : 0 });
    }, []);

    // 2. Animate the 'timeScale' property to create the inertia effect.
    // This runs whenever the isSpinning prop changes.
    useEffect(() => {
      if (spinTween.current) {
        gsap.to(spinTween.current, {
          timeScale: isSpinning ? 1 : 0,
          duration: 1, // How long the speed-up/slow-down takes
          ease: "power2.inOut",
        });
      }
    }, [isSpinning]);

    const animateFlip = contextSafe(() => {
      if (!diskRef.current) return;

      // Check if flip is allowed before starting animation
      if (!handleDiskFlip()) return;

      // Get current rotation and add 180 degrees for the flip
      const currentRot =
        (gsap.getProperty(diskRef.current, "rotationY") as number) || 0;
      const targetRotationY = currentRot + 180;

      gsap.to(diskRef.current, {
        rotationY: targetRotationY,
        duration: 0.7,
        ease: "power2.inOut",
      });
    });

    return (
      <>
        <div
          ref={containerRef}
          className="absolute z-20 h-[88vmin] w-[88vmin]"
          style={{
            perspective: "1000px",
            transform: shouldStartOffscreen
              ? "translateY(100vh)"
              : "translateY(0px)",
            opacity: shouldStartOffscreen ? 0 : 1,
          }}
        >
          {/* Fixed vinyl sheen effect - stays in position while disk rotates */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none z-30"
            style={{
              background: `conic-gradient(transparent 20deg,
                                         rgba(255, 255, 255, .1) 40deg,
                                         rgba(255, 255, 255, .1) 50deg,
                                         transparent 60deg,
                                         transparent 200deg,
                                         rgba(255, 255, 255, .08) 220deg,
                                         rgba(255, 255, 255, .08) 240deg,
                                         transparent 250deg,
                                         transparent 340deg)`,
            }}
          ></div>
          <div
            ref={diskRef}
            onClick={animateFlip}
            className="absolute transform-3d inset-0 w-full h-full hover:cursor-pointer"
          >
            {/* A-side (front) */}
            <div
              className="backface-hidden absolute inset-0 w-full h-full"
              style={{
                transform: "translateZ(1px)",
                zIndex: 2,
              }}
            >
              <VinylFace
                side="a"
                disk={
                  displayDisk?.diskId
                    ? parseInt(displayDisk.diskId.split("-").pop() || "1")
                    : 1
                }
                coverArtUrl={coverArtUrl}
              />
            </div>

            {/* B-side (back) */}
            <div
              className="rotate-y-180 backface-hidden absolute inset-0 w-full h-full"
              style={{
                transform: "rotateY(180deg) translateZ(1px)",
                zIndex: 1,
              }}
            >
              <VinylFace
                side="b"
                disk={
                  displayDisk?.diskId
                    ? parseInt(displayDisk.diskId.split("-").pop() || "1")
                    : 1
                }
                coverArtUrl={coverArtUrl}
              />
            </div>
          </div>
        </div>
      </>
    );
  },
);
