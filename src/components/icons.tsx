const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const CheckIcon = () => (
  <svg {...base} width="15" height="15" strokeWidth="3.4">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const PlayIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
    <path d="M8 5.5v13l11-6.5z" />
  </svg>
);

export const TrashIcon = () => (
  <svg {...base} width="16" height="16" strokeWidth="2">
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
  </svg>
);

export const SendIcon = () => (
  <svg {...base} width="20" height="20" strokeWidth="2.4">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const ChevronIcon = () => (
  <svg {...base} width="14" height="14" strokeWidth="2.4">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const PencilIcon = () => (
  <svg {...base} width="16" height="16" strokeWidth="2">
    <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
  </svg>
);

export const FlagIcon = () => (
  <svg {...base} width="22" height="22" strokeWidth="2">
    <path d="M6 21V4M6 5h11l-2.5 3.5L17 12H6" />
  </svg>
);

export const GripIcon = () => (
  <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" aria-hidden="true">
    <circle cx="4" cy="4" r="1.5" />
    <circle cx="10" cy="4" r="1.5" />
    <circle cx="4" cy="9" r="1.5" />
    <circle cx="10" cy="9" r="1.5" />
    <circle cx="4" cy="14" r="1.5" />
    <circle cx="10" cy="14" r="1.5" />
  </svg>
);
