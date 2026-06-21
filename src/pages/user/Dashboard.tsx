import { getCurrentUserId } from "@/utils/auth";

import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { getUserBookings, cancelBooking } from "@/utils/api";
import { ReviewDialog } from "@/components/ReviewDialog";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Calendar, Clock, User, Phone, Eye, MapPin } from "lucide-react";
import { toast } from "sonner";
import { formatBookingDateTime, getStatusColor, getStatusLabel } from "@/utils/dateUtils";
import { ActiveServiceCard } from "@/components/ActiveServiceCard";

interface Booking {
  booking_id: number;
  service_name: string;
  booking_date: string;
  booking_time: string;
  worker_name: string | null;
  worker_phone: string | null;
  status: string;
  total_price: number;
  ticket_number?: string;
  duration_hours?: number;
  address?: string;
  notes?: string;
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState<number | null>(null);

  // Get user ID from localStorage
  const userId = getCurrentUserId();
  
  // Redirect handled by ProtectedRoute
  
  // Fetch user's bookings
  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ['userBookings', userId],
    queryFn: async () => {
      const response = await getUserBookings(userId);
      return response.data as Booking[];
    },
    enabled: !!userId,
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Real-time 5s polling for live sync
  });

  const handleCancel = async (bookingId: number) => {
    setIsProcessing(bookingId);
    try {
      await cancelBooking(bookingId);
      toast.success("Booking cancelled successfully");
      refetch();
    } catch (error: any) {
      console.error("Error cancelling booking:", error);
      toast.error(error?.response?.data?.message || "Failed to cancel booking. Note: You cannot cancel within 12 hours of the scheduled time.");
    } finally {
      setIsProcessing(null);
    }
  };

  const activeBookings = bookings?.filter(
    booking => ["accepted", "travelling", "arrived", "waiting_for_schedule", "service_started", "completion_requested", "under_review"].includes(booking.status)
  ) || [];

  const upcomingBookings = bookings?.filter(
    booking => ["confirmed", "pending"].includes(booking.status)
  ) || [];
  
  const pastBookings = bookings?.filter(
    booking => ["completed", "rejected", "cancelled", "expired"].includes(booking.status)
  ) || [];
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage your service bookings</p>
          </div>
          
          <div className="flex gap-2 mt-4 sm:mt-0">
            <Link to="/user/nearby-workers">
              <Button variant="outline" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Discover Nearby
              </Button>
            </Link>
            <Link to="/user/book">
              <Button>
                Book New Service
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{bookings?.length || 0}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Active Services</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{activeBookings.length}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Completed Services</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{bookings?.filter(booking => booking.status === "completed").length || 0}</p>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-6 grid w-full md:w-auto grid-cols-3">
            <TabsTrigger value="active" className="relative">
              Active
              {activeBookings.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="space-y-6">
            {isLoading ? (
              <Card>
                <CardContent className="py-10">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
                    <p className="text-gray-500">Syncing live status...</p>
                  </div>
                </CardContent>
              </Card>
            ) : activeBookings.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12">
                  <div className="text-center">
                    <p className="text-gray-500 mb-4">You have no active services at the moment.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {activeBookings.map(booking => (
                  <ActiveServiceCard key={booking.booking_id} booking={booking} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming">
            {isLoading ? (
              <Card>
                <CardContent className="py-10">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading your bookings...</p>
                  </div>
                </CardContent>
              </Card>
            ) : upcomingBookings.length === 0 ? (
              <Card>
                <CardContent className="py-10">
                  <div className="text-center">
                    <p className="text-gray-500 mb-4">You don't have any upcoming services booked.</p>
                    <Link to="/user/book">
                      <Button>Book a Service Now</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upcomingBookings.map(booking => (
                  <Card key={booking.booking_id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{booking.service_name}</CardTitle>
                          <CardDescription>
                            <div className="flex items-center mt-1">
                              <Calendar className="h-4 w-4 mr-1" />
                              {formatBookingDateTime(booking.booking_date, booking.booking_time)}
                            </div>
                            {booking.ticket_number && (
                              <div className="text-xs text-gray-500 mt-1">
                                Ticket: #{booking.ticket_number}
                              </div>
                            )}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(booking.status)}>
                          {getStatusLabel(booking.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      {["confirmed", "pending"].includes(booking.status) ? (
                        <div className="space-y-4">
                          <p className="text-gray-600">
                            Your booking is confirmed and waiting for worker assignment.
                          </p>
                          
                          <div>
                            <p className="font-medium">Price: ₹{parseFloat(booking.total_price.toString()).toFixed(2)}</p>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <Link to={`/user/booking/${booking.booking_id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-3 w-3 mr-1" /> Details
                              </Button>
                            </Link>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => handleCancel(booking.booking_id)}
                              disabled={isProcessing === booking.booking_id}
                            >
                              {isProcessing === booking.booking_id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : "Cancel"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-gray-600">
                            Your booking is waiting for worker confirmation. 
                            You'll be notified when a worker accepts your request.
                          </p>
                          
                          <div>
                            <p className="font-medium">Price: ₹{parseFloat(booking.total_price.toString()).toFixed(2)}</p>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <Link to={`/user/booking/${booking.booking_id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-3 w-3 mr-1" /> Details
                              </Button>
                            </Link>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-destructive"
                              onClick={() => handleCancel(booking.booking_id)}
                              disabled={isProcessing === booking.booking_id}
                            >
                              {isProcessing === booking.booking_id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="past">
            {isLoading ? (
              <Card>
                <CardContent className="py-10">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading your booking history...</p>
                  </div>
                </CardContent>
              </Card>
            ) : pastBookings.length === 0 ? (
              <Card>
                <CardContent className="py-10">
                  <p className="text-center text-gray-500">You don't have any past services.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pastBookings.map(booking => (
                  <Card key={booking.booking_id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{booking.service_name}</CardTitle>
                          <CardDescription>
                            <div className="flex items-center mt-1">
                              <Calendar className="h-4 w-4 mr-1" />
                              {formatBookingDateTime(booking.booking_date, booking.booking_time)}
                            </div>
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(booking.status)}>
                          {getStatusLabel(booking.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      {booking.status === "completed" ? (
                        <div className="space-y-4">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium mb-2">Worker Information</h4>
                            <div className="space-y-1">
                              <p><span className="font-medium">Name:</span> {booking.worker_name}</p>
                              <p><span className="font-medium">Phone:</span> {booking.worker_phone}</p>
                            </div>
                          </div>
                          
                          <div>
                            <p className="font-medium">Price: ₹{parseFloat(booking.total_price.toString()).toFixed(2)}</p>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <Link to="/user/book">
                              <Button variant="outline" size="sm">
                                Book Again
                              </Button>
                            </Link>
                            <Link to={`/user/booking/${booking.booking_id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-3 w-3 mr-1" /> Details
                              </Button>
                            </Link>
                            <ReviewDialog 
                              bookingId={booking.booking_id}
                              workerName={booking.worker_name}
                              serviceName={booking.service_name}
                              onSuccess={() => refetch()}
                            >
                              <Button variant="secondary" size="sm">
                                Leave Review
                              </Button>
                            </ReviewDialog>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-gray-600">
                            This service request was rejected. 
                            You can try booking with a different time or service.
                          </p>
                          
                          <div className="flex gap-2">
                            <Link to="/user/book">
                              <Button variant="outline" size="sm">
                                Book Again
                              </Button>
                            </Link>
                            <Link to={`/user/booking/${booking.booking_id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-3 w-3 mr-1" /> Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
