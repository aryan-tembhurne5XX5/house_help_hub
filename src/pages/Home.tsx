
import { Layout } from "@/components/Layout";
import { Hero } from "@/components/Hero";
import { ServiceCard } from "@/components/ServiceCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Home() {
  const services = [
    {
      title: "Cleaning Service",
      description: "Professional cleaning for homes and offices with customizable schedules.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M3 10h18" />
          <path d="M10 3v18" />
        </svg>
      ),
      className: "border-service-cleaning",
    },
    {
      title: "Cooking Service",
      description: "Experienced cooks preparing delicious meals according to your preferences.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
          <line x1="6" y1="17" x2="18" y2="17" />
        </svg>
      ),
      className: "border-service-cooking",
    },
    {
      title: "Laundry Service",
      description: "Full-service wash, dry, fold, and ironing with premium care.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <circle cx="12" cy="12" r="5" />
          <path d="M12 12v.01" />
        </svg>
      ),
      className: "border-service-laundry",
    },
    {
      title: "Medical Assistance",
      description: "Professional caregivers providing essential medical support at home.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 19H5a2 2 0 0 1-2-2V7c0-1.1.9-2 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3" />
          <path d="M8 19a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2" />
          <path d="M9.5 11h5" />
          <path d="M12 8.5v5" />
        </svg>
      ),
      className: "border-service-medical",
    },
    {
      title: "Pest Control",
      description: "Comprehensive pest management solutions for a pest-free environment.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 3h8l1 2h5v14H2V5h5z" />
          <path d="m18.5 10-1.262-3.156a2 2 0 0 0-1.31-1.206 1.95 1.95 0 0 0-.5-.067 1.95 1.95 0 0 0-.5.067 2 2 0 0 0-1.31 1.206L12.5 10l1.75.5m4.25-.5-1.75.5" />
        </svg>
      ),
      className: "border-service-pest",
    },
    {
      title: "Grocery Delivery",
      description: "Convenient doorstep delivery of groceries and essentials.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
          <path d="M22 7H2" />
        </svg>
      ),
      className: "border-brand-300",
    },
  ];

  const testimonials = [
    {
      name: "Aryan Tembhurne",
      role: "Founder",
      content: "",
      avatar: "",
    },
    {
      name: "Aarav Jain",
      role: "Co-founder",
      content: "",
      avatar: "",
    },
    {
      name: "Emily Rodriguez",
      role: "Co-founder",
      content: "",
      avatar: "",
    },
  ];

  return (
    <Layout>
      <Hero />
      
      {/* Services Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Services</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We provide a wide range of household services to make your life easier
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <ServiceCard
                key={index}
                icon={service.icon}
                title={service.title}
                description={service.description}
                className={service.className}
              />
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link to="/auth">
              <Button variant="outline" size="lg">
                Explore All Services
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Getting help is quick and easy with our simple booking process
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-8 text-center border">
              <div className="bg-brand-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-brand-500 text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Choose a Service</h3>
              <p className="text-gray-600">
                Browse through our wide range of household services and select the one you need.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-8 text-center border">
              <div className="bg-brand-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-brand-500 text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Schedule an Appointment</h3>
              <p className="text-gray-600">
                Choose a convenient date and time for the service within the next four days.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-8 text-center border">
              <div className="bg-brand-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-brand-500 text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Receive Quality Service</h3>
              <p className="text-gray-600">
                Our verified professional will arrive at your location to provide the service.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Founders</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Take a look at what our founders have to say about our mission and vision
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-lg p-8 border">
                <div className="flex items-center mb-4">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <h4 className="font-semibold">{testimonial.name}</h4>
                    <p className="text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-600">"{testimonial.content}"</p>
                <div className="flex mt-4">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-brand-500 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Join thousands of satisfied customers who have simplified their household management
          </p>
          <Link to="/auth">
            <Button variant="secondary" size="lg" className="text-brand-500">
              Sign Up Now
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
