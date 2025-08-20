
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCog,
  CalendarDays,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { getAdminDashboardData, getAllUsers, getAllWorkers, getAllBookings } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  
  // Get admin ID from localStorage
  const adminId = parseInt(localStorage.getItem('adminId') || '0');
  
  // Redirect if not logged in as admin
  useEffect(() => {
    if (!adminId || localStorage.getItem('userType') !== 'admin') {
      toast.error("Please login as an admin first");
      navigate("/auth");
    }
  }, [adminId, navigate]);
  
  // Fetch admin dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const response = await getAdminDashboardData();
      return response.data;
    },
    enabled: !!adminId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Fetch users
  const { data: users, isLoading: isUsersLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const response = await getAllUsers();
      return response.data;
    },
    enabled: tab === 'users' && !!adminId,
  });
  
  // Fetch workers
  const { data: workers, isLoading: isWorkersLoading } = useQuery({
    queryKey: ['adminWorkers'],
    queryFn: async () => {
      const response = await getAllWorkers();
      return response.data;
    },
    enabled: tab === 'workers' && !!adminId,
  });
  
  // Fetch bookings
  const { data: bookings, isLoading: isBookingsLoading } = useQuery({
    queryKey: ['adminBookings'],
    queryFn: async () => {
      const response = await getAllBookings();
      return response.data;
    },
    enabled: tab === 'bookings' && !!adminId,
  });
  
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'secondary';
      case 'completed':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button onClick={() => navigate('/admin/profile')} variant="outline">
            My Profile
          </Button>
        </div>
        
        {isDashboardLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{dashboardData?.statistics?.users || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <UserCog className="mr-2 h-4 w-4 text-muted-foreground" />
                    Total Workers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{dashboardData?.statistics?.workers || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                    Total Bookings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{dashboardData?.statistics?.bookings || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                    Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">₹{(dashboardData?.statistics?.revenue || 0).toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    Pending Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{dashboardData?.statistics?.pending || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                    Confirmed Bookings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{dashboardData?.statistics?.confirmed || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <XCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                    Completed Services
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{dashboardData?.statistics?.completed || 0}</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
        
        <Tabs defaultValue="overview" value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="workers">Workers</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {isDashboardLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : dashboardData?.recentBookings?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket #</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Worker</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardData.recentBookings.map((booking: any) => (
                        <TableRow key={booking.booking_id}>
                          <TableCell className="font-medium">{booking.ticket_number}</TableCell>
                          <TableCell>{booking.service_name}</TableCell>
                          <TableCell>{booking.user_name}</TableCell>
                          <TableCell>{booking.worker_name || "Not assigned"}</TableCell>
                          <TableCell>{formatDate(booking.booking_date)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(booking.status)}>
                              {booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">₹{parseFloat(booking.total_price).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No recent bookings found.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>All Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {isBookingsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : bookings?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ticket #</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Worker</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookings.map((booking: any) => (
                          <TableRow key={booking.booking_id}>
                            <TableCell className="font-medium">{booking.ticket_number}</TableCell>
                            <TableCell>{booking.service_name}</TableCell>
                            <TableCell>{booking.user_name}</TableCell>
                            <TableCell>{booking.worker_name || "Not assigned"}</TableCell>
                            <TableCell>{formatDate(booking.booking_date)}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(booking.status)}>
                                {booking.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">₹{parseFloat(booking.total_price).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No bookings found.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
              </CardHeader>
              <CardContent>
                {isUsersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : users?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Bookings</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user: any) => (
                        <TableRow key={user.user_id}>
                          <TableCell>{user.user_id}</TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-gray-200 mr-2 flex items-center justify-center overflow-hidden">
                                {user.profile_pic ? (
                                  <img src={user.profile_pic} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                  <User className="h-4 w-4" />
                                )}
                              </div>
                              {user.name}
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.phone || "—"}</TableCell>
                          <TableCell>{user.booking_count}</TableCell>
                          <TableCell>{formatDate(user.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No users found.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="workers">
            <Card>
              <CardHeader>
                <CardTitle>All Workers</CardTitle>
              </CardHeader>
              <CardContent>
                {isWorkersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : workers?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Bookings</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workers.map((worker: any) => (
                        <TableRow key={worker.worker_id}>
                          <TableCell>{worker.worker_id}</TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-gray-200 mr-2 flex items-center justify-center overflow-hidden">
                                {worker.profile_pic ? (
                                  <img src={worker.profile_pic} alt={worker.name} className="w-full h-full object-cover" />
                                ) : (
                                  <User className="h-4 w-4" />
                                )}
                              </div>
                              {worker.name}
                            </div>
                          </TableCell>
                          <TableCell>{worker.email}</TableCell>
                          <TableCell>{worker.phone}</TableCell>
                          <TableCell>{worker.avg_rating > 0 ? worker.avg_rating : "—"}</TableCell>
                          <TableCell>{worker.booking_count}</TableCell>
                          <TableCell>{formatDate(worker.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No workers found.</p>
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
