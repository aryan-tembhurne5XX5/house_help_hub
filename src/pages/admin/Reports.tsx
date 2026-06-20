import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { getAdminDashboardData } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, TrendingUp, Users, UserCog, CalendarDays, DollarSign, IndianRupeeIcon } from "lucide-react";

export default function Reports() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const response = await getAdminDashboardData();
      return response.data;
    }
  });

  return (
    <Layout>
      <div className="container py-8 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center text-muted-foreground">
                    <IndianRupeeIcon className="mr-2 h-4 w-4" />
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">₹{stats?.totalRevenue?.toFixed(2) || '0.00'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center text-muted-foreground">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Total Bookings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats?.totalBookings || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" />
                    Total Customers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center text-muted-foreground">
                    <UserCog className="mr-2 h-4 w-4" />
                    Total Workers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats?.totalWorkers || 0}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" /> System Overview
                </CardTitle>
                <CardDescription>High level view of platform usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                  <p>Detailed charts and graphs will be populated here.</p>
                  <p className="text-sm mt-2">Connecting to analytics engine...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
