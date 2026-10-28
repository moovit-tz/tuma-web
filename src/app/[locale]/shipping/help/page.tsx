"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    HelpCircle,
    Search,
    Phone,
    Mail,
    MessageCircle,
    Book,
    Video,
    FileText,
    Ticket,
    Plus,
    Eye,
    Clock,
    CheckCircle,
    AlertCircle,
    ExternalLink,
} from "lucide-react"
import { useTitle } from "@/context/TitleContext"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

// Mock data
const contactMethods = [
    {
        icon: Phone,
        title: "Phone Support",
        description: "Call us for immediate assistance",
        contact: "+255 22 123 4567",
        availability: "Mon-Fri, 8AM-6PM EAT",
    },
    {
        icon: Mail,
        title: "Email Support",
        description: "Send us an email and we'll respond within 24 hours",
        contact: "support@mysafari.co.tz",
        availability: "24/7",
    },
    {
        icon: MessageCircle,
        title: "Live Chat",
        description: "Chat with our support team in real-time",
        contact: "Start Chat",
        availability: "Mon-Fri, 8AM-10PM EAT",
    },
]

const faqCategories = [
    {
        id: "getting-started",
        title: "Getting Started",
        questions: [
            {
                question: "How do I create my first cargo shipment?",
                answer:
                    "To create your first cargo shipment, navigate to 'Send Cargo' from the main menu. Fill in the cargo details including pickup and delivery locations, weight, dimensions, and preferred delivery date. Once submitted, transporters will start bidding on your cargo.",
            },
            {
                question: "How does the bidding process work?",
                answer:
                    "After you post your cargo, registered transporters will submit bids with their pricing and estimated delivery times. You can review all bids, check transporter ratings, and select the best offer that meets your requirements.",
            },
            {
                question: "What information do I need to provide for shipping?",
                answer:
                    "You'll need to provide cargo description, weight, dimensions, pickup address, delivery address, preferred pickup date, cargo value, and any special handling instructions.",
            },
        ],
    },
    {
        id: "payments",
        title: "Payments & Billing",
        questions: [
            {
                question: "What payment methods are accepted?",
                answer:
                    "We accept credit/debit cards (Visa, Mastercard), mobile money (M-Pesa, Tigo Pesa, Airtel Money), and bank transfers from major Tanzanian banks.",
            },
            {
                question: "When do I pay for shipping?",
                answer:
                    "Payment is typically made after you accept a bid and before the cargo is picked up. Some transporters may offer payment on delivery options.",
            },
            {
                question: "Can I get a refund if my cargo is not delivered?",
                answer:
                    "Yes, we have a comprehensive refund policy. If your cargo is not delivered due to transporter fault, you're eligible for a full refund. Contact our support team to initiate the refund process.",
            },
        ],
    },
    {
        id: "tracking",
        title: "Tracking & Delivery",
        questions: [
            {
                question: "How can I track my cargo?",
                answer:
                    "You can track your cargo in real-time using the tracking number provided after booking confirmation. Go to 'Track Cargo' section and enter your tracking number to see current location and status.",
            },
            {
                question: "What if my cargo is delayed?",
                answer:
                    "If your cargo is delayed beyond the agreed delivery time, you'll receive automatic notifications. You can also contact the transporter directly through our platform or reach out to our support team for assistance.",
            },
            {
                question: "Can I change the delivery address after booking?",
                answer:
                    "Delivery address changes are possible before pickup, but may incur additional charges depending on the new location. Contact the transporter or our support team as soon as possible to make changes.",
            },
        ],
    },
]

const guides = [
    {
        id: "video-1",
        type: "video",
        title: "Getting Started with MySafari Shipping",
        description: "A comprehensive video guide on how to create your account and send your first cargo",
        duration: "5:30",
        thumbnail: "/images/guide-thumbnails/getting-started.jpg",
    },
    {
        id: "guide-1",
        type: "guide",
        title: "How to Choose the Right Transporter",
        description: "Learn how to evaluate bids and select the best transporter for your cargo",
        readTime: "3 min read",
    },
    {
        id: "guide-2",
        type: "guide",
        title: "Packaging Guidelines for Safe Delivery",
        description: "Best practices for packaging different types of cargo to ensure safe delivery",
        readTime: "4 min read",
    },
]

