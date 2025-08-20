
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getBookingDetails } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function BookingConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  
  // Extract booking ID from URL query params or location state
  useEffect(() => {
    // Check if coming from booking form via state
    if (location.state?.bookingId) {
      setBookingId(location.state.bookingId);
      setTicketNumber(location.state.ticketNumber);
    } else {
      // Extract from URL params
      const params = new URLSearchParams(location.search);
      const id = params.get('id');
      const ticket = params.get('ticket');
      if (id) setBookingId(parseInt(id));
      if (ticket) setTicketNumber(ticket);
    }
  }, [location]);
  
  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['bookingDetails', bookingId],
    queryFn: async () => {
      if (!bookingId) throw new Error('No booking ID found');
      const response = await getBookingDetails(bookingId);
      return response.data;
    },
    enabled: !!bookingId,
  });
  
  // Format date and time for display
  const formatDateTime = (date: string, time: string) => {
    try {
      const dateObj = new Date(`${date}T${time}`);
      return format(dateObj, "MMMM d, yyyy 'at' h:mm a");
    } catch (error) {
      return `${date} at ${time}`;
    }
  };
  
  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading booking details...</p>
          </div>
        </div>
      </Layout>
    );
  }
  
  if (error || !bookingId) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-3xl mx-auto border-red-200">
            <CardHeader className="bg-red-50 border-b border-red-100">
              <CardTitle className="text-center">Booking Not Found</CardTitle>
              <CardDescription className="text-center">
                We couldn't find the booking you're looking for
              </CardDescription>
            </CardHeader>
            <CardContent className="py-6">
              <p className="text-center">The booking details could not be loaded. Please check your booking ID or try again later.</p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Link to="/user/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Card className="border-green-200 shadow-lg">
            <CardHeader className="bg-green-50 border-b border-green-100">
              <div className="flex justify-center mb-4">
                <div className="bg-green-100 rounded-full p-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-green-600"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-center text-2xl text-green-800">
                Booking Confirmed!
              </CardTitle>
              <CardDescription className="text-center text-green-700">
                Your service has been successfully booked
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-lg font-medium">Booking ID: #{booking?.ticket_number || ticketNumber}</p>
                  <p className="text-gray-500">Please save this number for your reference</p>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                  <div>
                    <h3 className="font-semibold">Service Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div>
                        <p className="text-sm text-gray-500">Service Type</p>
                        <p>{booking?.service_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Date & Time</p>
                        <p>{booking?.booking_date && booking?.booking_time ? 
                          formatDateTime(booking.booking_date, booking.booking_time) : 
                          "Not specified"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Duration</p>
                        <p>{booking?.duration_hours} {Number(booking?.duration_hours) === 1 ? 'hour' : 'hours'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Price</p>
                        <p>₹{parseFloat(booking?.total_price).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="capitalize">{booking?.status || "Pending"}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="font-semibold">Service Location</h3>
                    <p className="mt-1">{booking?.address || "Address not specified"}</p>
                  </div>
                  
                  {booking?.worker_name && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold">Worker Information</h3>
                      <div className="flex items-center mt-2">
                        <div className="bg-gray-200 w-12 h-12 rounded-full flex items-center justify-center overflow-hidden">
                          {booking.worker_profile_pic ? (
                            <img 
                              src={booking.worker_profile_pic} 
                              alt={booking.worker_name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          )}
                        </div>
                        <div className="ml-4">
                          <p className="font-medium">{booking.worker_name}</p>
                          {booking.worker_phone && (
                            <p className="text-gray-500">Phone: {booking.worker_phone}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="flex">
                    <div className="text-blue-500">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4" />
                        <path d="M12 8h.01" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-blue-800 font-medium">Important Information</p>
                      <ul className="text-blue-700 text-sm mt-1 list-disc list-inside space-y-1">
                        <li>The worker will arrive at the scheduled time.</li>
                        <li>Please ensure someone is present at the location to let the worker in.</li>
                        <li>You can cancel or reschedule your booking up to 12 hours before the appointment.</li>
                        <li>You can view and manage all your bookings from your dashboard.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col sm:flex-row gap-4">
              <Button className="w-full sm:w-auto flex-1" variant="outline">
                Cancel Booking
              </Button>
              <Link to="/user/book" className="w-full sm:w-auto flex-1">
                <Button className="w-full">
                  Book Another Service
                </Button>
              </Link>
            </CardFooter>
          </Card>
          
          <div className="text-center mt-8">
            <p className="mb-2">Have questions about your booking?</p>
            <Link to="/contact" className="text-brand-600 hover:underline">
              Contact our support team
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
