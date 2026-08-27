import * as Location from 'expo-location';

export type CourierPosition = {
  latitude: number;
  longitude: number;
};

// Reads the delivery device's current position. Returns null rather than throwing when permission
// is declined or the platform has no location provider, so a courier can still share an ETA.
export async function requestCurrentPosition(): Promise<CourierPosition | null> {
  try {
    const existing = await Location.getForegroundPermissionsAsync();
    let status = existing.status;

    if (status !== Location.PermissionStatus.GRANTED) {
      status = (await Location.requestForegroundPermissionsAsync()).status;
    }

    if (status !== Location.PermissionStatus.GRANTED) {
      return null;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return null;
  }
}
