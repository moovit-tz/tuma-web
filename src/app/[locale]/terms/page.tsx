import Link from "next/link";
import { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { CopyrightFooter } from "@/components/copyright-footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "MySafari Parcel Terms of Service and usage agreement",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="container z-40 bg-background">
        <div className="flex h-20 items-center justify-between py-4">
          <div className="flex gap-6 md:gap-10">
            <Link href="/public" className="flex items-center space-x-2">
              <span className="font-bold text-xl md:text-2xl">MySafari Parcel</span>
            </Link>
          </div>
          <nav className="hidden gap-6 md:flex">
            <Link
              href="/public#tracking"
              className="flex items-center text-lg font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Tracking
            </Link>
            <Link
              href="/public#features"
              className="flex items-center text-lg font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Features
            </Link>
            <Link
              href="/public#how-it-works"
              className="flex items-center text-lg font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              How It Works
            </Link>
            <Link
              href="/contact"
              className="flex items-center text-lg font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Contact
            </Link>
          </nav>
          <Button asChild size="sm" className="hidden md:flex">
            <Link href="/login">
              Login
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <div className="container py-12 md:py-16 lg:py-20">
          <div className="mx-auto max-w-[70rem]">
            <div className="space-y-4 mb-10">
              <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">Terms of Service</h1>
              <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            </div>

            <div className="prose prose-slate dark:prose-invert max-w-none">
              <h2>1. Introduction</h2>
              <p>
                Welcome to MySafari Parcel. These Terms of Service ("Terms") govern your use of our website, services, and mobile applications (collectively, the "Services") provided by HashTech Tanzania Limited ("Company", "we", "us", or "our"). By accessing or using the Services, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Services.
              </p>

              <h2>2. Use of Services</h2>
              <p>
                MySafari Parcel provides parcel tracking and management services for businesses and individuals. By using our Services, you agree to:
              </p>
              <ul>
                <li>Provide accurate and complete information when registering for an account or booking parcels</li>
                <li>Maintain the security of your account credentials</li>
                <li>Use the Services only for lawful purposes and in accordance with these Terms</li>
                <li>Not use the Services in any way that could damage, disable, overburden, or impair our systems</li>
                <li>Not attempt to gain unauthorized access to our systems or any user accounts</li>
              </ul>

              <h2>3. Account Registration</h2>
              <p>
                To use certain features of our Services, you must register for an account. When you register, you agree to provide accurate, current, and complete information about yourself and/or your business. You are responsible for safeguarding your password and for any activities or actions under your account. We reserve the right to disable any user account if we believe you have violated these Terms.
              </p>

              <h2>4. Parcel Tracking and Management</h2>
              <p>
                Our Services provide real-time tracking and management of parcels. While we strive to ensure accurate and timely information, we cannot guarantee that all tracking information will be 100% accurate at all times. Factors outside our control may affect the accuracy of tracking information.
              </p>

              <h2>5. Fees and Payment</h2>
              <p>
                Some of our Services may require payment of fees. All fees are specified on our website or when you book a service. You agree to pay all fees associated with your use of the Services. We reserve the right to change our fee structure at any time with appropriate notice to users.
              </p>

              <h2>6. Intellectual Property</h2>
              <p>
                The Services and their original content, features, and functionality are and will remain the exclusive property of HashTech Tanzania Limited and its licensors. The Services are protected by copyright, trademark, and other laws of Tanzania and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of HashTech Tanzania Limited.
              </p>

              <h2>7. User Content</h2>
              <p>
                Our Services may allow you to post, link, store, share, and otherwise make available certain information, text, graphics, or other material. You are responsible for the content you post, and you grant us a license to use, host, store, reproduce, modify, create derivative works, communicate, publish, publicly perform, and distribute such content.
              </p>

              <h2>8. Privacy Policy</h2>
              <p>
                Our Privacy Policy, available at <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, describes how we collect, use, and share information about you when you use our Services. By using our Services, you agree to the collection, use, and sharing of your information as described in our Privacy Policy.
              </p>

              <h2>9. Limitation of Liability</h2>
              <p>
                In no event shall HashTech Tanzania Limited, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Services.
              </p>

              <h2>10. Termination</h2>
              <p>
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Services will immediately cease.
              </p>

              <h2>11. Governing Law</h2>
              <p>
                These Terms shall be governed and construed in accordance with the laws of Tanzania, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
              </p>

              <h2>12. Changes to Terms</h2>
              <p>
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
              </p>

              <h2>13. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us at support@mysafari.co.tz or through our <Link href="/contact" className="text-primary hover:underline">Contact Page</Link>.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted">
        <div className="container flex flex-col gap-8 py-8 md:py-12">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">MySafari Parcel</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Streamline your parcel delivery with our comprehensive management system.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Quick Links</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/public#tracking" className="text-muted-foreground hover:text-foreground">
                      Tracking
                    </Link>
                  </li>
                  <li>
                    <Link href="/public#features" className="text-muted-foreground hover:text-foreground">
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link href="/public#how-it-works" className="text-muted-foreground hover:text-foreground">
                      How It Works
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Management</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/login" className="text-muted-foreground hover:text-foreground">
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link href="/register" className="text-muted-foreground hover:text-foreground">
                      Register
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                      Dashboard
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/terms" className="text-muted-foreground hover:text-foreground">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="text-muted-foreground hover:text-foreground">
                      Contact Us
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t pt-6">
            <CopyrightFooter />
          </div>
        </div>
      </footer>
    </div>
  );
} 