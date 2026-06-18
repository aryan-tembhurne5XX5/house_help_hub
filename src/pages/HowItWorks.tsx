import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Search, Calendar, Star } from "lucide-react";

export default function HowItWorks() {
  return (
    <Layout>
      <div className="container py-12 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-center">How House Help Hub Works</h1>
        <p className="text-xl text-muted-foreground text-center mb-12">
          Getting reliable help for your home has never been easier.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <Card className="border-primary/20 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="bg-primary/10 p-3 rounded-full text-primary">
                  <Search className="h-6 w-6" />
                </div>
                1. Browse Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Explore our wide range of services including cleaning, cooking, laundry, medical assistance, and pest control. Read reviews and find the perfect match for your needs.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="bg-primary/10 p-3 rounded-full text-primary">
                  <Calendar className="h-6 w-6" />
                </div>
                2. Book an Appointment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Choose a convenient date and time. Provide details about what you need done. Our system instantly notifies available, verified workers in your area.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="bg-primary/10 p-3 rounded-full text-primary">
                  <CheckCircle className="h-6 w-6" />
                </div>
                3. Get It Done
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                A skilled professional arrives at your door ready to work. They'll complete the requested services to your satisfaction. Payment is handled securely through the platform.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="bg-primary/10 p-3 rounded-full text-primary">
                  <Star className="h-6 w-6" />
                </div>
                4. Rate and Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Share your experience to help others in the community. Good reviews help workers build their reputation and get more jobs!
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-muted/50 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
          <p className="mb-6 text-muted-foreground">Join thousands of households already using House Help Hub.</p>
          <a href="/auth" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            Create an Account
          </a>
        </div>
      </div>
    </Layout>
  );
}
