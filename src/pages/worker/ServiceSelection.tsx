
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ServiceOption {
  id: number;
  name: string;
  selected: boolean;
  rate: number;
}

interface ServiceSelectionProps {
  services: ServiceOption[];
  toggleService: (id: number) => void;
  updateServiceRate: (id: number, rate: string) => void;
  currencySymbol?: string;
}

export default function ServiceSelection({
  services,
  toggleService,
  updateServiceRate,
  currencySymbol = "₹"
}: ServiceSelectionProps) {
  return (
    <div className="space-y-6">
      {services.map(service => (
        <div
          key={service.id}
          className={`flex items-center gap-4 p-4 rounded border transition-colors ${
            service.selected ? "border-brand-500 bg-gray-50" : "border-gray-200"
          }`}
        >
          <Checkbox
            id={`service-${service.id}`}
            checked={service.selected}
            onCheckedChange={() => toggleService(service.id)}
          />
          <Label
            htmlFor={`service-${service.id}`}
            className="w-44 cursor-pointer"
          >
            {service.name}
          </Label>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">Rate:</span>
            <Input
              type="number"
              min={0}
              value={service.rate}
              onChange={e => updateServiceRate(service.id, e.target.value)}
              className="w-24"
              step="1"
              aria-label={`Hourly rate for ${service.name}`}
            />
            <span className="text-gray-500 text-sm">{currencySymbol}/hour</span>
          </div>
        </div>
      ))}
    </div>
  );
}
