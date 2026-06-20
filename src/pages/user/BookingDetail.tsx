import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBookingDetails, cancelBooking } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Calendar, Clock, MapPin, Phone, User, FileText } from "lucide-react";
import { formatBookingDateTime, getStatusColor, getStatusLabel } from "@/utils/dateUtils";
import { toast } from "sonner";
import { ReviewDialog } from "@/components/ReviewDialog";

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const bookingId = parseInt(id || "0");
  const [isCancelling, setIsCancelling] = useState(false);

  const { data: booking, isLoading, isError, refetch } = useQuery({
    queryKey: ['bookingDetails', bookingId],
    queryFn: async () => {
      const response = await getBookingDetails(bookingId);
      return response.data;
    },
    enabled: !!bookingId,
    refetchOnWindowFocus: true,
  });

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
          
          <div className="flex gap-2">
            {(booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'accepted') && (
              <Button 
                variant="destructive" 
                onClick={handleCancel}
                disabled={isCancelling}
              >
                {isCancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cancel Booking
              </Button>
            )}
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

                {booking.notes && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Additional Notes</p>
                    <p className="bg-muted/50 p-3 rounded-md text-sm">{booking.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {(booking.status === 'confirmed' || booking.status === 'accepted' || booking.status === 'completed') && (
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
                  <span>${parseFloat(booking.total_price).toFixed(2)}</span>
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
