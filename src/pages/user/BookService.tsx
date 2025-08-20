
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getServices, getAvailableWorkers, createBooking } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import { Loader2, User, Clock, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const getDateLimits = () => {
  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 14); // Allow booking up to 2 weeks in advance
  
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return {
    min: formatDate(today),
    max: formatDate(maxDate),
  };
};

const dateLimits = getDateLimits();

const timeSlots = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
];

interface Service {
  service_id: number;
  name: string;
  description: string;
  base_price: number;
}

interface Worker {
  worker_id: number;
  name: string;
  phone: string;
  profile_pic?: string;
  price_per_hour: number;
}

export default function BookService() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  
  // Get user ID from localStorage
  const userId = parseInt(localStorage.getItem('userId') || '0');
  
  // Redirect if not logged in as user
  useEffect(() => {
    if (!userId || localStorage.getItem('userType') !== 'user') {
      toast.error("Please login as a user first");
      navigate("/auth");
    }
  }, [userId, navigate]);
  
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [bookingDetails, setBookingDetails] = useState({
    date: "",
    time: "",
    location: "",
    duration: 1,
    notes: ""
  });
  
  const [availableWorkers, setAvailableWorkers] = useState<Worker[]>([]);
  const [isCheckingWorkers, setIsCheckingWorkers] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  
  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await getServices();
      return response.data as Service[];
    }
  });
  
  const handleServiceSelect = (serviceId: number) => {
    setSelectedService(serviceId);
    setSelectedWorker(null);
    setStep(2);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBookingDetails(prev => ({ ...prev, [name]: value }));
  };
  
  const handleTimeSelect = (value: string) => {
    setBookingDetails(prev => ({ ...prev, time: value }));
  };
  
  const handleDurationSelect = (value: string) => {
    setBookingDetails(prev => ({ ...prev, duration: parseFloat(value) }));
  };
  
  const findAvailableWorkers = async () => {
    if (!selectedService || !bookingDetails.date || !bookingDetails.time) {
      return;
    }
    
    setIsCheckingWorkers(true);
    setAvailableWorkers([]);
    
    try {
      console.log(`Finding available workers for service ${selectedService} on ${bookingDetails.date} at ${bookingDetails.time}`);
      const response = await getAvailableWorkers(
        selectedService,
        bookingDetails.date,
        bookingDetails.time
      );
      
      const workers = response.data as Worker[];
      console.log("Available workers found:", workers);
      setAvailableWorkers(workers);
      
      if (workers.length === 0) {
        toast.error("No workers available for this service at the selected time.");
      }
    } catch (error) {
      console.error("Error finding available workers:", error);
      toast.error("Error finding available workers. Please try again.");
    } finally {
      setIsCheckingWorkers(false);
    }
  };
  
  const selectWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    setStep(3);
  };
  
  const handleBooking = async () => {
    if (!userId) {
      toast.error("User ID not found, please log in again");
      navigate("/auth");
      return;
    }
    
    if (!selectedService || !selectedWorker || !bookingDetails.date || !bookingDetails.time || !bookingDetails.location) {
      toast.error("Please fill all required fields");
      return;
    }
    
    setIsBooking(true);
    
    try {
      console.log("Creating booking with details:", {
        userId,
        serviceId: selectedService,
        workerId: selectedWorker.worker_id,
        bookingDate: bookingDetails.date,
        bookingTime: bookingDetails.time,
        durationHours: bookingDetails.duration,
        address: bookingDetails.location,
        notes: bookingDetails.notes || ""
      });
      
      const response = await createBooking({
        userId,
        serviceId: selectedService,
        workerId: selectedWorker.worker_id,
        bookingDate: bookingDetails.date,
        bookingTime: bookingDetails.time,
        durationHours: bookingDetails.duration,
        address: bookingDetails.location,
        notes: bookingDetails.notes || ""
      });
      
      toast.success("Booking request sent successfully!");
      
      // Navigate to confirmation page with booking details
      navigate('/booking-confirmation', { 
        state: { 
          bookingId: response.data.bookingId,
          ticketNumber: response.data.ticketNumber 
        } 
      });
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error("Failed to create booking. Please try again.");
    } finally {
      setIsBooking(false);
    }
  };
  
  const selectedServiceDetails = services?.find(s => s.service_id === selectedService);

  if (isLoadingServices) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading services...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Book a Service</h1>
          
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-6">1. Select a Service</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {services?.map((service) => (
                  <Card 
                    key={service.service_id} 
                    className={`cursor-pointer transition-all hover:border-brand-500 hover:shadow-md ${
                      selectedService === service.service_id ? 'border-brand-500 ring-2 ring-brand-500/20' : ''
                    }`}
                    onClick={() => handleServiceSelect(service.service_id)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle>{service.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{service.description || `Starting at ₹${service.base_price}/hour`}</p>
                    </CardContent>
                    <CardFooter>
                      <Button size="sm" className="w-full" variant={selectedService === service.service_id ? "default" : "outline"}>
                        Select
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {step === 2 && (
            <div>
              <div className="flex items-center mb-6">
                <button 
                  onClick={() => setStep(1)}
                  className="mr-4 p-2 hover:bg-gray-100 rounded-full"
                >
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
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <h2 className="text-xl font-semibold">2. Schedule Your {selectedServiceDetails?.name}</h2>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Booking Details</CardTitle>
                  <CardDescription>
                    Please select a date and time for your service.
                    You can book up to 2 weeks in advance.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        min={dateLimits.min}
                        max={dateLimits.max}
                        value={bookingDetails.date}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="time">Time</Label>
                      <Select
                        value={bookingDetails.time}
                        onValueChange={handleTimeSelect}
                      >
                        <SelectTrigger id="time">
                          <SelectValue placeholder="Select a time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map(time => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (hours)</Label>
                      <Select
                        value={bookingDetails.duration.toString()}
                        onValueChange={handleDurationSelect}
                      >
                        <SelectTrigger id="duration">
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4].map(hours => (
                            <SelectItem key={hours} value={hours.toString()}>
                              {hours} {hours === 1 ? 'hour' : 'hours'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      name="location"
                      placeholder="Enter your address"
                      value={bookingDetails.location}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <Button
                    onClick={findAvailableWorkers}
                    disabled={!bookingDetails.date || !bookingDetails.time || !bookingDetails.location || isCheckingWorkers}
                    className="w-full"
                  >
                    {isCheckingWorkers ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Finding Available Workers...
                      </>
                    ) : "Find Available Workers"}
                  </Button>
                  
                  {availableWorkers.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-4">Available Workers</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {availableWorkers.map(worker => (
                          <Card 
                            key={worker.worker_id}
                            className="cursor-pointer hover:border-brand-500 hover:shadow-md"
                            onClick={() => selectWorker(worker)}
                          >
                            <CardContent className="p-4 flex items-center">
                              <Avatar className="h-10 w-10 mr-4">
                                <AvatarFallback>{worker.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{worker.name}</p>
                                <p className="text-sm text-muted-foreground">₹{worker.price_per_hour}/hour</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {availableWorkers.length === 0 && !isCheckingWorkers && bookingDetails.date && bookingDetails.time && (
                    <div className="bg-red-50 text-red-800 p-4 rounded-md">
                      <p className="font-medium">No workers available</p>
                      <p className="text-sm mt-1">
                        No workers are available at this time. Please select a different date or time for your service.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          {step === 3 && selectedWorker && (
            <div>
              <div className="flex items-center mb-6">
                <button 
                  onClick={() => setStep(2)}
                  className="mr-4 p-2 hover:bg-gray-100 rounded-full"
                >
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
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <h2 className="text-xl font-semibold">3. Confirm and Book</h2>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Booking Summary</CardTitle>
                  <CardDescription>
                    Please review your booking details before confirming.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted p-4 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Service</p>
                        <p className="font-medium">{selectedServiceDetails?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Worker</p>
                        <p className="font-medium">{selectedWorker.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <div className="font-medium flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {bookingDetails.date}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Time</p>
                        <div className="font-medium flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {bookingDetails.time}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-medium">{bookingDetails.duration} {bookingDetails.duration === 1 ? 'hour' : 'hours'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Price</p>
                        <p className="font-medium">₹{(selectedWorker.price_per_hour * bookingDetails.duration).toFixed(2)}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-medium">{bookingDetails.location}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Input
                      id="notes"
                      name="notes"
                      placeholder="Any special instructions or requirements"
                      value={bookingDetails.notes}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-md flex items-center">
                    <User className="text-green-500 mr-2 h-5 w-5" />
                    <span className="text-green-800">Worker is available for this time slot!</span>
                  </div>
                </CardContent>
                <CardFooter className="flex-col space-y-4">
                  <p className="w-full text-sm text-muted-foreground">
                    By proceeding, you agree to our Terms of Service and cancellation policy.
                  </p>
                  <Button
                    onClick={handleBooking}
                    disabled={isBooking}
                    className="w-full"
                  >
                    {isBooking ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : "Confirm Booking Request"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
