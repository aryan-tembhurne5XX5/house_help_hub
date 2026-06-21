import { useState, useCallback } from 'react';
import { reverseGeocode, type LocationCoords } from '../utils/location';
import { useToast } from './use-toast';

interface GeolocationState {
  coordinates: LocationCoords | null;
  locationText: string | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    locationText: null,
    loading: false,
    error: null,
  });
  const { toast } = useToast();

  const getLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Geolocation is not supported by your browser' }));
      toast({
        title: "Location Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      });
      return null;
    }

    setState(s => ({ ...s, loading: true, error: null }));

    return new Promise<{ coordinates: LocationCoords, locationText: string | null } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          
          let locationText = null;
          try {
            locationText = await reverseGeocode(coords.latitude, coords.longitude);
          } catch (e) {
            console.error("Failed to reverse geocode:", e);
          }

          setState({
            coordinates: coords,
            locationText,
            loading: false,
            error: null,
          });
          
          resolve({ coordinates: coords, locationText });
        },
        (error) => {
          let errorMessage = "Unable to retrieve your location";
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = "Location permission denied. Please enter manually.";
          }
          
          setState(s => ({ ...s, loading: false, error: errorMessage }));
          toast({
            title: "Location Error",
            description: errorMessage,
            variant: "destructive",
          });
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, [toast]);

  return { ...state, getLocation };
}
