export const joinUrl = (...segments: string[]): string => {
  return segments
    .filter(Boolean)
    .map(segment => segment.replace(/^\/+|\/+$/g, ''))
    .join('/');
};
