import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBookingDetails, cancelBooking, confirmArrival, confirmCompletion, reportIssue } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Calendar, Clock, MapPin, Phone, User, FileText, CheckCircle2, AlertTriangle, Flag, Timer, Navigation } from "lucide-react";
import { formatBookingDateTime, getStatusColor, getStatusLabel, LIFECYCLE_STATUSES, getLifecycleIndex } from "@/utils/dateUtils";
import { toast } from "sonner";
import { ReviewDialog } from "@/components/ReviewDialog";

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const bookingId = parseInt(id || "0");
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConfirmingArrival, setIsConfirmingArrival] = useState(false);
  const [isConfirmingCompletion, setIsConfirmingCompletion] = useState(false);
  const [isReportingIssue, setIsReportingIssue] = useState(false);
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [issueReason, setIssueReason] = useState("");
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  const { data: booking, isLoading, isError, refetch } = useQuery({
    queryKey: ['bookingDetails', bookingId],
    queryFn: async () => {
      const response = await getBookingDetails(bookingId);
      return response.data;
    },
    enabled: !!bookingId,
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // Poll every 10s for status changes
  });

  // ─── Service timer ────────────────────────────────────────────────────────
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

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    
    setIsCancelling(true);
    try {
      await cancelBooking(bookingId);
      toast.success("Booking cancelled successfully");
      refetch();
    } catch (error: any) {
      console.error("Error cancelling booking:", error);
      toast.error(error?.response?.data?.message || "Failed to cancel booking.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmArrival = async () => {
    setIsConfirmingArrival(true);
    try {
      await confirmArrival(bookingId);
      toast.success("Worker arrival confirmed! Service can now begin.");
      refetch();
    } catch (error: any) {
      console.error("Error confirming arrival:", error);
      toast.error(error?.response?.data?.message || "Failed to confirm arrival.");
    } finally {
      setIsConfirmingArrival(false);
    }
  };

  const handleConfirmCompletion = async () => {
    setIsConfirmingCompletion(true);
    try {
      await confirmCompletion(bookingId);
      toast.success("Service completed! You can now leave a review.");
      refetch();
    } catch (error: any) {
      console.error("Error confirming completion:", error);
      toast.error(error?.response?.data?.message || "Failed to confirm completion.");
    } finally {
      setIsConfirmingCompletion(false);
    }
  };

  const handleReportIssue = async () => {
    if (!issueReason.trim()) {
      toast.error("Please describe the issue.");
      return;
    }
    setIsReportingIssue(true);
    try {
      await reportIssue(bookingId, issueReason);
      toast.info("Issue reported. An admin will review your case.");
      setShowIssueDialog(false);
      setIssueReason("");
      refetch();
    } catch (error: any) {
      console.error("Error reporting issue:", error);
      toast.error(error?.response?.data?.message || "Failed to report issue.");
    } finally {
      setIsReportingIssue(false);
    }
  };

  // ─── Lifecycle progress stepper ───────────────────────────────────────────
  const currentLifecycleIndex = booking ? getLifecycleIndex(booking.status) : -1;
  const lifecycleLabels = ['Booked', 'Accepted', 'Travelling', 'Arrived', 'Service', 'Completion', 'Done'];

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-12 flex justify-center items-center min-h-[50vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading booking details...</p>
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
              <h2 className="text-xl font-semibold mb-2">Booking Not Found</h2>
              <p className="text-muted-foreground mb-6">We couldn't find the details for this booking.</p>
              <Link to="/user/dashboard">
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
        <Button variant="ghost" onClick={() => navigate('/user/dashboard')} className="mb-6 -ml-4">
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
              Booking #{booking.ticket_number || booking.booking_id}
              <Badge className={getStatusColor(booking.status)}>
                {getStatusLabel(booking.status)}
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1">
              Booked on {formatBookingDateTime(booking.created_at, null)}
            </p>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {/* Cancel button for cancellable statuses */}
            {['pending', 'confirmed', 'accepted'].includes(booking.status) && (
              <Button 
                variant="destructive" 
                onClick={handleCancel}
                disabled={isCancelling}
              >
                {isCancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cancel Booking
              </Button>
            )}

            {/* Review button for completed bookings */}
            {booking.status === 'completed' && (
              <ReviewDialog 
                bookingId={booking.booking_id}
                workerName={booking.worker_name}
                serviceName={booking.service_name}
                onSuccess={() => refetch()}
              >
                <Button>Leave Review</Button>
              </ReviewDialog>
            )}
          </div>
        </div>

        {/* ─── Status-Specific Action Cards ──────────────────────────────── */}

        {/* Worker Arrived → Confirm Arrival */}
        {(booking.status === 'arrived' || booking.status === 'waiting_for_schedule') && !booking.user_confirmed_arrival && (
          <Card className="mb-6 border-cyan-300 bg-cyan-50/50">
            <CardContent className="py-6">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-cyan-100 p-4 rounded-full">
                  <CheckCircle2 className="h-8 w-8 text-cyan-700" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-lg font-semibold text-cyan-900">Worker Has Arrived!</h3>
                  <p className="text-cyan-700 text-sm mt-1">
                    {booking.worker_name} has arrived at your location. Please confirm their arrival so the service can begin.
                  </p>
                  {booking.early_arrival_minutes > 0 && (
                    <p className="text-cyan-800 text-xs mt-2 font-medium">Worker is {booking.early_arrival_minutes} mins early. Service will start at the scheduled time.</p>
                  )}
                </div>
                <Button
                  onClick={handleConfirmArrival}
                  disabled={isConfirmingArrival}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white shrink-0"
                  size="lg"
                >
                  {isConfirmingArrival ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Confirm Worker Arrival
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Arrival confirmed, waiting for worker to start service */}
        {(booking.status === 'arrived' || booking.status === 'waiting_for_schedule') && booking.user_confirmed_arrival && (
          <Card className="mb-6 border-green-300 bg-green-50/50">
            <CardContent className="py-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-green-900">Arrival Confirmed</h3>
              <p className="text-green-700 text-sm mt-1">
                You confirmed {booking.worker_name}'s arrival. Waiting for the worker to start the service...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Service in progress → Show timer */}
        {booking.status === 'service_started' && booking.service_started_at && (
          <Card className="mb-6 border-orange-200 bg-orange-50/50">
            <CardContent className="py-6">
              <div className="flex items-center gap-3 mb-4">
                <Timer className="h-6 w-6 text-orange-700" />
                <h3 className="text-lg font-semibold text-orange-900">Service In Progress</h3>
              </div>
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
            </CardContent>
          </Card>
        )}

        {/* Completion Requested → Confirm or Report */}
        {booking.status === 'completion_requested' && (
          <Card className="mb-6 border-purple-300 bg-purple-50/50">
            <CardContent className="py-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="bg-purple-100 p-4 rounded-full">
                  <Flag className="h-8 w-8 text-purple-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-purple-900">Worker Marked Service as Finished</h3>
                  <p className="text-purple-700 text-sm mt-1">
                    {booking.worker_name} has marked the service as completed. Are you satisfied with the service?
                  </p>
                </div>
                <div className="flex gap-3 flex-wrap justify-center">
                  <Button
                    onClick={handleConfirmCompletion}
                    disabled={isConfirmingCompletion}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    {isConfirmingCompletion ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Confirm Completion
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => setShowIssueDialog(true)}
                    size="lg"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Report Issue
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Under Review */}
        {booking.status === 'under_review' && (
          <Card className="mb-6 border-amber-300 bg-amber-50/50">
            <CardContent className="py-6 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-amber-900">Under Admin Review</h3>
              <p className="text-amber-700 text-sm mt-1">
                Your issue report has been submitted. An admin will review your case and get back to you.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ─── Issue Report Dialog ───────────────────────────────────────── */}
        {showIssueDialog && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Report an Issue</CardTitle>
                <CardDescription>Please describe what went wrong with the service.</CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full p-3 border rounded-md resize-none h-32 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Describe the issue in detail..."
                  value={issueReason}
                  onChange={(e) => setIssueReason(e.target.value)}
                />
              </CardContent>
              <CardFooter className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setShowIssueDialog(false); setIssueReason(""); }}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleReportIssue} 
                  disabled={isReportingIssue || !issueReason.trim()}
                  variant="destructive"
                >
                  {isReportingIssue ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                  Submit Report
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* ─── Main Content ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4 pb-6 border-b">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{booking.service_name}</h3>
                    <p className="text-muted-foreground">Professional {booking.service_name.toLowerCase()} service</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                      <Calendar className="h-4 w-4" /> Date & Time
                    </p>
                    <p className="font-medium">{formatBookingDateTime(booking.booking_date, booking.booking_time)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                      <Clock className="h-4 w-4" /> Duration
                    </p>
                    <p className="font-medium">{booking.duration_hours} hour{booking.duration_hours > 1 ? 's' : ''}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                      <MapPin className="h-4 w-4" /> Location
                    </p>
                    <p className="font-medium">{booking.address}</p>
                  </div>
                </div>

                {/* ─── Metrics Section ─── */}
                {['completed', 'completion_requested', 'service_started', 'arrived', 'waiting_for_schedule'].includes(booking.status) && (
                  <div className="pt-4 border-t grid grid-cols-2 gap-4">
                    {booking.scheduled_start_datetime && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Scheduled Start</p>
                        <p className="text-sm font-medium">{formatBookingDateTime(booking.scheduled_start_datetime, null)}</p>
                      </div>
                    )}
                    {booking.arrival_delay_minutes !== null && booking.arrival_delay_minutes !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Arrival Delay</p>
                        <p className={`text-sm font-medium ${booking.arrival_delay_minutes > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {booking.arrival_delay_minutes > 0 ? `+${booking.arrival_delay_minutes} min late` : 'On time'}
                        </p>
                      </div>
                    )}
                    {booking.service_duration_minutes !== null && booking.service_duration_minutes !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Actual Duration</p>
                        <p className="text-sm font-medium">{Math.floor(booking.service_duration_minutes / 60)}h {booking.service_duration_minutes % 60}m</p>
                      </div>
                    )}
                  </div>
                )}

                {booking.notes && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Additional Notes</p>
                    <p className="bg-muted/50 p-3 rounded-md text-sm">{booking.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Worker details shown once accepted */}
            {['accepted', 'confirmed', 'travelling', 'arrived', 'service_started', 'completion_requested', 'completed'].includes(booking.status) && (
              <Card>
                <CardHeader>
                  <CardTitle>Worker Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                      {booking.worker_profile_pic ? (
                        <img src={booking.worker_profile_pic} alt={booking.worker_name} className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{booking.worker_name}</h3>
                      {booking.worker_phone && (
                        <a href={`tel:${booking.worker_phone}`} className="text-primary hover:underline flex items-center gap-1 mt-1">
                          <Phone className="h-4 w-4" /> {booking.worker_phone}
                        </a>
                      )}
                    </div>
                  </div>
                  {/* Show tracking during active states */}
                  {['accepted', 'travelling', 'arrived', 'service_started'].includes(booking.status) && (
                    <Button onClick={() => navigate(`/user/booking/${booking.booking_id}/track`)} className="mt-6 w-full" variant="outline">
                      <Navigation className="h-4 w-4 mr-2" /> Track Live Location
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Price</span>
                  <span>₹{(parseFloat(booking.total_price) / booking.duration_hours).toFixed(2)}/hr</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span>{booking.duration_hours} hrs</span>
                </div>
                <div className="pt-4 border-t flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>₹{parseFloat(booking.total_price).toFixed(2)}</span>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/50 text-xs text-center text-muted-foreground p-4">
                Payment is processed securely after service completion.
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
