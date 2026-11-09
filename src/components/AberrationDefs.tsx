import { CA_FILTER_ID } from "../lib/aberration";

// The SVG filter of the headline's cinematic chromatic aberration; lib/aberration drives it.
export function AberrationDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute", width: 0, height: 0 }}>
      <filter id={CA_FILTER_ID} x="-20%" y="-60%" width="140%" height="220%" colorInterpolationFilters="sRGB">
        {/* channels: R runs ahead along the jerk, B behind, G nearly in place */}
        <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
        <feOffset data-ca="r-off" in="r" dx="0" dy="0" result="rOff" />
        <feGaussianBlur data-ca="r-blur" in="rOff" stdDeviation="0 0" result="rB" />

        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
        <feOffset data-ca="g-off" in="g" dx="0" dy="0" result="gOff" />
        <feGaussianBlur data-ca="g-blur" in="gOff" stdDeviation="0 0" result="gB" />

        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
        <feOffset data-ca="b-off" in="b" dx="0" dy="0" result="bOff" />
        <feGaussianBlur data-ca="b-blur" in="bOff" stdDeviation="0 0" result="bB" />

        <feBlend in="rB" in2="gB" mode="screen" result="rg" />
        <feBlend in="rg" in2="bB" mode="screen" result="rgb" />

        {/* trail: a smeared copy behind the motion */}
        <feOffset data-ca="trail-off" in="rgb" dx="0" dy="0" result="trailOff" />
        <feGaussianBlur data-ca="trail-blur" in="trailOff" stdDeviation="0 0" result="trailB" />
        <feComponentTransfer in="trailB" result="trail">
          <feFuncA data-ca="trail-a" type="linear" slope="0" />
        </feComponentTransfer>

        {/* soft glow (bloom) */}
        <feGaussianBlur data-ca="glow" in="rgb" stdDeviation="0" result="glow" />
        <feComponentTransfer in="glow" result="glowDim">
          <feFuncA data-ca="glow-a" type="linear" slope="0" />
        </feComponentTransfer>

        <feMerge>
          <feMergeNode in="trail" />
          <feMergeNode in="glowDim" />
          <feMergeNode in="rgb" />
        </feMerge>
      </filter>
    </svg>
  );
}
