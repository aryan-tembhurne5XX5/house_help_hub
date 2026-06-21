import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Clock, MapPin, User, Phone, Navigation, Eye, Play, CheckCircle2, AlertCircle, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import { formatBookingDateTime, safeParse } from "@/utils/dateUtils";
import { getTravelEstimate } from "@/utils/api";
import apolloClient from "@/lib/apolloClient";

interface Booking {
  booking_id: number;
  service_name: string;
  booking_date: string;
  booking_time: string;
  worker_name: string | null;
  worker_phone: string | null;
  worker_profile_pic: string | null;
  worker_id: number | null;
  status: string;
  total_price: number;
  ticket_number?: string;
  duration_hours?: number;
  address?: string;
  scheduled_start_datetime?: string;
  scheduled_end_datetime?: string;
  user_name?: string;
  user_phone?: string;
}

export function ActiveServiceCard({ booking, isWorker = false }: { booking: Booking, isWorker?: boolean }) {
  const [etaText, setEtaText] = useState<string | null>(null);

  // Poll ETA if travelling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isWorker && booking.status === "travelling" && booking.worker_id) {
      const fetchETA = async () => {
        try {
          const response = await getTravelEstimate(booking.worker_id!, booking.booking_id);
          if (response.data && response.data.durationMin) {
            setEtaText(`${Math.round(response.data.durationMin)} mins away`);
          }
        } catch (e) {
          console.error("Failed to fetch ETA");
        }
      };
      fetchETA();
      interval = setInterval(fetchETA, 30000); // 30s
    }
    return () => { if (interval) clearInterval(interval); };
  }, [booking.status, booking.worker_id, booking.booking_id, isWorker]);

  const getStatusDisplay = () => {
    if (isWorker) {
       switch (booking.status) {
        case "accepted": return { label: "Job Accepted", color: "bg-blue-100 text-blue-800 border-blue-200" };
        case "travelling": return { label: "You Are Travelling", color: "bg-indigo-100 text-indigo-800 border-indigo-200" };
        case "arrived": return { label: "Arrived", color: "bg-cyan-100 text-cyan-800 border-cyan-200" };
        case "waiting_for_schedule": return { label: "Arrived Early (Waiting)", color: "bg-cyan-50 text-cyan-700 border-cyan-200" };
        case "service_started": return { label: "Service In Progress", color: "bg-orange-100 text-orange-800 border-orange-200" };
        case "completion_requested": return { label: "Waiting for Confirmation", color: "bg-purple-100 text-purple-800 border-purple-200" };
        case "under_review": return { label: "Under Review", color: "bg-amber-100 text-amber-800 border-amber-200" };
        default: return { label: booking.status.toUpperCase(), color: "bg-gray-100 text-gray-800 border-gray-200" };
      }
    } else {
      switch (booking.status) {
        case "accepted": return { label: "Worker Assigned", color: "bg-blue-100 text-blue-800 border-blue-200" };
        case "travelling": return { label: "Worker Travelling", color: "bg-indigo-100 text-indigo-800 border-indigo-200" };
        case "arrived": return { label: "Worker Arrived", color: "bg-cyan-100 text-cyan-800 border-cyan-200" };
        case "waiting_for_schedule": return { label: "Worker Arrived Early", color: "bg-cyan-50 text-cyan-700 border-cyan-200" };
        case "service_started": return { label: "Service In Progress", color: "bg-orange-100 text-orange-800 border-orange-200" };
        case "completion_requested": return { label: "Completion Requested", color: "bg-purple-100 text-purple-800 border-purple-200" };
        case "under_review": return { label: "Under Review", color: "bg-amber-100 text-amber-800 border-amber-200" };
        default: return { label: booking.status.toUpperCase(), color: "bg-gray-100 text-gray-800 border-gray-200" };
      }
    }
  };

  const statusDisplay = getStatusDisplay();
  const personName = isWorker ? booking.user_name : booking.worker_name;
  const personPhone = isWorker ? booking.user_phone : booking.worker_phone;

  return (
    <Card className="border-2 shadow-sm transition-all hover:shadow-md overflow-hidden relative">
      <div className={`h-1.5 w-full ${statusDisplay.color.split(' ')[0]}`} />
      
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-4">
          <div>
            <CardTitle className="text-xl mb-1">{booking.service_name}</CardTitle>
            <Badge variant="outline" className={`font-semibold ${statusDisplay.color}`}>
              {statusDisplay.label}
              {etaText && <span className="ml-2 pl-2 border-l border-current opacity-80">{etaText}</span>}
            </Badge>
          </div>
          <div className="text-right">
            {booking.ticket_number && (
              <span className="text-xs font-mono text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                #{booking.ticket_number}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground flex items-center mb-1"><Calendar className="h-3 w-3 mr-1" /> Scheduled For</p>
            <p className="font-medium">{booking.scheduled_start_datetime ? formatBookingDateTime(booking.scheduled_start_datetime, null) : formatBookingDateTime(booking.booking_date, booking.booking_time)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center mb-1"><Timer className="h-3 w-3 mr-1" /> Duration</p>
            <p className="font-medium">{booking.duration_hours} hour(s)</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground flex items-center mb-1"><MapPin className="h-3 w-3 mr-1" /> Location</p>
            <p className="font-medium truncate">{booking.address}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-full border shadow-sm">
              <User className="h-4 w-4 text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isWorker ? "Customer" : "Assigned Worker"}</p>
              <p className="font-semibold text-sm">{personName || "Pending"}</p>
            </div>
          </div>
          {personPhone && (
            <a href={`tel:${personPhone}`}>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-green-100 hover:text-green-700">
                <Phone className="h-4 w-4" />
              </Button>
            </a>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="bg-gray-50/50 border-t flex gap-2 pt-4">
        <Link to={`/${isWorker ? 'worker' : 'user'}/booking/${booking.booking_id}`} className="flex-1">
          <Button variant="default" className="w-full">
            <Eye className="h-4 w-4 mr-2" /> View Details
          </Button>
        </Link>
        {!isWorker && ["accepted", "travelling", "arrived", "waiting_for_schedule", "service_started"].includes(booking.status) && (
          <Link to={`/user/booking/${booking.booking_id}/track`} className="flex-1">
            <Button variant="secondary" className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100">
              <Navigation className="h-4 w-4 mr-2" /> Track Live
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
