"use client"

import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import Link from "next/link"
import { ArrowLeft, Package } from "lucide-react"

export default function ReportLostItemPage() {
  const { toast } = useToast()
  const [date, setDate] = useState<Date>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // In a real application, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate API call
      
      toast({
        title: "Report submitted successfully",
        description: "We will review your report and contact you soon.",
        variant: "success",
      })

      // Reset form
      const form = e.target as HTMLFormElement
      form.reset()
      setDate(undefined)
    } catch (error) {
      toast({
        title: "Error submitting report",
        description: "Please try again later or contact support.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container max-w-2xl py-8 md:py-12">
      <div className="mb-8">
        <Link 
          href="/support" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Support
        </Link>
      </div>

      <Card className="bg-[#0a0d14] border-[#2a2f3c]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Report Lost Item</CardTitle>
          <CardDescription>
            Please provide details about your lost item. Our team will investigate and contact you as soon as possible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="trackingNumber">Tracking Number</Label>
              <Input
                id="trackingNumber"
                placeholder="Enter your parcel tracking number"
                required
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                required
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                required
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                required
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>Last Known Date</Label>
              <DatePicker
                date={date}
                setDate={setDate}
                placeholder="Select the last date you saw the item"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Item Description</Label>
              <Textarea
                id="description"
                placeholder="Please provide a detailed description of your lost item"
                required
                className="min-h-[100px] bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastLocation">Last Known Location</Label>
              <Input
                id="lastLocation"
                placeholder="Where did you last see or expect the item?"
                required
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalInfo">Additional Information</Label>
              <Textarea
                id="additionalInfo"
                placeholder="Any additional information that might help us locate your item"
                className="min-h-[100px] bg-background"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6 bg-[#0a0d14] border-[#2a2f3c]">
        <CardHeader>
          <CardTitle className="text-xl font-bold">What Happens Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Our team will review your report within 24 hours</li>
            <li>We will investigate the last known location and tracking history</li>
            <li>You will receive an email with updates and next steps</li>
            <li>If found, we will arrange for delivery or pickup of your item</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
} 