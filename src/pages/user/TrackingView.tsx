import React, { useState, useEffect } from 'react';
import { Layout } from "@/components/Layout";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBookingDetails, getTravelEstimate, getBookingTimeline } from "@/utils/api";
import apolloClient from "@/lib/apolloClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Navigation, Phone, ArrowLeft, Clock, Timer, CheckCircle2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import { toast } from "sonner";
import { gql } from '@apollo/client';
import { getStatusColor, getStatusLabel, formatDateTime } from "@/utils/dateUtils";

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
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  const { data: booking, isLoading: isLoadingBooking } = useQuery({
    queryKey: ['bookingDetails', id],
    queryFn: async () => {
      if (!id) throw new Error("No booking ID");
      const response = await getBookingDetails(parseInt(id));
      return response.data;
    },
    enabled: !!id,
    refetchInterval: 10000 // Poll booking for status updates
  });

  const { data: timelineData } = useQuery({
    queryKey: ['bookingTimeline', id],
    queryFn: async () => {
      if (!id) throw new Error("No booking ID");
      const response = await getBookingTimeline(parseInt(id));
      return response.data;
    },
    enabled: !!id,
    refetchInterval: 15000
  });

  // Service timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (booking?.status === 'service_started' && booking?.service_started_at) {
      const tick = () => {
        const start = new Date(booking.service_started_at);
        setElapsedMinutes(Math.floor((Date.now() - start.getTime()) / 60000));
      };
      tick();
      interval = setInterval(tick, 10000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [booking?.status, booking?.service_started_at]);

  // Poll worker location every 15 seconds
  useEffect(() => {
    if (!booking || !booking.worker_id) return;

    const fetchLocation = async () => {
      if (['accepted', 'travelling', 'arrived', 'service_started'].includes(booking.status)) {
        try {
          const { data } = await apolloClient.query({
            query: GET_WORKER_LOCATION,
          variables: { workerId: booking.worker_id },
          fetchPolicy: 'network-only'
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
        if (booking && booking.worker_name && ['accepted', 'travelling', 'arrived', 'waiting_for_schedule'].includes(booking.status)) {
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

  const destPos = (booking as any).booking_latitude ? 
    new L.LatLng((booking as any).booking_latitude, (booking as any).booking_longitude) : 
    null;

  const showWorkerMarker = ['accepted', 'travelling', 'arrived', 'waiting_for_schedule', 'service_started'].includes(booking.status);
  const workerPos = (showWorkerMarker && workerLocation) ? new L.LatLng(workerLocation.lat, workerLocation.lng) : null;
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
                <CardTitle className="flex items-center justify-between">
                  Live Tracking
                  <Badge className={getStatusColor(booking.status)}>
                    {getStatusLabel(booking.status)}
                  </Badge>
                </CardTitle>
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

                {/* Status-specific info panel */}
                {booking.status === 'travelling' && travelEstimate && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="font-medium text-blue-900 flex items-center mb-2">
                      <Navigation className="w-4 h-4 mr-2" /> Worker is on the way
                    </h4>
                    <div className="flex justify-between text-sm text-blue-800">
                      <span>Distance: {travelEstimate.distanceKm.toFixed(1)} km</span>
                      <span>ETA: {travelEstimate.durationMin.toFixed(0)} min</span>
                    </div>
                  </div>
                )}

                {(booking.status === 'arrived' || booking.status === 'waiting_for_schedule') && (
                  <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-100">
                    <h4 className="font-medium text-cyan-900 flex items-center mb-1">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Worker Has Arrived
                    </h4>
                    <p className="text-sm text-cyan-700">
                      {booking.user_confirmed_arrival 
                        ? 'Arrival confirmed! Waiting for service to start.' 
                        : 'Please go to your booking to confirm their arrival.'}
                    </p>
                  </div>
                )}

                {booking.status === 'service_started' && booking.service_started_at && (
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                    <h4 className="font-medium text-orange-900 flex items-center mb-2">
                      <Timer className="w-4 h-4 mr-2" /> Service In Progress
                    </h4>
                    <div className="flex justify-between text-sm text-orange-800">
                      <span>Elapsed: {Math.floor(elapsedMinutes / 60)}h {elapsedMinutes % 60}m</span>
                      <span>Booked: {booking.duration_hours}h</span>
                    </div>
                    <div className="mt-2 bg-orange-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-orange-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (elapsedMinutes / (booking.duration_hours * 60)) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

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
                        <p className="font-medium text-sm flex items-center gap-2">
                          {event.title}
                          {event.delay && (
                            <Badge variant="outline" className={`text-[10px] py-0 h-4 border-none ${event.delay.includes('early') ? 'bg-cyan-100 text-cyan-800' : event.delay.includes('late') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                              {event.delay}
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(event.timestamp)}
                        </p>
                        {event.notes && (
                          <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-1.5 rounded">{event.notes}</p>
                        )}
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
