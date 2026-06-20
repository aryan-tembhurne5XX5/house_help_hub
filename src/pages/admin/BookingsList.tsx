import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { getAllBookings } from "@/utils/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatBookingDateTime, getStatusColor, getStatusLabel } from "@/utils/dateUtils";

interface Booking {
  booking_id: number;
  user_name: string;
  worker_name: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  status: string;
  total_price: number;
}

export default function BookingsList() {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['allBookings'],
    queryFn: async () => {
      const response = await getAllBookings();
      return response.data as Booking[];
    }
  });

  return (
    <Layout>
      <div className="container py-8 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Manage Bookings</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>All Platform Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !bookings || bookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No bookings found on the platform.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Worker</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.booking_id}>
                        <TableCell>#{booking.booking_id}</TableCell>
                        <TableCell className="font-medium">{booking.user_name || "N/A"}</TableCell>
                        <TableCell>{booking.worker_name || "Unassigned"}</TableCell>
                        <TableCell>{booking.service_name}</TableCell>
                        <TableCell>
                          {formatBookingDateTime(booking.booking_date, booking.booking_time)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(booking.status)}>
                            {getStatusLabel(booking.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>₹{parseFloat(booking.total_price.toString()).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
