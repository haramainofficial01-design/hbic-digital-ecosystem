export const KAABA_COORDINATES = { latitude: 21.422487, longitude: 39.826206 } as const;
export interface Coordinates { latitude: number; longitude: number }

export function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

/** Initial great-circle bearing clockwise from true north. */
export function calculateQiblaBearing(origin: Coordinates, destination: Coordinates = KAABA_COORDINATES) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitude = radians(origin.latitude);
  const targetLatitude = radians(destination.latitude);
  const delta = radians(destination.longitude - origin.longitude);
  const y = Math.sin(delta) * Math.cos(targetLatitude);
  const x = Math.cos(latitude) * Math.sin(targetLatitude) - Math.sin(latitude) * Math.cos(targetLatitude) * Math.cos(delta);
  if (Math.abs(x) < Number.EPSILON && Math.abs(y) < Number.EPSILON) return 0;
  return normalizeDegrees(Math.atan2(y, x) * 180 / Math.PI);
}

export function qiblaRotation(bearing: number, heading: number) {
  const delta = normalizeDegrees(bearing - heading);
  return delta > 180 ? delta - 360 : delta;
}

export function isAlignedWithQibla(bearing: number, heading: number, tolerance = 4) {
  return Math.abs(qiblaRotation(bearing, heading)) <= tolerance;
}
