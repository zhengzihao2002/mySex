/** Tiny user-agent summary: "iPhone · Safari", "Mac · Chrome", … */
export function describeDevice(ua: string | null | undefined) {
  const s = ua ?? '';
  const device = /iPhone/.test(s)
    ? 'iPhone'
    : /iPad/.test(s)
      ? 'iPad'
      : /Android/.test(s)
        ? 'Android'
        : /Macintosh|Mac OS X/.test(s)
          ? 'Mac'
          : /Windows/.test(s)
            ? 'Windows PC'
            : /Linux/.test(s)
              ? 'Linux'
              : 'Unknown device';
  const browser = /EdgiOS|Edg\//.test(s)
    ? 'Edge'
    : /CriOS|Chrome\//.test(s)
      ? 'Chrome'
      : /FxiOS|Firefox\//.test(s)
        ? 'Firefox'
        : /Safari\//.test(s) || /AppleWebKit/.test(s)
          ? 'Safari'
          : '';
  const icon = device === 'iPhone' || device === 'Android' ? '📱' : device === 'iPad' ? '📲' : '💻';
  return { icon, label: browser ? `${device} · ${browser}` : device };
}
