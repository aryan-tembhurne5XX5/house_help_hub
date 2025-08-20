
import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { toast } from "sonner";
import { getWorkerRequests, acceptBooking, rejectBooking } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Loader2, Check, X, Calendar, Clock, User } from "lucide-react";

interface ServiceRequest {
  booking_id: number;
  user_id: number;
  user_name: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  address: string;
  status: string;
  total_price: number;
  duration_hours: number;
  notes?: string;
}

export default function WorkerDashboard() {
  // Mock worker ID (in a real app, this would come from auth)
  const workerId = 1;
  
  const [processingBookingId, setProcessingBookingId] = useState<number | null>(null);
  
  // Fetch worker's service requests
  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ['workerRequests', workerId],
    queryFn: async () => {
      const response = await getWorkerRequests(workerId);
      return response.data as ServiceRequest[];
    }
  });
  
  const activeRequests = requests?.filter(r => r.status === "pending" || r.status === "confirmed") || [];
  const pastRequests = requests?.filter(r => r.status === "completed" || r.status === "rejected") || [];
  
  const handleAccept = async (requestId: number) => {
    setProcessingBookingId(requestId);
    
    try {
      await acceptBooking(requestId, workerId);
      toast.success("Service request accepted!");
      refetch();
    } catch (error) {
      console.error("Error accepting booking:", error);
      toast.error("Failed to accept the request. Please try again.");
    } finally {
      setProcessingBookingId(null);
    }
  };
  
  const handleReject = async (requestId: number) => {
    setProcessingBookingId(requestId);
    
    try {
      await rejectBooking(requestId);
      toast.info("Service request rejected");
      refetch();
    } catch (error) {
      console.error("Error rejecting booking:", error);
      toast.error("Failed to reject the request. Please try again.");
    } finally {
      setProcessingBookingId(null);
    }
  };
  
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
  
  const getTotalEarnings = () => {
    return requests
      ?.filter(r => r.status === "completed")
      .reduce((sum, request) => sum + parseFloat(request.total_price.toString()), 0) || 0;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Worker Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage your service requests and schedule</p>
          </div>
          
          <div className="mt-4 sm:mt-0">
            <Button variant="outline" className="mr-2">
              My Profile
            </Button>
            <Button>
              Update Availability
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{activeRequests.filter(r => r.status === "pending").length}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Completed Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{requests?.filter(r => r.status === "completed").length || 0}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Total Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                ${getTotalEarnings().toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active Requests</TabsTrigger>
            <TabsTrigger value="past">Past Requests</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active">
            <Card>
              <CardHeader>
                <CardTitle>Active Service Requests</CardTitle>
                <CardDescription>Review and respond to pending service requests</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading service requests...</p>
                  </div>
                ) : activeRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No active requests at the moment.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeRequests.map((request) => (
                          <TableRow key={request.booking_id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-2" />
                                {request.user_name}
                              </div>
                            </TableCell>
                            <TableCell>{request.service_name}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                {formatDateTime(request.booking_date, request.booking_time)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2" />
                                {request.duration_hours} {request.duration_hours === 1 ? 'hour' : 'hours'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                request.status === "confirmed" ? "secondary" : 
                                request.status === "rejected" ? "destructive" : "outline"
                              }>
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell>${parseFloat(request.total_price.toString()).toFixed(2)}</TableCell>
                            <TableCell>
                              {request.status === "pending" && (
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAccept(request.booking_id)}
                                    disabled={processingBookingId === request.booking_id}
                                  >
                                    {processingBookingId === request.booking_id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Check className="h-4 w-4 mr-1" />
                                    )}
                                    Accept
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                    onClick={() => handleReject(request.booking_id)}
                                    disabled={processingBookingId === request.booking_id}
                                  >
                                    {processingBookingId === request.booking_id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <X className="h-4 w-4 mr-1" />
                                    )}
                                    Decline
                                  </Button>
                                </div>
                              )}
                              {request.status !== "pending" && (
                                <Button size="sm" variant="outline">
                                  View Details
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="past">
            <Card>
              <CardHeader>
                <CardTitle>Past Service Requests</CardTitle>
                <CardDescription>History of your completed and rejected service requests</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading service history...</p>
                  </div>
                ) : pastRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No past requests to display.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pastRequests.map((request) => (
                          <TableRow key={request.booking_id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-2" />
                                {request.user_name}
                              </div>
                            </TableCell>
                            <TableCell>{request.service_name}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                {formatDateTime(request.booking_date, request.booking_time)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                request.status === "completed" ? "secondary" : 
                                request.status === "rejected" ? "destructive" : "outline"
                              }>
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell>${parseFloat(request.total_price.toString()).toFixed(2)}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline">
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
