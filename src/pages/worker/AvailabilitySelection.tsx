
import { Checkbox } from "@/components/ui/checkbox";

interface AvailabilitySelectionProps {
  availability: {
    [day: string]: {
      morning: boolean;
      afternoon: boolean;
      evening: boolean;
    }
  };
  toggleAvailability: (day: string, time: string) => void;
}

const times = ["morning", "afternoon", "evening"];
const labels = {
  morning: "Morning (6AM-12PM)",
  afternoon: "Afternoon (12PM-5PM)",
  evening: "Evening (5PM-9PM)",
};

export default function AvailabilitySelection({ availability, toggleAvailability }: AvailabilitySelectionProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left py-3">Day</th>
            {times.map((time) => (
              <th key={time} className="text-center py-3">{labels[time as keyof typeof labels]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.keys(availability).map((day) => (
            <tr key={day} className="border-t">
              <td className="py-4 capitalize">{day}</td>
              {times.map((time) => (
                <td key={`${day}-${time}`} className="py-4 text-center">
                  <Checkbox
                    id={`${day}-${time}`}
                    checked={availability[day][time as keyof typeof availability[typeof day]]}
                    onCheckedChange={() => toggleAvailability(day, time)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
