import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useGeolocation } from '../hooks/useGeolocation';
import { MapPin, Loader2 } from 'lucide-react';
import { geocode } from '../utils/location';

interface LocationPickerProps {
  onLocationSelect: (location: {
    latitude: number;
    longitude: number;
    address: string | null;
    location_text: string | null;
  }) => void;
  defaultAddress?: string;
  defaultLocationText?: string;
}

export function LocationPicker({ onLocationSelect, defaultAddress = '', defaultLocationText = '' }: LocationPickerProps) {
  const { getLocation, loading } = useGeolocation();
  const [manualAddress, setManualAddress] = useState(defaultAddress || defaultLocationText);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [useManual, setUseManual] = useState(false);

  const handleUseCurrentLocation = async () => {
    setUseManual(false);
    const result = await getLocation();
    if (result && result.coordinates) {
      onLocationSelect({
        latitude: result.coordinates.latitude,
        longitude: result.coordinates.longitude,
        address: result.locationText,
        location_text: result.locationText,
      });
      if (result.locationText) {
        setManualAddress(result.locationText);
      }
    }
  };

  const handleManualGeocode = async () => {
    if (!manualAddress.trim()) return;
    setIsGeocoding(true);
    const coords = await geocode(manualAddress);
    setIsGeocoding(false);
    if (coords) {
      onLocationSelect({
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: manualAddress,
        location_text: manualAddress,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <Label>Location</Label>
        {!useManual ? (
          <div className="flex flex-col space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleUseCurrentLocation}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              Use Current Location
            </Button>
            <div className="text-xs text-center text-muted-foreground">
              or <button type="button" onClick={() => setUseManual(true)} className="text-primary hover:underline">enter address manually</button>
            </div>
            {manualAddress && (
              <p className="text-sm text-green-600 truncate">Selected: {manualAddress}</p>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="Enter your address/city..."
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              onBlur={handleManualGeocode}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleManualGeocode}
              disabled={isGeocoding || !manualAddress.trim()}
            >
              {isGeocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Find'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
