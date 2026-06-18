import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <Layout>
      <div className="container py-12 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Privacy Policy</h1>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>1. Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              When you use House Help Hub, we collect information that you provide to us directly, such as when you create an account, update your profile, or communicate with us. This may include your name, email address, phone number, physical address, and payment information.
            </p>
            <p className="text-gray-600">
              For service workers, we also collect information related to your qualifications, background checks, and service history.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>2. How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Match customers with appropriate service workers</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>3. Information Sharing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              We may share your information as follows:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Between users and workers to facilitate booked services</li>
              <li>With third-party vendors and service providers who perform services on our behalf</li>
              <li>In response to a request for information if we believe disclosure is in accordance with applicable law</li>
              <li>With your consent or at your direction</li>
            </ul>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-12">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </Layout>
  );
}
