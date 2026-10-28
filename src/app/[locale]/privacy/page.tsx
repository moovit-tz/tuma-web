import React from "react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-[#ffd428] text-[#242a37] py-4">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Privacy Policy Section */}
        <section className="bg-white shadow-[var(--ds-shadow-raised)] rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-[#242a37]">
            Privacy Policy for MySafari Parcel
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-medium text-[#242a37]">
                1. Introduction
              </h3>
              <p className="text-gray-600">
                At MySafari Parcel, we are committed to safeguarding your
                privacy. This Privacy Policy explains how we collect, use,
                disclose, and protect your personal information when you use our
                services.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium text-[#242a37]">
                2. Information We Collect
              </h3>
              <p className="text-gray-600">
                We may collect the following types of information:
              </p>
              <ul className="list-disc pl-6 text-gray-600">
                <li>
                  <strong>Personal Information:</strong> Name, email address,
                  phone number, when you create an account or use our services.
                </li>
                <li>
                  <strong>Device Information:</strong> Information about your
                  device, including IP address, browser type, operating system,
                  and device identifiers.
                </li>
                <li>
                  <strong>Usage Data:</strong> Information about how you use our
                  website and services, including access times, pages viewed,
                  and links clicked.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-medium text-[#242a37]">
                3. How We Use Your Information
              </h3>
              <p className="text-gray-600">We use your information to:</p>
              <ul className="list-disc pl-6 text-gray-600">
                <li>Provide and maintain our services.</li>
                <li>
                  Communicate with you about your account or transactions.
                </li>
                <li>Improve our services and develop new features.</li>
                <li>Ensure the security and integrity of our services.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-medium text-[#242a37]">
                4. Sharing of Information
              </h3>
              <p className="text-gray-600">
                We do not sell your personal information. We may share your
                information with third parties in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-600">
                <li>
                  <strong>Service Providers:</strong> With vendors who perform
                  services on our behalf, such as payment processing and data
                  analysis.
                </li>
                <li>
                  <strong>Legal Requirements:</strong> If required by law or to
                  respond to legal processes.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-medium text-[#242a37]">
                5. Data Security
              </h3>
              <p className="text-gray-600">
                We implement reasonable security measures to protect your
                information from unauthorized access, alteration, disclosure, or
                destruction.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium text-[#242a37]">
                6. Your Choices
              </h3>
              <p className="text-gray-600">You have the right to:</p>
              <ul className="list-disc pl-6 text-gray-600">
                <li>Access and update your personal information.</li>
                <li>
                  Delete your account and personal data, subject to legal
                  obligations.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-medium text-[#242a37]">
                7. Changes to This Privacy Policy
              </h3>
              <p className="text-gray-600">
                We may update this Privacy Policy from time to time. We will
                notify you of any changes by posting the new policy on this page
                and updating the effective date.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium text-[#242a37]">
                8. Contact Us
              </h3>
              <p className="text-gray-600">
                If you have any questions about this Privacy Policy, please
                contact us at:
              </p>
              <ul className="list-disc pl-6 text-gray-600">
                <li>
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:info@hashtech.co.tz"
                    className="text-[#ffd428] hover:underline"
                  >
                    info@hashtech.co.tz
                  </a>
                </li>
                <li>
                  <strong>Phone:</strong> +255736969594
                </li>
                <li>
                  <strong>Address:</strong> 5, Hubert Kairuki St, Regent Estate,
                  Mikocheni
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-white shadow-[var(--ds-shadow-raised)] rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-[#242a37]">
            Frequently Asked Questions (FAQ)
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-medium text-[#242a37]">
                1. What is MySafari Parcel?
              </h3>
              <p className="text-gray-600">
                MySafari Parcel is a digital platform that allows customers to
                track, manage, and receive updates on their parcels and
                deliveries in real time.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium text-[#242a37]">
                2. Where do I get my tracking number?
              </h3>
              <p className="text-gray-600">
                Your tracking number is provided after your parcel is registered
                to our system or sent through our system in the specific company
                bus. It is usually sent via SMS.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium text-[#242a37]">
                3. Can I change my delivery address after sending my parcel?
              </h3>
              <p className="text-gray-600">
                In most cases, you can request a change of delivery address
                before the parcel is out of office for delivery. Please contact
                customer support immediately for assistance.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium text-[#242a37]">
                4. How do I report a lost or delayed parcel?
              </h3>
              <p className="text-gray-600">
                If your parcel is delayed or missing, please contact our
                customer support team with your tracking number. We will
                investigate and provide updates promptly.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium text-[#242a37]">
                5. How long does delivery take?
              </h3>
              <p className="text-gray-600">
                Delivery time depends on the destination but in most cases it
                takes only 24 hours to reach the destination.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium text-[#242a37]">
                6. Is MySafari Parcel available outside Tanzania?
              </h3>
              <p className="text-gray-600">
                Currently, MySafari Parcel operates primarily within Tanzania,
                but we are expanding to serve more regions. Kindly stay tuned
                for more updates.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium text-[#242a37]">
                7. How do I contact MySafari Parcel customer support?
              </h3>
              <p className="text-gray-600">You can reach us through:</p>
              <ul className="list-disc pl-6 text-gray-600">
                <li>
                  <strong>Phone:</strong> +255736969594
                </li>
                <li>
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:support@mysafari.co.tz"
                    className="text-[#ffd428] hover:underline"
                  >
                    support@mysafari.co.tz
                  </a>
                </li>
                <li>
                  <strong>Live chat:</strong> On our website & all social media
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#242a37] text-white py-4">
        <div className="container mx-auto px-4 text-center">
          <p>
            © {new Date().getFullYear()} MySafari Parcel. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
