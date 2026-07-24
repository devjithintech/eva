/** The animated iridescent gradient orb (ported from the landing design). Shared
 *  by the voice cold-start and the empty workspace hero. Styling lives in
 *  global.css (`.ls-*`). */
export function Orb() {
  return (
    <svg className="ls-svg-orb" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clipS"><circle cx="100" cy="100" r="100" /></clipPath>
        <radialGradient id="g_0"><stop offset="0%" stopColor="#1f5fc0" stopOpacity="0.95" /><stop offset="72%" stopColor="#1f5fc0" stopOpacity="0" /></radialGradient>
        <radialGradient id="g_1"><stop offset="0%" stopColor="#6fb0e8" stopOpacity="0.95" /><stop offset="72%" stopColor="#6fb0e8" stopOpacity="0" /></radialGradient>
        <radialGradient id="g_2"><stop offset="0%" stopColor="#cfe8fb" stopOpacity="0.95" /><stop offset="72%" stopColor="#cfe8fb" stopOpacity="0" /></radialGradient>
        <radialGradient id="g_3"><stop offset="0%" stopColor="#eaf6ff" stopOpacity="0.95" /><stop offset="72%" stopColor="#eaf6ff" stopOpacity="0" /></radialGradient>
        <radialGradient id="g_4"><stop offset="0%" stopColor="#aed6f7" stopOpacity="0.95" /><stop offset="72%" stopColor="#aed6f7" stopOpacity="0" /></radialGradient>
        <filter id="warpS" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.009 0.013" numOctaves={2} seed={19} result="n">
            <animate attributeName="baseFrequency" dur="20s" repeatCount="indefinite" values="0.009 0.013; 0.016 0.009; 0.011 0.017; 0.009 0.013" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="n" scale={32} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="grainS">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0" />
        </filter>
        <g id="artS">
          <rect x="-24" y="-24" width="248" height="248" fill="#3f86d8" />
          <ellipse cx="40" cy="35" rx="122" ry="110" fill="url(#g_0)" />
          <ellipse cx="172" cy="60" rx="112" ry="100" fill="url(#g_1)" />
          <ellipse cx="120" cy="150" rx="132" ry="112" fill="url(#g_2)" />
          <ellipse cx="70" cy="172" rx="92" ry="70" fill="url(#g_3)" />
          <ellipse cx="176" cy="166" rx="92" ry="92" fill="url(#g_4)" />
        </g>
      </defs>
      <g clipPath="url(#clipS)">
        <g className="ls-flow">
          <use href="#artS" />
          <use href="#artS" filter="url(#warpS)" opacity="0.55" />
        </g>
        <rect width="200" height="200" filter="url(#grainS)" opacity="0.2" />
      </g>
    </svg>
  );
}
