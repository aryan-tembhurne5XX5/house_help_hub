import React, { useState, useEffect } from 'react';
import { Layout } from "@/components/Layout";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBookingDetails, getTravelEstimate, getBookingTimeline } from "@/utils/api";
import apolloClient from "@/lib/apolloClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Navigation, Phone, ArrowLeft, Clock } from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import { toast } from "sonner";
import { gql } from '@apollo/client';

const workerIcon = new L.DivIcon({
  html: `<div style="background-color: #2563eb; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg></div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const homeIcon = new L.DivIcon({
  html: `<div style="background-color: #ef4444; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

// We need an endpoint to get the live worker location. We added `workerLocation(workerId: Int!)` in schema
const GET_WORKER_LOCATION = gql`
  query GetWorkerLocation($workerId: Int!) {
    workerLocation(workerId: $workerId) {
      latitude
      longitude
      last_updated
    }
  }
`;

export default function TrackingView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workerLocation, setWorkerLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [travelEstimate, setTravelEstimate] = useState<{ distanceKm: number, durationMin: number, etaTimestamp: string, routeCoordinates?: [number, number][] } | null>(null);

  const { data: booking, isLoading: isLoadingBooking } = useQuery({
    queryKey: ['bookingDetails', id],
    queryFn: async () => {
      if (!id) throw new Error("No booking ID");
      const response = await getBookingDetails(parseInt(id));
      return response.data;
    },
    enabled: !!id
  });

  const { data: timelineData } = useQuery({
    queryKey: ['bookingTimeline', id],
    queryFn: async () => {
      if (!id) throw new Error("No booking ID");
      const response = await getBookingTimeline(parseInt(id));
      return response.data;
    },
    enabled: !!id,
    refetchInterval: 15000 // Poll timeline
  });

  // Poll worker location every 15 seconds
  useEffect(() => {
    if (!booking || !booking.worker_id) return;

    const fetchLocation = async () => {
      // Poll for location if worker is assigned and active
      if (['accepted', 'travelling', 'arrived', 'in_progress'].includes(booking.status)) {
        try {
          const { data } = await apolloClient.query({
            query: GET_WORKER_LOCATION,
          variables: { workerId: booking.worker_id },
          fetchPolicy: 'network-only' // ensure fresh data
        });
        
        if (data && (data as any).workerLocation) {
          setWorkerLocation({
            lat: (data as any).workerLocation.latitude,
            lng: (data as any).workerLocation.longitude
          });
        }
        } catch (err) {
          console.error("Failed to fetch worker location", err);
        }
      }
      
      try {
        if (booking && booking.worker_name && ['accepted', 'travelling', 'arrived'].includes(booking.status)) {
          const etaResponse = await getTravelEstimate(booking.worker_id, parseInt(id as string));
          if (etaResponse.data) {
            setTravelEstimate(etaResponse.data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch travel estimate", err);
      }
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 15000);
    return () => clearInterval(interval);
  }, [booking]);

  if (isLoadingBooking) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!booking) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold">Booking not found</h2>
          <Button className="mt-4" onClick={() => navigate('/user/dashboard')}>Go Back</Button>
        </div>
      </Layout>
    );
  }

  // We need the booking location. Right now booking doesn't have latitude/longitude in the schema.
  // Wait, did we add latitude/longitude to bookings? 
  // Phase 1 doesn't explicitly add lat/lng to bookings table, only to users and workers.
  // But we have `address` in bookings.
  // Let's assume booking has `latitude` and `longitude` fields or we fallback to user location.

  const destPos = (booking as any).booking_latitude ? 
    new L.LatLng((booking as any).booking_latitude, (booking as any).booking_longitude) : 
    (booking.user && (booking.user as any).latitude ? new L.LatLng((booking.user as any).latitude, (booking.user as any).longitude) : null);

  // Only show live worker marker when accepted, travelling, arrived, or in_progress
  const showWorkerMarker = ['accepted', 'travelling', 'arrived', 'in_progress'].includes(booking.status);
  const workerPos = (showWorkerMarker && workerLocation) ? new L.LatLng(workerLocation.lat, workerLocation.lng) : null;

  // Center on worker if available, else destination, else default India.
  const center = workerPos || destPos || new L.LatLng(20.5937, 78.9629);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Booking
        </Button>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Tracking</CardTitle>
                <CardDescription>
                  Track your worker in real-time
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 border-b pb-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Navigation className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{booking.worker_name || 'Worker'}</h3>
                    <p className="text-sm text-muted-foreground">{booking.service_name || 'Service'}</p>
                    <div className="flex items-center text-gray-500 text-sm mt-1">
                      <Phone className="h-3 w-3 mr-1" />
                      {booking.worker_phone || 'No phone provided'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center text-sm">
                    <div className="w-8 flex justify-center"><MapPin className="h-4 w-4 text-primary" /></div>
                    <span>{booking.address}</span>
                  </div>
                </div>

                {booking.worker_phone && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`tel:${booking.worker_phone}`}>
                      <Phone className="h-4 w-4 mr-2" /> Call Worker
                    </a>
                  </Button>
                )}
                
                {travelEstimate && (
                  <div className="bg-blue-50 p-4 rounded-lg mt-4 border border-blue-100">
                    <h4 className="font-medium text-blue-900 flex items-center mb-2"><Clock className="w-4 h-4 mr-2"/> Travel Estimate</h4>
                    <div className="flex justify-between text-sm text-blue-800">
                      <span>Distance: {travelEstimate.distanceKm.toFixed(2)} km</span>
                      <span>ETA: {travelEstimate.durationMin.toFixed(0)} min</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {timelineData?.events?.map((event: any, index: number) => (
                    <div key={event.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${index === timelineData.events.length - 1 ? 'bg-primary' : 'bg-muted-foreground'}`} />
                        {index !== timelineData.events.length - 1 && <div className="w-0.5 h-full bg-border my-1" />}
                      </div>
                      <div className="pb-4">
                        <p className="font-medium text-sm">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{new Date(parseInt(event.timestamp) || event.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <div className="h-[500px] w-full rounded-lg overflow-hidden border shadow-sm">
              <MapContainer 
                center={center} 
                zoom={14} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                                {booking.status === 'accepted' && (
                    <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center z-[400] text-center p-4">
                      <div className="bg-white p-4 rounded-xl shadow-lg max-w-sm">
                        <h3 className="font-semibold text-lg mb-2">Waiting for worker</h3>
                        <p className="text-gray-600 text-sm">Your worker has been assigned. They will start travelling soon.</p>
                      </div>
                    </div>
                  )}
                  {destPos && (
                    <Marker position={destPos} icon={homeIcon}>
                      <Popup>Your Location</Popup>
                    </Marker>
                  )}
                  {workerPos && (
                    <Marker position={workerPos} icon={workerIcon}>
                      <Popup>Worker Location</Popup>
                    </Marker>
                  )}

                  {travelEstimate?.routeCoordinates && travelEstimate.routeCoordinates.length > 0 ? (
                    <Polyline positions={travelEstimate.routeCoordinates} color="#2563eb" weight={5} opacity={0.8} />
                  ) : destPos && workerPos ? (
                    <Polyline positions={[workerPos, destPos]} color="#94a3b8" dashArray="5, 10" weight={3} opacity={0.8} />
                  ) : null}
                </MapContainer>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
