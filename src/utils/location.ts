export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface GeocodeResult {
  coordinates: LocationCoords | null;
  address: String | null;
}

/**
 * Reverse geocodes coordinates into a readable address using OpenStreetMap Nominatim API.
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'HouseHelpHub/1.0',
        },
      }
    );
    const data = await response.json();
    if (data && data.address) {
      const parts = [];
      if (data.address.suburb || data.address.neighbourhood || data.address.village) {
        parts.push(data.address.suburb || data.address.neighbourhood || data.address.village);
      }
      if (data.address.city || data.address.town) {
        parts.push(data.address.city || data.address.town);
      }
      if (data.address.state) {
        parts.push(data.address.state);
      }
      return parts.length > 0 ? parts.join(', ') : data.display_name;
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return null;
  }
}

/**
 * Geocodes an address string into coordinates using OpenStreetMap Nominatim API.
 */
export async function geocode(address: string): Promise<LocationCoords | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'HouseHelpHub/1.0',
        },
      }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding failed:', error);
    return null;
  }
}
