import React from 'react';

export const BLUE = '#1E6BFF';

// Minimal glowing figure: round head + rounded body. Origin = feet centre.
export const Figure: React.FC<{
  x: number;
  y: number;
  scale?: number;
  dashed?: boolean;
  label?: string;
  opacity?: number;
}> = ({x, y, scale = 1, dashed = false, label, opacity = 1}) => {
  const fill = dashed ? 'none' : '#fff';
  const stroke = dashed ? '#fff' : 'none';
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <g filter={dashed ? undefined : 'url(#glow)'}>
        <circle cx={0} cy={-205} r={48} fill={fill} stroke={stroke} strokeWidth={5} strokeDasharray="16 12" />
        <path
          d="M -85 0 L -85 -80 Q -85 -145 0 -145 Q 85 -145 85 -80 L 85 0 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={5}
          strokeDasharray="16 12"
        />
      </g>
      {label && (
        <text y={52} textAnchor="middle" fill="#fff" fontFamily="Montserrat" fontWeight={800} fontSize={30} letterSpacing={6}>
          {label}
        </text>
      )}
    </g>
  );
};

// Shared SVG filters. Put once inside each <svg>.
export const Defs: React.FC = () => (
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feMerge>
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="blur20">
      <feGaussianBlur stdDeviation="20" />
    </filter>
    <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={BLUE} stopOpacity="0.55" />
      <stop offset="1" stopColor={BLUE} stopOpacity="0.08" />
    </linearGradient>
  </defs>
);
