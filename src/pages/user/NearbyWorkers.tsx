import React, { useState, useEffect } from 'react';
import { Layout } from "@/components/Layout";
import { MapPicker } from "@/components/MapPicker";
import { getServices, getNearbyWorkers } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin, Star, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

interface Worker {
  worker_id: number;
  name: string;
  phone: string;
  profile_pic?: string;
  price_per_hour: number;
  distanceKm?: number;
  avg_rating?: number;
}

export default function NearbyWorkers() {
  const navigate = useNavigate();
  const [location, setLocation] = useState<{ latitude: number, longitude: number, address: string | null } | null>(null);
  const [selectedService, setSelectedService] = useState<string>("all");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await getServices();
      return response.data;
    }
  });

  const handleSearch = async () => {
    if (!location) return;
    setIsSearching(true);
    try {
      // In a real scenario, we would use the getAvailableWorkers without date/time to just get nearby workers
      // Or create a new endpoint `nearbyWorkers`
      // For now, since Phase 6 & 7 added location filtering to availableWorkers, we can pass a dummy date or create a generic nearby query.
      const response = await getNearbyWorkers({
        serviceId: selectedService === "all" ? undefined : parseInt(selectedService),
        latitude: location.latitude,
        longitude: location.longitude,
        radiusKm: 50
      });

      setWorkers(response.data as Worker[]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Discover Nearby Workers</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Your Location</Label>
                  <MapPicker onLocationSelect={setLocation} />
                </div>

                <div className="space-y-2">
                  <Label>Service Category</Label>
                  {isLoadingServices ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Select value={selectedService} onValueChange={setSelectedService}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Services" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Services</SelectItem>
                        {services?.map((s: any) => (
                          <SelectItem key={s.service_id} value={s.service_id.toString()}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <Button 
                  onClick={handleSearch} 
                  disabled={!location || isSearching} 
                  className="w-full mt-4"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
                  Find Nearby
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            {isSearching ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : workers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {workers.map(worker => (
                  <Card key={worker.worker_id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={worker.profile_pic} />
                          <AvatarFallback><User className="h-6 w-6" /></AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-lg">{worker.name}</h3>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Star className="h-3 w-3 mr-1 text-yellow-500 fill-current" />
                            {worker.avg_rating ? worker.avg_rating.toFixed(1) : "New"}
                          </div>
                          {worker.distanceKm != null && (
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3 mr-1" />
                              {worker.distanceKm.toFixed(1)} km away
                            </div>
                          )}
                        </div>
                      </div>
                      <Button onClick={() => navigate('/user/book')}>Book</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : location ? (
              <div className="flex flex-col items-center justify-center h-64 text-center border rounded-lg bg-muted/20">
                <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No workers found nearby</h3>
                <p className="text-muted-foreground mt-2 max-w-sm">
                  Try adjusting your location or selecting a different service category.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center border rounded-lg bg-muted/20">
                <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Set your location</h3>
                <p className="text-muted-foreground mt-2 max-w-sm">
                  Use the map to set your location and discover workers nearby.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
