import { ImageResponse } from 'next/og';

/** The app icon, drawn at any size: a glowing heart on a deep plum gradient. */
export function renderIcon(size: number) {
  const heart = Math.round(size * 0.56);
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 30% 20%, #ff3d7f 0%, #9b2c6f 45%, #1a0f18 100%)',
        }}
      >
        <svg width={heart} height={heart} viewBox="0 0 24 24">
          <path
            fill="#fff"
            d="M12 21s-7.5-4.6-10-9.2C.4 8.6 2.3 4.5 6.2 4.5c2.2 0 3.8 1.3 4.6 2.6.2.3.6.3.8 0 .8-1.3 2.4-2.6 4.6-2.6 3.9 0 5.8 4.1 4.2 7.3C19.5 16.4 12 21 12 21z"
          />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