const supportTickets = [
    {
        id: "TKT-001",
        subject: "Payment issue with invoice INV-002",
        status: "open",
        priority: "high",
        created: "2024-01-15",
        lastUpdate: "2024-01-16",
    },
    {
        id: "TKT-002",
        subject: "Cargo tracking not updating",
        status: "in_progress",
        priority: "medium",
        created: "2024-01-14",
        lastUpdate: "2024-01-15",
    },
    {
        id: "TKT-003",
        subject: "Question about delivery options",
        status: "resolved",
        priority: "low",
        created: "2024-01-12",
        lastUpdate: "2024-01-13",
    },
]

const resources = [
    {
        title: "System Status",
        description: "Check the current status of our services",
        link: "#",
        icon: AlertCircle,
    },
    {
        title: "API Documentation",
        description: "Technical documentation for developers",
        link: "#",
        icon: FileText,
    },
    {
        title: "Community Forum",
        description: "Connect with other users and share experiences",
        link: "#",
        icon: MessageCircle,
    },
    {
        title: "What's New",
        description: "Latest updates and feature announcements",
        link: "#",
        icon: Book,
    },
]

const getStatusColor = (status: string) => {
    switch (status) {
        case "resolved":
            return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
        case "in_progress":
            return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
        case "open":
            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
        default:
            return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
}

const getPriorityColor = (priority: string) => {
    switch (priority) {
        case "high":
            return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
        case "medium":
            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
        case "low":
            return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
        default:
            return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
}

export default function HelpPage() {
    const { setTitle } = useTitle()
    const { toast } = useToast()
    const [searchTerm, setSearchTerm] = useState("")
    const [isCreatingTicket, setIsCreatingTicket] = useState(false)
    const [newTicket, setNewTicket] = useState({
        subject: "",
        priority: "medium",
        description: "",
    })

    useEffect(() => {
        setTitle("Help & Support")
    }, [setTitle])

    const handleCreateTicket = () => {
        toast({
            title: "Support Ticket Created",
            description: `Your ticket "${newTicket.subject}" has been created. We'll respond within 24 hours.`,
        })
        setIsCreatingTicket(false)
        setNewTicket({
            subject: "",
            priority: "medium",
            description: "",
        })
    }

    const filteredFAQs = faqCategories
        .map((category) => ({
            ...category,
            questions: category.questions.filter(
                (q) =>
                    q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    q.answer.toLowerCase().includes(searchTerm.toLowerCase()),
            ),
        }))
        .filter((category) => category.questions.length > 0)

    return (
        <div className="flex-1 space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Help & Support</h2>
                    <p className="text-muted-foreground">
                        Get help with your shipping needs and find answers to common questions
                    </p>
                </div>
            </div>

            {/* Quick Contact Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                {contactMethods.map((method, index) => (
                    <Card key={index} className="transition-shadow cursor-pointer">
                        <CardHeader className="text-center">
                            <method.icon className="h-8 w-8 mx-auto text-primary mb-2" />
                            <CardTitle className="text-lg">{method.title}</CardTitle>
                            <CardDescription>{method.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="font-semibold text-primary mb-1">{method.contact}</p>
                            <p className="text-sm text-muted-foreground">{method.availability}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="faq" className="space-y-4">
                <TabsList className="portal-sticky-tabs grid w-full grid-cols-4">
                    <TabsTrigger value="faq">FAQ</TabsTrigger>
                    <TabsTrigger value="guides">Guides</TabsTrigger>
                    <TabsTrigger value="tickets">My Tickets</TabsTrigger>
                    <TabsTrigger value="resources">Resources</TabsTrigger>
                </TabsList>

                <TabsContent value="faq" className="space-y-4">
                    {/* Search */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search frequently asked questions..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* FAQ Categories */}
                    <div className="space-y-4">
                        {filteredFAQs.map((category) => (
                            <Card key={category.id}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <HelpCircle className="h-5 w-5" />
                                        {category.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Accordion type="single" collapsible className="w-full">
                                        {category.questions.map((faq, index) => (
                                            <AccordionItem key={index} value={`item-${category.id}-${index}`}>
                                                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                                                <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {filteredFAQs.length === 0 && searchTerm && (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                                <p className="text-muted-foreground text-center mb-4">
                                    We couldn't find any FAQs matching your search. Try different keywords or contact our support team.
                                </p>
                                <Button>Contact Support</Button>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="guides" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Guides & Tutorials</CardTitle>
                            <CardDescription>
                                Learn how to make the most of MySafari Shipping with our comprehensive guides
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {guides.map((guide) => (
                                    <Card key={guide.id} className="transition-shadow cursor-pointer">
                                        <CardHeader>
                                            <div className="flex items-center gap-2 mb-2">
                                                {guide.type === "video" ? (
                                                    <Video className="h-5 w-5 text-primary" />
                                                ) : (
                                                    <Book className="h-5 w-5 text-primary" />
                                                )}
                                                <Badge variant="secondary">{guide.type === "video" ? guide.duration : guide.readTime}</Badge>
                                            </div>
                                            <CardTitle className="text-lg">{guide.title}</CardTitle>
                                            <CardDescription>{guide.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Button variant="outline" className="w-full bg-transparent">
                                                <Eye className="mr-2 h-4 w-4" />
                                                {guide.type === "video" ? "Watch Video" : "Read Guide"}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="tickets" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Support Tickets</CardTitle>
                                    <CardDescription>View and manage your support requests</CardDescription>
                                </div>
                                <Dialog open={isCreatingTicket} onOpenChange={setIsCreatingTicket}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Create Ticket
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[500px]">
                                        <DialogHeader>
                                            <DialogTitle>Create Support Ticket</DialogTitle>
                                            <DialogDescription>Describe your issue and we'll help you resolve it.</DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="subject">Subject</Label>
                                                <Input
                                                    id="subject"
                                                    placeholder="Brief description of your issue"
                                                    value={newTicket.subject}
                                                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="priority">Priority</Label>
                                                <Select
                                                    value={newTicket.priority}
                                                    onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select priority" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="low">Low</SelectItem>
                                                        <SelectItem value="medium">Medium</SelectItem>
                                                        <SelectItem value="high">High</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="description">Description</Label>
                                                <Textarea
                                                    id="description"
                                                    placeholder="Provide detailed information about your issue..."
                                                    value={newTicket.description}
                                                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                                                    rows={4}
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit" onClick={handleCreateTicket}>
                                                Create Ticket
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {supportTickets.map((ticket) => (
                                    <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex-shrink-0">
                                                <Ticket className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {ticket.subject}
                                                </p>
                                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                    <span>Ticket: {ticket.id}</span>
                                                    <span>•</span>
                                                    <span>Created: {ticket.created}</span>
                                                    <span>•</span>
                                                    <span>Updated: {ticket.lastUpdate}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="flex flex-col space-y-1">
                                                <Badge className={getStatusColor(ticket.status)}>
                                                    {ticket.status === "resolved" && <CheckCircle className="h-3 w-3 mr-1" />}
                                                    {ticket.status === "in_progress" && <Clock className="h-3 w-3 mr-1" />}
                                                    {ticket.status === "open" && <AlertCircle className="h-3 w-3 mr-1" />}
                                                    {ticket.status.replace("_", " ").toUpperCase()}
                                                </Badge>
                                                <Badge className={getPriorityColor(ticket.priority)} variant="outline">
                                                    {ticket.priority.toUpperCase()}
                                                </Badge>
                                            </div>
                                            <Button variant="outline" size="sm">
                                                <Eye className="h-4 w-4 mr-1" />
                                                View
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="resources" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Additional Resources</CardTitle>
                            <CardDescription>Explore more resources to help you with your shipping needs</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                {resources.map((resource, index) => (
                                    <Card key={index} className="transition-shadow cursor-pointer">
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <resource.icon className="h-6 w-6 text-primary" />
                                                    <div>
                                                        <CardTitle className="text-lg">{resource.title}</CardTitle>
                                                        <CardDescription>{resource.description}</CardDescription>
                                                    </div>
                                                </div>
                                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </CardHeader>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
