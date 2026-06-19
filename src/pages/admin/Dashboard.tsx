import { getCurrentUserId } from "@/utils/auth";

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
import { formatDate } from "@/utils/dateUtils";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  
  // Get admin ID from localStorage
  const adminId = getCurrentUserId();
  
  // Redirect handled by ProtectedRoute
  
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{dashboardData?.totalUsers || 0}</p>
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
                  <p className="text-2xl font-bold">{dashboardData?.totalWorkers || 0}</p>
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
                  <p className="text-2xl font-bold">{dashboardData?.totalBookings || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">${dashboardData?.totalRevenue?.toFixed(2) || '0.00'}</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/admin/users')}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5 text-primary" /> Manage Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">View, block, or delete platform users.</p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/admin/workers')}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserCog className="mr-2 h-5 w-5 text-primary" /> Manage Workers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Verify, block, or manage service providers.</p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/admin/bookings')}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CalendarDays className="mr-2 h-5 w-5 text-primary" /> All Bookings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">View the platform's booking history and statuses.</p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/admin/reports')}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertCircle className="mr-2 h-5 w-5 text-primary" /> Reports & Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">View revenue trends, service analytics, and support tickets.</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
        
      </div>
    </Layout>
  );
}
