"use client";

import Link from "next/link";
import { ArrowLeft, ChevronRight, MapPin, Percent, Package, Users, Clock, BadgeCheck, BarChart } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyrightFooter } from "@/components/copyright-footer";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function AgentNetwork() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation - Sticky */}
      <header className="sticky top-0 z-40 w-full border-b bg-background supports-[backdrop-filter]:bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex gap-6 md:gap-10">
            <Link href="/public" className="flex items-center space-x-2">
              <Logo />
            </Link>
          </div>
          <nav className="hidden gap-6 md:flex">
            <Link
              href="/public#track-parcel"
              className="flex items-center text-lg font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Track Parcel
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
              href="/public#partners"
              className="flex items-center text-lg font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Partners
            </Link>
            <Link
              href="/contact"
              className="flex items-center text-lg font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <ThemeToggle defaultTheme="system" />
            <Button asChild size="sm" className="hidden md:flex">
              <Link href="/login">
                Login
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-muted py-12 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-4xl text-center">
              <Link
                href="/public"
                className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-4"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Home
              </Link>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">MySafari Agent Network</h1>
                <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
                  Join our nationwide network of agents and build a rewarding business helping people send and receive parcels.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="container py-12 md:py-24">
          <div className="mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl font-bold md:text-3xl">Why Become a MySafari Agent?</h2>
              <p className="mt-4 text-muted-foreground">
                Partnering with MySafari Parcel offers numerous benefits and opportunities for growth.
              </p>
            </motion.div>
            
            <motion.div
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              <motion.div variants={item}>
                <Card>
                  <CardHeader>
                    <Percent className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Earn Commission</CardTitle>
                    <CardDescription>
                      Get competitive commission rates on every parcel processed through your agency.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
              
              <motion.div variants={item}>
                <Card>
                  <CardHeader>
                    <Package className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Low Startup Costs</CardTitle>
                    <CardDescription>
                      Minimal investment required to start your MySafari agent business.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
              
              <motion.div variants={item}>
                <Card>
                  <CardHeader>
                    <Users className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Training & Support</CardTitle>
                    <CardDescription>
                      Comprehensive training and ongoing support from our experienced team.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
              
              <motion.div variants={item}>
                <Card>
                  <CardHeader>
                    <MapPin className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Nationwide Network</CardTitle>
                    <CardDescription>
                      Connect with agents across Tanzania and reach more customers.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
              
              <motion.div variants={item}>
                <Card>
                  <CardHeader>
                    <BarChart className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Growth Potential</CardTitle>
                    <CardDescription>
                      Scale your business with our expanding customer base and services.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
              
              <motion.div variants={item}>
                <Card>
                  <CardHeader>
                    <Clock className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Flexible Hours</CardTitle>
                    <CardDescription>
                      Operate on a schedule that works for you and your community.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </section>
        
        {/* How It Works Section */}
        <section className="bg-muted/30 py-12 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-4xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-center mb-12"
              >
                <h2 className="text-2xl font-bold md:text-3xl">How It Works</h2>
                <p className="mt-4 text-muted-foreground">
                  Becoming a MySafari agent is a simple process. Here's how to get started.
                </p>
              </motion.div>
              
              <motion.div 
                className="relative"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                {/* Timeline line */}
                <div className="absolute left-12 top-0 bottom-0 w-0.5 bg-border hidden sm:block" />
                
                <div className="space-y-12">
                  <motion.div 
                    className="flex flex-col sm:flex-row gap-6"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <div className="sm:w-24 flex sm:flex-col items-center">
                      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                        1
                      </div>
                    </div>
                    <div className="flex-1 rounded-lg border bg-background p-6">
                      <h3 className="text-xl font-bold">Apply Online</h3>
                      <p className="mt-2 text-muted-foreground">
                        Fill out the application form on this page with your details and business information.
                      </p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="flex flex-col sm:flex-row gap-6"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <div className="sm:w-24 flex sm:flex-col items-center">
                      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                        2
                      </div>
                    </div>
                    <div className="flex-1 rounded-lg border bg-background p-6">
                      <h3 className="text-xl font-bold">Verification & Interview</h3>
                      <p className="mt-2 text-muted-foreground">
                        Our team will review your application and schedule a call or meeting to discuss the partnership.
                      </p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="flex flex-col sm:flex-row gap-6"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <div className="sm:w-24 flex sm:flex-col items-center">
                      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                        3
                      </div>
                    </div>
                    <div className="flex-1 rounded-lg border bg-background p-6">
                      <h3 className="text-xl font-bold">Training & Onboarding</h3>
                      <p className="mt-2 text-muted-foreground">
                        Receive comprehensive training on our systems, processes, and customer service standards.
                      </p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="flex flex-col sm:flex-row gap-6"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <div className="sm:w-24 flex sm:flex-col items-center">
                      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                        4
                      </div>
                    </div>
                    <div className="flex-1 rounded-lg border bg-background p-6">
                      <h3 className="text-xl font-bold">Start Your Business</h3>
                      <p className="mt-2 text-muted-foreground">
                        Launch your MySafari agent business and begin processing parcels for your community.
                      </p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
        
        {/* Requirements Section */}
        <section className="container py-12 md:py-24">
          <div className="mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-12"
            >
              <div className="flex items-center gap-4 mb-6">
                <BadgeCheck className="h-10 w-10 text-primary" />
                <h2 className="text-2xl font-bold md:text-3xl">Requirements</h2>
              </div>
              <p className="text-muted-foreground mb-8">
                To qualify as a MySafari agent, you'll need to meet these basic requirements:
              </p>
              
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <ChevronRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p>A physical business location accessible to customers</p>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p>Basic computer skills and internet connectivity</p>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p>Valid business registration documents</p>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p>Customer service experience is preferred but not required</p>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p>Ability to provide a small security deposit (refundable)</p>
                </li>
              </ul>
            </motion.div>
          </div>
        </section>
        
        {/* Application Form */}
        <section className="bg-muted py-12 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-3xl bg-background rounded-[var(--ds-radius-large)] border shadow-[var(--ds-shadow-raised)] p-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-2xl font-bold md:text-3xl text-center mb-8">Apply to Become an Agent</h2>
                
                <form className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Personal Information</h3>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="first-name">First name</Label>
                        <Input id="first-name" placeholder="Enter your first name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last-name">Last name</Label>
                        <Input id="last-name" placeholder="Enter your last name" />
                      </div>
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="Enter your email" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone number</Label>
                        <Input id="phone" type="tel" placeholder="Enter your phone number" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-medium">Business Information</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="business-name">Business name</Label>
                      <Input id="business-name" placeholder="Enter your business name" />
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="business-type">Business type</Label>
                        <Select>
                          <SelectTrigger id="business-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="retail">Retail Shop</SelectItem>
                            <SelectItem value="office">Office</SelectItem>
                            <SelectItem value="convenience">Convenience Store</SelectItem>
                            <SelectItem value="postal">Postal Shop</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="years-operating">Years in operation</Label>
                        <Select>
                          <SelectTrigger id="years-operating">
                            <SelectValue placeholder="Select years" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="<1">Less than 1 year</SelectItem>
                            <SelectItem value="1-3">1-3 years</SelectItem>
                            <SelectItem value="3-5">3-5 years</SelectItem>
                            <SelectItem value="5+">More than 5 years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="address">Business address</Label>
                      <Input id="address" placeholder="Enter your business address" />
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input id="city" placeholder="Enter city" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="region">Region</Label>
                        <Input id="region" placeholder="Enter region" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-medium">Additional Information</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="why-join">Why do you want to join the MySafari Agent Network?</Label>
                      <Textarea id="why-join" placeholder="Tell us why you're interested in becoming an agent" className="min-h-[100px]" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="experience">Relevant experience</Label>
                      <Textarea id="experience" placeholder="Describe any relevant experience you have in logistics, retail, or customer service" className="min-h-[100px]" />
                    </div>
                  </div>
                  
                  <div className="flex justify-center pt-6">
                    <Button size="lg" type="submit">
                      Submit Application
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted">
        <div className="container flex flex-col gap-8 py-8 md:py-12">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Logo />
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                Streamline your parcel delivery with our comprehensive management system.
              </p>
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  123 Biashara Street, Dar es Salaam, Tanzania
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Quick Links</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/public#track-parcel" className="text-muted-foreground hover:text-foreground">
                      Track Parcel
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
                  <li>
                    <Link href="/public#partners" className="text-muted-foreground hover:text-foreground">
                      Partners
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
                  <li>
                    <Link href="/agent-network" className="text-muted-foreground hover:text-foreground">
                      Agent Network
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Contact</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/contact" className="text-muted-foreground hover:text-foreground">
                      Contact Us
                    </Link>
                  </li>
                  <li>
                    <Link href="/support" className="text-muted-foreground hover:text-foreground">
                      Support
                    </Link>
                  </li>
                  <li>
                    <Link href="/about" className="text-muted-foreground hover:text-foreground">
                      About Us
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