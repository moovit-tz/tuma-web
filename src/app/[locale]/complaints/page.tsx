"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { AlertCircle, CheckCircle2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const complaintTypes = [
  "Delivery Delay",
  "Damaged Package",
  "Lost Package",
  "Wrong Delivery",
  "Service Quality",
  "Other"
]

export default function ComplaintsPage() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Simulate form submission
    setStatus("success")
    setTimeout(() => setStatus("idle"), 5000)
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold">File a Complaint</h1>
            <p className="mt-4 text-muted-foreground">
              We take your feedback seriously. Please provide details about your concern, and we'll address it promptly.
            </p>
          </div>

          {status === "success" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Complaint Submitted</AlertTitle>
                <AlertDescription className="text-green-700">
                  Thank you for your feedback. We'll review your complaint and get back to you within 24 hours.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  There was an error submitting your complaint. Please try again.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          <motion.form
            onSubmit={handleSubmit}
            className="space-y-6 bg-card p-8 rounded-lg border shadow-[var(--ds-shadow-raised)]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Full Name
                </label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium mb-2">
                  Phone Number
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  required
                />
              </div>

              <div>
                <label htmlFor="tracking" className="block text-sm font-medium mb-2">
                  Tracking Number (if applicable)
                </label>
                <Input
                  id="tracking"
                  placeholder="Enter tracking number"
                />
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium mb-2">
                  Complaint Type
                </label>
                <Select required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select complaint type" />
                  </SelectTrigger>
                  <SelectContent>
                    {complaintTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  Description
                </label>
                <Textarea
                  id="description"
                  placeholder="Please provide details about your complaint"
                  className="min-h-[150px]"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full group" size="lg">
              <span className="relative z-10">Submit Complaint</span>
              <Send className="ml-2 h-4 w-4 relative z-10 transition-transform" />
            </Button>
          </motion.form>
        </motion.div>
      </main>
    </div>
  )
} 