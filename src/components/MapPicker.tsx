import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button } from './ui/button';
import { useGeolocation } from '../hooks/useGeolocation';
import { Loader2, MapPin } from 'lucide-react';
import { reverseGeocode } from '../utils/location';

// Fix for default Leaflet marker icon in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapPickerProps {
  onLocationSelect: (loc: { latitude: number, longitude: number, address: string | null }) => void;
  defaultLocation?: { latitude: number, longitude: number };
}

function LocationMarker({ position, setPosition, onLocationChange }: any) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export function MapPicker({ onLocationSelect, defaultLocation }: MapPickerProps) {
  const [position, setPosition] = useState<L.LatLng | null>(
    defaultLocation ? new L.LatLng(defaultLocation.latitude, defaultLocation.longitude) : null
  );
  const [address, setAddress] = useState<string | null>(null);
  const { getLocation, loading } = useGeolocation();
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Default center (e.g., India center)
  const defaultCenter = { lat: 20.5937, lng: 78.9629 };

  const handleLocationChange = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    const addressStr = await reverseGeocode(lat, lng);
    setAddress(addressStr);
    setIsGeocoding(false);
    onLocationSelect({ latitude: lat, longitude: lng, address: addressStr });
  };

  const locateMe = async () => {
    const res = await getLocation();
    if (res && res.coordinates) {
      const newPos = new L.LatLng(res.coordinates.latitude, res.coordinates.longitude);
      setPosition(newPos);
      setAddress(res.locationText);
      onLocationSelect({
        latitude: res.coordinates.latitude,
        longitude: res.coordinates.longitude,
        address: res.locationText
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-muted-foreground">
          {address ? `Selected: ${address}` : 'Click on the map to set your location'}
        </span>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={locateMe} 
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MapPin className="h-4 w-4 mr-2" />}
          Locate Me
        </Button>
      </div>

      <div className="h-[300px] w-full rounded-md overflow-hidden border">
        <MapContainer 
          center={position || defaultCenter} 
          zoom={position ? 15 : 5} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker 
            position={position} 
            setPosition={setPosition} 
            onLocationChange={handleLocationChange} 
          />
        </MapContainer>
      </div>
      {isGeocoding && <p className="text-xs text-muted-foreground animate-pulse">Finding address...</p>}
    </div>
  );
}
