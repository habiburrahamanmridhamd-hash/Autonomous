import React, { useState } from 'react';

export function NexoraLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="NEXORA logo"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="nexoraGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="55%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#C084FC" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="18" fill="#080B14" stroke="url(#nexoraGrad)" strokeWidth="2.5" />
      <path
        d="M19 46V18H26.5L39.5 36.5V18H45V46H37.5L24.5 27.5V46H19Z"
        fill="url(#nexoraGrad)"
      />
    </svg>
  );
}

export function UserAvatar({
  src,
  name,
  size = 40,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const initials = (name || 'N')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        style={{ width: size, height: size }}
        className="rounded-full object-cover shrink-0 border border-slate-200 dark:border-white/15"
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: Math.max(11, Math.floor(size * 0.36)) }}
      className="rounded-full shrink-0 flex items-center justify-center font-display font-semibold text-white bg-gradient-to-br from-[#38BDF8] to-[#8B5CF6] select-none"
      aria-label={name}
    >
      {initials}
    </div>
  );
}
