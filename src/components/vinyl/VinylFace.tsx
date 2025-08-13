export interface VinylFaceProps {
  side: "a" | "b";
  disk: number;
  coverArtUrl?: string;
}

export function VinylFace({
  side,
  disk,
  coverArtUrl,
}: VinylFaceProps) {
  return (
    <div className="w-full h-full bg-[repeating-radial-gradient(#000,#141414_3px,#141414_3px)] rounded-full shadow-xl border-solid border-[2vmin] border-[#141414] relative">
      {/* Center label area */}
      <div className="absolute z-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[29vmin] h-[29vmin] rounded-full">
        {/* Label background */}
        <div
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[29vmin] h-[29vmin] border-solid border-[1vmin] border-[#141414] rounded-full ${
            side === "a" ? "bg-white" : "bg-gray-200"
          }`}
        >
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
            <defs>
              <path
                id={`circle-top-${side}`}
                d="M 7 50 A 43 43 0 0 1 93 50"
                fill="none"
                stroke="none"
              />
              <path
                id={`circle-bottom-${side}`}
                d="M 93 50 A 43 43 0 0 1 7 50"
                fill="none"
                stroke="none"
              />
              <path
                id={`circle-right-${side}`}
                d="M 50 7 A 43 43 0 0 1 50 93"
                fill="none"
                stroke="none"
              />
            </defs>
            {/* Side label */}
            <text
              className="fill-gray-900 font-mono font-bold text-[6px] tracking-wide"
            >
              <textPath
                href={`#circle-top-${side}`}
                startOffset="50%"
                textAnchor="middle"
              >
                SIDE {side.toUpperCase()}
              </textPath>
            </text>
            {/* Disc number */}
            <text
              className="fill-gray-600 font-mono font-semibold text-[6px] tracking-normal"
            >
              <textPath
                href={`#circle-bottom-${side}`}
                startOffset="50%"
                textAnchor="middle"
              >
                DISC {disk}
              </textPath>
            </text>
            {/* RPM indicator */}
            <text
              className="fill-gray-500 font-mono text-[6px] tracking-tight"
            >
              <textPath
                href={`#circle-right-${side}`}
                startOffset="50%"
                textAnchor="middle"
              >
                33⅓ RPM
              </textPath>
            </text>
          </svg>
        </div>

        {/* Center area - different for A and B sides */}
        {side === "a" ? (
          // A-side: Cover art
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[22.5vmin] h-[22.5vmin] bg-gray-100 bg-contain bg-center bg-no-repeat border-solid border-[0.5vmin] border-gray-900 rounded-full"
            style={{
              backgroundImage: coverArtUrl ? `url(${coverArtUrl})` : undefined,
            }}
          >
          </div>
        ) : (
          // B-side: Cover art (same as A-side, only label color differs)
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[22.5vmin] h-[22.5vmin] bg-gray-100 bg-contain bg-center bg-no-repeat border-solid border-[0.5vmin] border-gray-900 rounded-full"
            style={{
              backgroundImage: coverArtUrl ? `url(${coverArtUrl})` : undefined,
            }}
          >
          </div>
        )}
      </div>
    </div>
  );
}