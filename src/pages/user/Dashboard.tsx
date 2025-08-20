
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { getUserBookings } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Calendar, Clock, User } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Booking {
  booking_id: number;
  service_name: string;
  booking_date: string;
  booking_time: string;
  worker_name: string | null;
  worker_phone: string | null;
  status: string;
  total_price: number;
}

export default function UserDashboard() {
  // Mock user ID (in a real app, this would come from auth)
  const userId = 1;
  
  // Fetch user's bookings
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['userBookings', userId],
    queryFn: async () => {
      const response = await getUserBookings(userId);
      return response.data as Booking[];
    }
  });

  const upcomingBookings = bookings?.filter(
    booking => booking.status === "confirmed" || booking.status === "pending"
  ) || [];
  
  const pastBookings = bookings?.filter(
    booking => booking.status === "completed" || booking.status === "rejected"
  ) || [];
  
  const formatDateTime = (dateStr: string, timeStr: string) => {
    try {
      // Format date: 2023-04-22 -> April 22, 2023
      const date = format(parseISO(dateStr), "MMMM d, yyyy");
      
      // Format time: 14:00:00 -> 2:00 PM
      const timeParts = timeStr.split(':');
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      const formattedMinutes = minutes.toString().padStart(2, '0');
      const time = `${formattedHours}:${formattedMinutes} ${ampm}`;
      
      return `${date}, ${time}`;
    } catch (error) {
      return `${dateStr}, ${timeStr}`;
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage your service bookings</p>
          </div>
          
          <Link to="/user/book" className="mt-4 sm:mt-0">
            <Button>
              Book New Service
            </Button>
          </Link>
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
              <CardTitle>Upcoming Services</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{upcomingBookings.length}</p>
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
        
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="upcoming">Upcoming Services</TabsTrigger>
            <TabsTrigger value="past">Past Services</TabsTrigger>
          </TabsList>
          
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
                              {formatDateTime(booking.booking_date, booking.booking_time)}
                            </div>
                          </CardDescription>
                        </div>
                        <Badge
                          variant={booking.status === "confirmed" ? "secondary" : "outline"}
                        >
                          {booking.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      {booking.status === "confirmed" ? (
                        <div className="space-y-4">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium mb-2">Worker Information</h4>
                            <div className="space-y-1">
                              <p><span className="font-medium">Name:</span> {booking.worker_name}</p>
                              <p><span className="font-medium">Phone:</span> {booking.worker_phone}</p>
                            </div>
                          </div>
                          
                          <div>
                            <p className="font-medium">Price: ${parseFloat(booking.total_price.toString()).toFixed(2)}</p>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              Contact Worker
                            </Button>
                            <Button variant="secondary" size="sm">
                              Reschedule
                            </Button>
                            <Button variant="outline" size="sm" className="text-destructive">
                              Cancel
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
                            <p className="font-medium">Price: ${parseFloat(booking.total_price.toString()).toFixed(2)}</p>
                          </div>
                          
                          <Button variant="outline" size="sm" className="text-destructive">
                            Cancel Request
                          </Button>
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
                              {formatDateTime(booking.booking_date, booking.booking_time)}
                            </div>
                          </CardDescription>
                        </div>
                        <Badge
                          variant={booking.status === "completed" ? "secondary" : "destructive"}
                        >
                          {booking.status}
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
                            <p className="font-medium">Price: ${parseFloat(booking.total_price.toString()).toFixed(2)}</p>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              Book Again
                            </Button>
                            <Button variant="secondary" size="sm">
                              Leave Review
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-gray-600">
                            This service request was rejected. 
                            You can try booking with a different time or service.
                          </p>
                          
                          <Button variant="outline" size="sm">
                            Book Again
                          </Button>
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
