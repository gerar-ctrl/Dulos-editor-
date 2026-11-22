import React from 'react';

interface IconProps {
  className?: string;
}

const LEFT_BRACKET_PATH =
  'M 5.5 4.5 H 8.2 C 9.1 4.5 9.5 4.9 9.5 5.8 V 18.2 C 9.5 19.1 9.1 19.5 8.2 19.5 H 5.5';
const RIGHT_BRACKET_PATH =
  'M 18.5 4.5 H 15.8 C 14.9 4.5 14.5 4.9 14.5 5.8 V 18.2 C 14.5 19.1 14.9 19.5 15.8 19.5 H 18.5';

/** Icono ][ — Dividir clip en el cabezal */
export const SplitBracketIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d={LEFT_BRACKET_PATH} />
    <path d={RIGHT_BRACKET_PATH} />
  </svg>
);

/** Icono ¦[ — Recortar parte izquierda hasta el cabezal */
export const TrimLeftBracketIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d={LEFT_BRACKET_PATH} strokeDasharray="1.8 2.4" opacity={0.65} />
    <path d={RIGHT_BRACKET_PATH} />
  </svg>
);

/** Icono ]¦ — Recortar parte derecha desde el cabezal */
export const TrimRightBracketIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d={LEFT_BRACKET_PATH} />
    <path d={RIGHT_BRACKET_PATH} strokeDasharray="1.8 2.4" opacity={0.65} />
  </svg>
);

/** Icono PIP — Superposición de video o imagen (Picture-in-Picture) */
export const PipOverlayIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Outer frame with bottom-left opening */}
    <path d="M 4 9.5 V 6 A 2 2 0 0 1 6 4 H 18 A 2 2 0 0 1 20 6 V 17 A 2 2 0 0 1 18 19 H 14.5" />
    {/* Inner PIP window at bottom-left */}
    <rect x="4" y="12.5" width="7.5" height="6.5" rx="1.2" />
  </svg>
);
