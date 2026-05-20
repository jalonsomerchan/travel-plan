const presetPoiIcons: Record<string, string> = {
  camera: '◎',
  food: '◆',
  pin: '●',
  star: '★',
  view: '▲',
};

export function resolveTripPoiIcon(icon: string | undefined) {
  const value = icon?.trim() ?? '';

  if (!value) {
    return presetPoiIcons.pin;
  }

  return presetPoiIcons[value] ?? value;
}
