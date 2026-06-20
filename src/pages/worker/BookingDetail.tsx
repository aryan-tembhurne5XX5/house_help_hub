import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBookingDetails, acceptBooking, rejectBooking, completeBooking } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Calendar, Clock, MapPin, User, FileText, Check, X, Phone } from "lucide-react";
import { formatBookingDateTime, getStatusColor, getStatusLabel } from "@/utils/dateUtils";
import { toast } from "sonner";

export default function WorkerBookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const bookingId = parseInt(id || "0");
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const { data: booking, isLoading, isError, refetch } = useQuery({
    queryKey: ['bookingDetails', bookingId],
    queryFn: async () => {
      const response = await getBookingDetails(bookingId);
      return response.data;
    },
    enabled: !!bookingId,
    refetchOnWindowFocus: true,
  });

  const handleAction = async (action: 'accept' | 'reject' | 'complete') => {
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
      } else if (action === 'complete') {
        await completeBooking(bookingId);
        toast.success("Job marked as completed!");
      }
      refetch();
    } catch (error: any) {
      console.error(`Error performing ${action}:`, error);
      toast.error(error?.response?.data?.message || `Failed to ${action} booking.`);
    } finally {
      setProcessingAction(null);
    }
  };

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
          
          <div className="flex gap-2">
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
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleAction('complete')}
                disabled={!!processingAction}
              >
                {processingAction === 'complete' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Mark as Completed
              </Button>
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
                      <MapPin className="h-4 w-4" /> Location
                    </p>
                    <p className="font-medium bg-muted p-3 rounded-md mt-1">{booking.address}</p>
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
          </div>
        </div>
      </div>
    </Layout>
  );
}
