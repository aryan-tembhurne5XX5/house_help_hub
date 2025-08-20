
import { Layout } from "@/components/Layout";

export default function About() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-6 text-center">About House Help Hub</h1>
          
          <div className="prose prose-lg mx-auto">
            <p className="lead text-xl text-center text-gray-600 mb-12">
              We're on a mission to revolutionize how households connect with service providers,
              making home management simpler and more efficient for everyone.
            </p>
            
            <div className="mb-12">
              <h2 className="text-2xl font-semibold mb-4">Our Story</h2>
              <p className="mb-4">
                House Help Hub was founded in 2025 with a simple goal: to solve the common challenge
                of finding reliable household help in Indian Houshold. What started as a small community-based platform
                has grown into a comprehensive service connecting thousands of households with
                verified service providers.
              </p>
              <p>
                Our founders experienced firsthand the difficulties of finding trustworthy and skilled
                household workers. This personal experience drove them to create a solution that would
                benefit both service seekers and providers, establishing a platform built on trust,
                reliability, and convenience.
              </p>
            </div>
            
            <div className="mb-12">
              <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
              <p>
                We strive to simplify household management by connecting homes with verified,
                skilled service providers. We believe that everyone deserves access to reliable
                help for their home needs, and every service provider deserves fair opportunities
                and working conditions.
              </p>
            </div>
            
            <div className="mb-12">
              <h2 className="text-2xl font-semibold mb-4">What Sets Us Apart</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Verified Professionals:</strong> Every service provider undergoes thorough
                  background checks and skill assessments before joining our platform.
                </li>
                <li>
                  <strong>Comprehensive Services:</strong> From cleaning and cooking to specialized
                  services like medical assistance and pest control, we cover all household needs.
                </li>
                <li>
                  <strong>Seamless Booking:</strong> Our user-friendly platform makes scheduling
                  services quick and hassle-free.
                </li>
                <li>
                  <strong>Reliable Support:</strong> Our customer service team is always ready to
                  assist with any questions or concerns.
                </li>
                <li>
                  <strong>Fair Practices:</strong> We ensure fair compensation and working conditions
                  for all service providers on our platform.
                </li>
              </ul>
            </div>
            
            <div className="mb-12">
              <h2 className="text-2xl font-semibold mb-4">Our Team</h2>
              <p>
                Behind House Help Hub is a dedicated team of professionals passionate about creating
                a positive impact in the household services industry. Our diverse team brings together
                expertise in technology, customer service, and industry knowledge to deliver the best
                possible experience for our users.
              </p>
            </div>
            
            <div>
              <h2 className="text-2xl font-semibold mb-4">Join Our Community</h2>
              <p>
                Whether you're looking for household services or are a skilled service provider,
                we welcome you to join our growing community. Together, we're building a more
                efficient and reliable way to manage household needs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
