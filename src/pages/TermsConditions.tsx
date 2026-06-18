import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsConditions() {
  return (
    <Layout>
      <div className="container py-12 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Terms and Conditions</h1>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              By accessing or using the House Help Hub platform, you agree to be bound by these Terms and Conditions. If you disagree with any part of the terms, then you do not have permission to access the service.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>2. User Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
            </p>
            <p className="text-gray-600">
              You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>3. Service Provision</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              House Help Hub acts as an intermediary platform connecting households with independent service workers. We do not directly employ the service workers. While we conduct background checks and verify qualifications, the actual contract for service is directly between the user and the worker.
            </p>
            <p className="text-gray-600">
              We are not responsible for the performance of any services, nor do we guarantee the quality of the services provided by independent workers.
            </p>
          </CardContent>
        </Card>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>4. Cancellations and Refunds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Bookings can be cancelled without penalty up to 24 hours before the scheduled service time. Cancellations made within 24 hours of the scheduled service may be subject to a cancellation fee of up to 50% of the booking cost.
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-12">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </Layout>
  );
}
