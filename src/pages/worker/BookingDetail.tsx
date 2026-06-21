import { useEffect, useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBookingDetails, acceptBooking, rejectBooking, startTravel, markArrived, startService, requestCompletion, updateLocation, getTravelEstimate } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Calendar, Clock, MapPin, User, FileText, Check, X, Phone, Navigation, Play, Flag, Timer, AlertCircle } from "lucide-react";
import { formatBookingDateTime, getStatusColor, getStatusLabel, LIFECYCLE_STATUSES, getLifecycleIndex, safeParse } from "@/utils/dateUtils";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix leaflet icon issue
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const homeIcon = new L.DivIcon({
  html: `<div style="background-color: #ef4444; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

const workerIcon = new L.DivIcon({
  html: `<div style="background-color: #2563eb; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg></div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

// Haversine distance in meters
const haversineDistanceM = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function WorkerBookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const bookingId = parseInt(id || "0");
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [workerLocation, setWorkerLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [distanceToCustomer, setDistanceToCustomer] = useState<number | null>(null);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  const { data: booking, isLoading, isError, refetch } = useQuery({
    queryKey: ['bookingDetails', bookingId],
    queryFn: async () => {
      const response = await getBookingDetails(bookingId);
      return response.data;
    },
    enabled: !!bookingId,
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // Poll every 10s for status changes (e.g., user confirms arrival)
  });

  const { data: travelEstimateData } = useQuery({
    queryKey: ['travelEstimate', booking?.worker_id, booking?.booking_id],
    queryFn: async () => {
      const response = await getTravelEstimate(booking.worker_id, booking.booking_id);
      return response.data;
    },
    enabled: !!booking && ['accepted', 'travelling', 'arrived', 'service_started'].includes(booking.status),
    refetchInterval: booking?.status === 'travelling' ? 15000 : false,
  });

  // ─── Compute arrival eligibility ─────────────────────────────────────────
  const canMarkArrived = useMemo(() => {
    if (!workerLocation || !booking?.booking_latitude || !booking?.booking_longitude) return false;
    const dist = haversineDistanceM(workerLocation.lat, workerLocation.lng, booking.booking_latitude, booking.booking_longitude);
    return dist <= 100;
  }, [workerLocation, booking?.booking_latitude, booking?.booking_longitude]);

  // ─── Compute minimum duration eligibility ────────────────────────────────
  const canRequestCompletion = useMemo(() => {
    if (!booking?.service_started_at || !booking?.duration_hours) return false;
    const startTime = new Date(booking.service_started_at);
    const requiredMs = booking.duration_hours * 60 * 60 * 1000;
    return (Date.now() - startTime.getTime()) >= requiredMs;
  }, [booking?.service_started_at, booking?.duration_hours, elapsedMinutes]);

  const remainingMinutes = useMemo(() => {
    if (!booking?.service_started_at || !booking?.duration_hours) return 0;
    const startTime = new Date(booking.service_started_at);
    const requiredMs = booking.duration_hours * 60 * 60 * 1000;
    const remainingMs = requiredMs - (Date.now() - startTime.getTime());
    return Math.max(0, Math.ceil(remainingMs / 60000));
  }, [booking?.service_started_at, booking?.duration_hours, elapsedMinutes]);

  // ─── Compute scheduled start eligibility ────────────────────────────────
  const [minutesUntilScheduled, setMinutesUntilScheduled] = useState<number>(0);
  const canStartService = useMemo(() => {
    if (!booking?.scheduled_start_datetime) return true;
    const scheduledTime = safeParse(booking.scheduled_start_datetime);
    if (!scheduledTime) return true;
    const diff = scheduledTime.getTime() - Date.now();
    
    // Instead of using setState in useMemo (which causes issues), we can just compute it directly
    return diff <= 0;
  }, [booking?.scheduled_start_datetime, elapsedMinutes]);

  // Compute the display minutes using a separate useMemo that doesn't set state
  const displayMinutesUntilScheduled = useMemo(() => {
    if (!booking?.scheduled_start_datetime) return 0;
    const scheduledTime = safeParse(booking.scheduled_start_datetime);
    if (!scheduledTime) return 0;
    const diff = scheduledTime.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 60000));
  }, [booking?.scheduled_start_datetime, elapsedMinutes]);

  // ─── Action handler ───────────────────────────────────────────────────────
  const handleAction = async (action: string) => {
    setProcessingAction(action);
    try {
      if (action === 'accept') {
        await acceptBooking(bookingId);
        toast.success("Booking accepted successfully!");
      } else if (action === 'reject') {
        if (!window.confirm("Are you sure you want to decline this request?")) {
          setProcessingAction(null);
          return;
        }
        await rejectBooking(bookingId);
        toast.info("Booking declined.");
      } else if (action === 'startTravel') {
        await startTravel(bookingId);
        toast.success("Started travel to customer!");
      } else if (action === 'markArrived') {
        if (!workerLocation) {
          toast.error("Cannot determine your location. Please enable GPS.");
          setProcessingAction(null);
          return;
        }
        await markArrived(bookingId, workerLocation.lat, workerLocation.lng);
        toast.success("Marked as arrived!");
      } else if (action === 'startService') {
        await startService(bookingId);
        toast.success("Service started!");
      } else if (action === 'requestCompletion') {
        await requestCompletion(bookingId);
        toast.success("Completion requested. Waiting for customer confirmation.");
      }
      refetch();
    } catch (error: any) {
      console.error(`Error performing ${action}:`, error);
      toast.error(error?.response?.data?.message || error?.message || `Failed to ${action}.`);
    } finally {
      setProcessingAction(null);
    }
  };

  // ─── Periodic location tracking when travelling or arrived ────────────────
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (booking && ['travelling', 'arrived'].includes(booking.status)) {
      const sendLocation = () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
              const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setWorkerLocation(loc);
              await updateLocation(pos.coords.latitude, pos.coords.longitude);

              // Calculate distance to customer
              if (booking.booking_latitude && booking.booking_longitude) {
                const dist = haversineDistanceM(loc.lat, loc.lng, booking.booking_latitude, booking.booking_longitude);
                setDistanceToCustomer(dist);
              }
            } catch (err) {
              console.error("Failed to update location", err);
            }
          }, (err) => {
            console.error("Geolocation error:", err);
          }, { enableHighAccuracy: true });
        }
      };

      sendLocation();
      interval = setInterval(sendLocation, 30000); // Every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [booking?.status, booking?.booking_latitude, booking?.booking_longitude]);

  // ─── Timer for service duration ───────────────────────────────────────────
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (booking?.status === 'service_started' && booking?.service_started_at) {
      const tick = () => {
        const startTime = new Date(booking.service_started_at);
        const elapsed = (Date.now() - startTime.getTime()) / 60000;
        setElapsedMinutes(Math.floor(elapsed));
      };
      tick();
      interval = setInterval(tick, 10000); // Update every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [booking?.status, booking?.service_started_at]);

  // ─── Lifecycle progress stepper ───────────────────────────────────────────
  const currentLifecycleIndex = booking ? getLifecycleIndex(booking.status) : -1;
  const lifecycleLabels = ['Pending', 'Accepted', 'Travelling', 'Arrived', 'Service', 'Completion', 'Done'];

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-12 flex justify-center items-center min-h-[50vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading job details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (isError || !booking) {
    return (
      <Layout>
        <div className="container py-12 max-w-2xl">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 -ml-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Card className="border-red-200">
            <CardContent className="py-10 text-center">
              <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
              <p className="text-muted-foreground mb-6">We couldn't find the details for this job request.</p>
              <Link to="/worker/dashboard">
                <Button>Return to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate('/worker/dashboard')} className="mb-6 -ml-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        {/* ─── Lifecycle Progress Stepper ─────────────────────────────────── */}
        {currentLifecycleIndex >= 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {lifecycleLabels.map((label, i) => {
                const isCompleted = i < currentLifecycleIndex;
                const isCurrent = i === currentLifecycleIndex;
                return (
                  <div key={label} className="flex flex-col items-center flex-1">
                    <div className="flex items-center w-full">
                      {i > 0 && (
                        <div className={`h-0.5 flex-1 ${isCompleted || isCurrent ? 'bg-primary' : 'bg-muted'}`} />
                      )}
                      <div className={`
                        w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                        ${isCompleted ? 'bg-primary text-white' : isCurrent ? 'bg-primary/20 text-primary ring-2 ring-primary' : 'bg-muted text-muted-foreground'}
                      `}>
                        {isCompleted ? '✓' : i + 1}
                      </div>
                      {i < lifecycleLabels.length - 1 && (
                        <div className={`h-0.5 flex-1 ${isCompleted ? 'bg-primary' : 'bg-muted'}`} />
                      )}
                    </div>
                    <span className={`text-[10px] mt-1 ${isCurrent ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              Job Request #{booking.ticket_number || booking.booking_id}
              <Badge className={getStatusColor(booking.status)}>
                {getStatusLabel(booking.status)}
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1">
              Requested on {formatBookingDateTime(booking.created_at, null)}
            </p>
          </div>

          {/* ─── Dynamic Action Buttons ──────────────────────────────────── */}
          <div className="flex gap-2 flex-wrap">
            {booking.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleAction('reject')}
                  disabled={!!processingAction}
                >
                  {processingAction === 'reject' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                  Decline
                </Button>
                <Button
                  onClick={() => handleAction('accept')}
                  disabled={!!processingAction}
                >
                  {processingAction === 'accept' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                  Accept Job
                </Button>
              </>
            )}

            {(booking.status === 'confirmed' || booking.status === 'accepted') && (
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleAction('startTravel')}
                disabled={!!processingAction}
              >
                {processingAction === 'startTravel' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Navigation className="h-4 w-4 mr-2" />}
                Start Travel
              </Button>
            )}

            {booking.status === 'travelling' && (
              <div className="flex flex-col gap-2 items-end">
                <Button
                  className={canMarkArrived
                    ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }
                  onClick={() => handleAction('markArrived')}
                  disabled={!!processingAction || !canMarkArrived}
                >
                  {processingAction === 'markArrived'
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <MapPin className="h-4 w-4 mr-2" />
                  }
                  {canMarkArrived ? 'Mark Arrived' : 'Arrived'}
                </Button>
                {distanceToCustomer !== null && (
                  <span className={`text-xs ${canMarkArrived ? 'text-green-600' : 'text-red-500'}`}>
                    {distanceToCustomer < 1000
                      ? `${Math.round(distanceToCustomer)}m away`
                      : `${(distanceToCustomer / 1000).toFixed(1)} km away`
                    }
                    {!canMarkArrived && ' (must be within 100m)'}
                  </span>
                )}
              </div>
            )}

            {(booking.status === 'arrived' || booking.status === 'waiting_for_schedule') && (
              <div className="flex flex-col gap-2 items-end">
                <Button
                  className={booking.user_confirmed_arrival && canStartService
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }
                  onClick={() => handleAction('startService')}
                  disabled={!!processingAction || (!booking.user_confirmed_arrival && !canStartService)} // Allow click if only user_confirmed is false, so backend can throw the 10 min error, or just disable if not scheduled yet
                >
                  {processingAction === 'startService'
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <Play className="h-4 w-4 mr-2" />
                  }
                  {canStartService ? 'Start Service' : `Wait ${displayMinutesUntilScheduled} mins`}
                </Button>
                {!booking.user_confirmed_arrival && canStartService && (
                  <span className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Waiting for customer to confirm your arrival
                  </span>
                )}
                {!canStartService && (
                  <span className="text-xs text-amber-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    You arrived early. Waiting for scheduled time.
                  </span>
                )}
              </div>
            )}

            {booking.status === 'service_started' && (
              <div className="flex flex-col gap-2 items-end">
                <Button
                  className={canRequestCompletion
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }
                  onClick={() => handleAction('requestCompletion')}
                  disabled={!!processingAction || !canRequestCompletion}
                >
                  {processingAction === 'requestCompletion'
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <Flag className="h-4 w-4 mr-2" />
                  }
                  Request Completion
                </Button>
                <span className={`text-xs ${canRequestCompletion ? 'text-green-600' : 'text-amber-600'} flex items-center gap-1`}>
                  <Timer className="h-3 w-3" />
                  {canRequestCompletion
                    ? 'Duration completed! You can now request completion.'
                    : `${elapsedMinutes} min / ${booking.duration_hours * 60} min required (${remainingMinutes} min remaining)`
                  }
                </span>
              </div>
            )}

            {booking.status === 'completion_requested' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-sm text-purple-800 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                Waiting for customer to confirm completion...
              </div>
            )}

            {booking.status === 'under_review' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                Under admin review. A support ticket has been created.
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4 pb-6 border-b">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{booking.service_name}</h3>
                    <p className="text-muted-foreground">Requested Service</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                      <Calendar className="h-4 w-4" /> Date & Time
                    </p>
                    <p className="font-medium text-lg">{formatBookingDateTime(booking.booking_date, booking.booking_time)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                      <Clock className="h-4 w-4" /> Duration
                    </p>
                    <p className="font-medium text-lg">{booking.duration_hours} hour{booking.duration_hours > 1 ? 's' : ''}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                      <MapPin className="h-4 w-4" /> Location Area
                    </p>
                    <p className="font-medium bg-muted p-3 rounded-md mt-1">{booking.booking_location_text || booking.address.split(',').slice(-2).join(',')}</p>
                    {['accepted', 'travelling', 'arrived', 'service_started'].includes(booking.status) && booking.booking_latitude && booking.booking_longitude && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                          Exact Customer Location
                        </p>
                        <div className="h-[200px] rounded-md overflow-hidden border">
                          <MapContainer
                            center={[booking.booking_latitude, booking.booking_longitude]}
                            zoom={15}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={false}
                          >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Marker position={[booking.booking_latitude, booking.booking_longitude]} icon={homeIcon}>
                              <Popup>Customer Location</Popup>
                            </Marker>
                            {workerLocation && (
                              <Marker position={[workerLocation.lat, workerLocation.lng]} icon={workerIcon}>
                                <Popup>Your Location</Popup>
                              </Marker>
                            )}
                            {travelEstimateData?.routeCoordinates && (
                              <Polyline positions={travelEstimateData.routeCoordinates} color="#2563eb" weight={5} opacity={0.8} />
                            )}
                          </MapContainer>
                        </div>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${booking.booking_latitude},${booking.booking_longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block"
                        >
                          <Button variant="outline" size="sm" className="w-full">
                            <Navigation className="h-4 w-4 mr-2" />
                            Open in Maps
                          </Button>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {booking.notes && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Customer Notes</p>
                    <p className="bg-yellow-50 text-yellow-900 border border-yellow-200 p-3 rounded-md text-sm">{booking.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ─── Service Timer Card (when service is running) ───────────── */}
            {booking.status === 'service_started' && booking.service_started_at && (
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-800">
                    <Timer className="h-5 w-5" />
                    Service In Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Elapsed</p>
                      <p className="text-2xl font-bold text-orange-800">
                        {Math.floor(elapsedMinutes / 60)}h {elapsedMinutes % 60}m
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Booked Duration</p>
                      <p className="text-2xl font-bold">{booking.duration_hours}h</p>
                    </div>
                  </div>
                  <div className="mt-4 bg-orange-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-orange-500 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, (elapsedMinutes / (booking.duration_hours * 60)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-center mt-2 text-muted-foreground">
                    {canRequestCompletion
                      ? '✅ Minimum duration reached — you can request completion'
                      : `${remainingMinutes} minutes remaining before completion can be requested`
                    }
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Customer Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{booking.user_name || "Customer"}</h3>
                    {(booking.status === 'confirmed' || booking.status === 'accepted') && booking.user_phone && (
                      <a href={`tel:${booking.user_phone}`} className="text-primary hover:underline flex items-center gap-1 mt-1">
                        <Phone className="h-4 w-4" /> {booking.user_phone}
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Earnings Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Your Hourly Rate</span>
                  <span>₹{(parseFloat(booking.total_price) / booking.duration_hours).toFixed(2)}/hr</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span>{booking.duration_hours} hrs</span>
                </div>
                <div className="pt-4 border-t flex justify-between font-semibold text-lg text-green-700">
                  <span>Total Earnings</span>
                  <span>₹{parseFloat(booking.total_price).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* ─── Travel Info Card ──────────────────────────────────────── */}
            {travelEstimateData && ['travelling', 'accepted'].includes(booking.status) && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="text-blue-800 flex items-center gap-2">
                    <Navigation className="h-5 w-5" />
                    Travel Estimate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Distance</span>
                    <span className="font-medium">{travelEstimateData.distanceKm.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ETA</span>
                    <span className="font-medium">{travelEstimateData.durationMin.toFixed(0)} min</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
