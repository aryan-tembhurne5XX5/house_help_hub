import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { registerWorkerServices, updateWorkerAvailability } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import { getServices } from "@/utils/api";
import { Loader2 } from "lucide-react";
import ServiceSelection from "./ServiceSelection";
import AvailabilitySelection from "./AvailabilitySelection";

interface Service {
  service_id: number;
  name: string;
  description: string;
  base_price: number;
}

interface ServiceOption {
  id: number;
  name: string;
  selected: boolean;
  rate: number;
}

export default function SetupServices() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get worker ID from localStorage
  const workerId = parseInt(localStorage.getItem('workerId') || '0');
  
  // Redirect if not logged in as worker
  useEffect(() => {
    if (!workerId || localStorage.getItem('userType') !== 'worker') {
      toast.error("Please login as a worker first");
      navigate("/auth");
    }
  }, [workerId, navigate]);
  
  const { data: servicesData, isLoading: isLoadingServices, error: servicesError, refetch } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      try {
        console.log('Fetching services in SetupServices component');
        const response = await getServices();
        console.log('Services response:', response.data);
        return response.data as Service[];
      } catch (error) {
        console.error('Error fetching services in component:', error);
        throw error;
      }
    },
    retry: 2,
  });
  
  const [services, setServices] = useState<ServiceOption[]>([]);
  
  useEffect(() => {
    if (servicesData) {
      console.log('Setting services from fetched data:', servicesData);
      setServices(servicesData.map(service => ({
        id: service.service_id,
        name: service.name,
        selected: false,
        rate: service.base_price
      })));
    }
  }, [servicesData]);

  const [availability, setAvailability] = useState({
    monday: { morning: false, afternoon: false, evening: false },
    tuesday: { morning: false, afternoon: false, evening: false },
    wednesday: { morning: false, afternoon: false, evening: false },
    thursday: { morning: false, afternoon: false, evening: false },
    friday: { morning: false, afternoon: false, evening: false },
    saturday: { morning: false, afternoon: false, evening: false },
    sunday: { morning: false, afternoon: false, evening: false },
  });

  const toggleService = (id: number) => {
    setServices(services.map(service => 
      service.id === id ? { ...service, selected: !service.selected } : service
    ));
  };

  const updateServiceRate = (id: number, rate: string) => {
    const rateNum = parseFloat(rate);
    if (isNaN(rateNum) || rateNum < 0) return;
    
    setServices(services.map(service => 
      service.id === id ? { ...service, rate: rateNum } : service
    ));
  };

  const toggleAvailability = (day: string, time: string) => {
    setAvailability({
      ...availability,
      [day]: {
        ...availability[day as keyof typeof availability],
        [time]: !availability[day as keyof typeof availability][time as keyof typeof availability[keyof typeof availability]]
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workerId) {
      toast.error("Worker ID not found, please log in again");
      navigate("/auth");
      return;
    }
    
    const selectedServices = services.filter(service => service.selected);
    if (selectedServices.length === 0) {
      toast.error("Please select at least one service");
      return;
    }
    
    // Check if at least one availability slot is selected
    const hasAvailability = Object.values(availability).some(daySlots => 
      Object.values(daySlots).some(isAvailable => isAvailable)
    );
    
    if (!hasAvailability) {
      toast.error("Please select at least one availability time slot");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // First register services
      console.log("Registering worker services for worker ID:", workerId);
      console.log("Selected services data:", selectedServices);
      await registerWorkerServices(workerId, selectedServices);
      
      // Then update availability
      console.log("Updating worker availability for worker ID:", workerId);
      await updateWorkerAvailability(workerId, availability);
      
      toast.success("Services and availability registered successfully!");
      setTimeout(() => {
        navigate("/worker/dashboard");
      }, 1500);
    } catch (error: any) {
      console.error("Error saving worker data:", error);
      console.error("Error response data:", error?.response?.data);
      toast.error(error?.response?.data?.message || "Failed to save your services and availability. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingServices) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading services...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (servicesError) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 max-w-lg mx-auto">
            <h2 className="text-lg font-semibold mb-2">Failed to load services</h2>
            <p>There was an error loading available services. Please try refreshing the page.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => refetch()}
            >
              Retry Loading Services
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Set Up Your Services</h1>
        
        <form onSubmit={handleSubmit}>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Services You Provide</CardTitle>
              <CardDescription>
                Select the services you can provide and set your hourly rate in ₹
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ServiceSelection
                services={services}
                toggleService={toggleService}
                updateServiceRate={updateServiceRate}
                currencySymbol="₹"
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Your Weekly Availability</CardTitle>
              <CardDescription>
                Select the time slots when you're available to work
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AvailabilitySelection
                availability={availability}
                toggleAvailability={toggleAvailability}
              />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : "Save and Continue"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </Layout>
  );
}
