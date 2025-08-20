
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function Hero() {
  return (
    <div className="hero-pattern py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
            Find Trusted Help for All Your <span className="text-brand-500">Home Needs</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Connect with verified household workers including maids, cooks, laundry services, 
            medical assistance, pest control, and more.
          </p>
          <Link to="/auth">
            <Button size="lg" className="text-lg px-8 py-6">
              Get Started
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ml-2 h-5 w-5"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
