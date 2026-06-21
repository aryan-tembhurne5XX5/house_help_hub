import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Activity, DollarSign, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLocationAnalytics } from "@/utils/api";
import { Loader2 } from "lucide-react";
import { MapContainer, TileLayer, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

export default function LocationAnalytics() {
  const navigate = useNavigate();

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['locationAnalytics'],
    queryFn: async () => {
      const response = await getLocationAnalytics();
      return response.data;
    }
  });

  // Default center of India
  const center = new L.LatLng(20.5937, 78.9629);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 -ml-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Location Analytics</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Areas Overview</CardTitle>
                  <CardDescription>Metrics grouped by city or region</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {analyticsData?.length > 0 ? (
                      analyticsData.map((data: any) => (
                        <div key={data.area} className="border-b pb-4 last:border-0 last:pb-0">
                          <h3 className="font-semibold text-lg flex items-center mb-3">
                            <MapPin className="h-4 w-4 mr-2 text-primary" />
                            {data.area}
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Bookings</p>
                              <p className="font-medium text-lg flex items-center"><Activity className="h-4 w-4 mr-1 text-blue-500" /> {data.totalBookings}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Revenue</p>
                              <p className="font-medium text-lg flex items-center"><DollarSign className="h-4 w-4 mr-1 text-green-500" /> {data.revenue.toFixed(2)}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-sm text-muted-foreground">Active Workers</p>
                              <p className="font-medium text-lg flex items-center"><Users className="h-4 w-4 mr-1 text-orange-500" /> {data.totalWorkers}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No location data available yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card className="h-[600px] overflow-hidden flex flex-col">
                <CardHeader>
                  <CardTitle>Heatmap Visualization</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0">
                  <MapContainer 
                    center={center} 
                    zoom={5} 
                    style={{ height: '100%', width: '100%', zIndex: 0 }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {/* Note: We would need real coordinates for each 'area' to plot them accurately. 
                        Since location_text is a string, a real production system would geocode the area strings to coordinates here, 
                        or we can just show a demo marker for visual representation. */}
                  </MapContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
