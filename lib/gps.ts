export type GpsCoordinates = { latitude: number; longitude: number };

/** Explicit GPS opt-in must either return a fresh browser position or report the failure. */
export function getGps(): Promise<GpsCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return reject(new Error('GPS is unavailable in this browser. Turn off precise GPS to use IP location.'));
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
          reject(new Error('Could not get a valid GPS position. Try again or turn off precise GPS to use IP location.'));
        } else resolve({ latitude, longitude });
      },
      (error) => reject(new Error(error.code === 1
        ? 'Location permission is blocked. Allow location access in your browser and device settings, or turn off precise GPS to use IP location.'
        : error.code === 3
          ? 'GPS timed out. Try again near a window or turn off precise GPS to use IP location.'
          : 'Could not get a GPS position. Check device location services, try again, or turn off precise GPS to use IP location.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}
