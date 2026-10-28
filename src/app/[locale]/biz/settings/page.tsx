"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { AlertTriangle, CheckCircle, Globe, Lock, Mail, Moon, Shield, Sun, Zap, Users } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TableBanner } from "@/components/ui/table-banner"
import { useTr } from "@/lib/i18n/portal"

export default function SettingsPage() {
    const tr = useTr()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      toast({
        title: tr("Settings updated"),
        description: tr("Your settings have been saved successfully."),
      })
    }, 1000)
  }

  return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{tr("System Settings")}</h1>
          <p className="text-muted-foreground">{tr("Configure your application settings and preferences")}</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="portal-sticky-tabs bg-muted/50 p-1">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>{tr("General")}</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              <span>{tr("Appearance")}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{tr("Notifications")}</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>{tr("Security")}</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{tr("Roles & Permissions")}</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>API</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle>{tr("Company Information")}</CardTitle>
                  <CardDescription>{tr("Configure your company details and regional settings")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">{tr("Company Name")}</Label>
                      <Input id="company-name" defaultValue="Dalatix" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-email">{tr("Company Email")}</Label>
                      <Input id="company-email" type="email" defaultValue="info@dalatix.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-phone">{tr("Company Phone")}</Label>
                      <Input id="company-phone" defaultValue="+255 123 456 789" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-address">{tr("Company Address")}</Label>
                      <Input id="company-address" defaultValue="123 Samora Avenue, Dar es Salaam" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="timezone">{tr("Default Timezone")}</Label>
                      <Select defaultValue="Africa/Dar_es_Salaam">
                        <SelectTrigger>
                          <SelectValue placeholder={tr("Select timezone")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Africa/Dar_es_Salaam">{tr("East Africa Time (EAT)")}</SelectItem>
                          <SelectItem value="UTC">{tr("Coordinated Universal Time (UTC)")}</SelectItem>
                          <SelectItem value="Europe/London">{tr("Greenwich Mean Time (GMT)")}</SelectItem>
                          <SelectItem value="America/New_York">{tr("Eastern Time (ET)")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date-format">{tr("Date Format")}</Label>
                      <Select defaultValue="DD/MM/YYYY">
                        <SelectTrigger>
                          <SelectValue placeholder={tr("Select date format")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DD/MM/YYYY">{tr("DD/MM/YYYY")}</SelectItem>
                          <SelectItem value="MM/DD/YYYY">{tr("MM/DD/YYYY")}</SelectItem>
                          <SelectItem value="YYYY-MM-DD">{tr("YYYY-MM-DD")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">{tr("Default Currency")}</Label>
                      <Select defaultValue="TZS">
                        <SelectTrigger>
                          <SelectValue placeholder={tr("Select currency")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TZS">{tr("Tanzanian Shilling (TZS)")}</SelectItem>
                          <SelectItem value="USD">{tr("US Dollar (USD)")}</SelectItem>
                          <SelectItem value="EUR">{tr("Euro (EUR)")}</SelectItem>
                          <SelectItem value="GBP">{tr("British Pound (GBP)")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? tr("Saving...") : tr("Save Changes")}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            <Card>
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle>{tr("System Preferences")}</CardTitle>
                  <CardDescription>{tr("Configure system-wide preferences and behavior")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="analytics">{tr("Usage Analytics")}</Label>
                      <p className="text-sm text-muted-foreground">{tr("Allow us to collect anonymous usage data to improve the system")}</p>
                    </div>
                    <Switch id="analytics" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-logout">{tr("Automatic Logout")}</Label>
                      <p className="text-sm text-muted-foreground">{tr("Automatically log out users after 30 minutes of inactivity")}</p>
                    </div>
                    <Switch id="auto-logout" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="maintenance-mode">{tr("Maintenance Mode")}</Label>
                      <p className="text-sm text-muted-foreground">{tr("Put the system in maintenance mode (only admins can access)")}</p>
                    </div>
                    <Switch id="maintenance-mode" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default-language">{tr("Default Language")}</Label>
                    <Select defaultValue="en">
                      <SelectTrigger>
                        <SelectValue placeholder={tr("Select language")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">{tr("English")}</SelectItem>
                        <SelectItem value="sw">{tr("Swahili")}</SelectItem>
                        <SelectItem value="fr">{tr("French")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? tr("Saving...") : tr("Save Changes")}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle>{tr("Theme Settings")}</CardTitle>
                  <CardDescription>{tr("Customize the look and feel of the application")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Label>{tr("Color Theme")}</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-background">
                          <Sun className="h-5 w-5" />
                        </div>
                        <Label htmlFor="theme-light" className="flex flex-col space-y-1">
                          <span>{tr("Light")}</span>
                          <span className="text-xs text-muted-foreground">{tr("Light background with dark text")}</span>
                        </Label>
                        <input
                            type="radio"
                            id="theme-light"
                            name="theme"
                            value="light"
                            defaultChecked
                            className="ml-auto"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-black">
                          <Moon className="h-5 w-5 text-white" />
                        </div>
                        <Label htmlFor="theme-dark" className="flex flex-col space-y-1">
                          <span>{tr("Dark")}</span>
                          <span className="text-xs text-muted-foreground">{tr("Dark background with light text")}</span>
                        </Label>
                        <input type="radio" id="theme-dark" name="theme" value="dark" className="ml-auto" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-white">
                          <div className="flex h-full w-full items-center justify-center rounded-full bg-white/80">
                            <Sun className="h-5 w-5 text-black" style={{ clipPath: "inset(0 50% 0 0)" }} />
                            <Moon className="h-5 w-5 text-white" style={{ clipPath: "inset(0 0 0 50%)" }} />
                          </div>
                        </div>
                        <Label htmlFor="theme-system" className="flex flex-col space-y-1">
                          <span>{tr("System")}</span>
                          <span className="text-xs text-muted-foreground">{tr("Follow system preference")}</span>
                        </Label>
                        <input type="radio" id="theme-system" name="theme" value="system" className="ml-auto" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="density">{tr("Display density")}</Label>
                    <Select defaultValue="comfortable">
                      <SelectTrigger>
                        <SelectValue placeholder={tr("Select density")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comfortable">{tr("Comfortable")}</SelectItem>
                        <SelectItem value="compact">{tr("Compact")}</SelectItem>
                        <SelectItem value="spacious">{tr("Spacious")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sidebar-position">{tr("Sidebar Position")}</Label>
                    <Select defaultValue="left">
                      <SelectTrigger>
                        <SelectValue placeholder={tr("Select position")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">{tr("Left")}</SelectItem>
                        <SelectItem value="right">{tr("Right")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="animations">{tr("Interface Animations")}</Label>
                      <p className="text-sm text-muted-foreground">{tr("Enable animations throughout the interface")}</p>
                    </div>
                    <Switch id="animations" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="reduced-motion">{tr("Reduced Motion")}</Label>
                      <p className="text-sm text-muted-foreground">{tr("Minimize animations for accessibility")}</p>
                    </div>
                    <Switch id="reduced-motion" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? tr("Saving...") : tr("Save Changes")}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle>{tr("Notification Channels")}</CardTitle>
                  <CardDescription>{tr("Configure how you receive notifications")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications">{tr("Email Notifications")}</Label>
                      <p className="text-sm text-muted-foreground">{tr("Receive notifications via email")}</p>
                    </div>
                    <Switch id="email-notifications" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sms-notifications">{tr("SMS Notifications")}</Label>
                      <p className="text-sm text-muted-foreground">{tr("Receive notifications via SMS")}</p>
                    </div>
                    <Switch id="sms-notifications" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="push-notifications">{tr("Push Notifications")}</Label>
                      <p className="text-sm text-muted-foreground">{tr("Receive push notifications in browser")}</p>
                    </div>
                    <Switch id="push-notifications" defaultChecked />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notification-frequency">{tr("Notification Frequency")}</Label>
                    <Select defaultValue="realtime">
                      <SelectTrigger>
                        <SelectValue placeholder={tr("Select frequency")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">{tr("Real-time")}</SelectItem>
                        <SelectItem value="hourly">{tr("Hourly Digest")}</SelectItem>
                        <SelectItem value="daily">{tr("Daily Digest")}</SelectItem>
                        <SelectItem value="weekly">{tr("Weekly Digest")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? tr("Saving...") : tr("Save Changes")}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            <Card>
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle>{tr("Notification Types")}</CardTitle>
                  <CardDescription>{tr("Choose which types of notifications you want to receive")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="system-notifications">{tr("System Alerts")}</Label>
                      <p className="text-sm text-muted-foreground">{tr("Important system alerts and updates")}</p>
                    </div>
                    <Switch id="system-notifications" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="security-notifications">{tr("Security Alerts")}</Label>
                      <p className="text-sm text-muted-foreground">{tr("Login attempts and security-related events")}</p>
                    </div>
                    <Switch id="security-notifications" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="transaction-notifications">{tr("Transaction Updates")}</Label>
                      <p className="text-sm text-muted-foreground">{tr("Updates about financial transactions")}</p>
                    </div>
                    <Switch id="transaction-notifications" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="marketing-notifications">{tr("Marketing & Promotions")}</Label>
                      <p className="text-sm text-muted-foreground">{tr("News about new features and promotions")}</p>
                    </div>
                    <Switch id="marketing-notifications" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? tr("Saving...") : tr("Save Changes")}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle>{tr("Password Settings")}</CardTitle>
                  <CardDescription>{tr("Update your password and security preferences")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">{tr("Current Password")}</Label>
                    <Input id="current-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">{tr("New Password")}</Label>
                    <Input id="new-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">{tr("Confirm New Password")}</Label>
                    <Input id="confirm-password" type="password" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? tr("Updating...") : tr("Update Password")}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            <Card>
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle>{tr("Security Settings")}</CardTitle>
                  <CardDescription>{tr("Configure additional security measures")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="two-factor">{tr("Two-Factor Authentication")}</Label>
                      <p className="text-sm text-muted-foreground">{tr("Add an extra layer of security to your account")}</p>
                    </div>
                    <Switch id="two-factor" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="session-timeout">{tr("Session Timeout")}</Label>
                      <p className="text-sm text-muted-foreground">{tr("Automatically log out after period of inactivity")}</p>
                    </div>
                    <Switch id="session-timeout" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="ip-restriction">{tr("IP Restriction")}</Label>
                      <p className="text-sm text-muted-foreground">{tr("Limit access to specific IP addresses")}</p>
                    </div>
                    <Switch id="ip-restriction" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-policy">{tr("Password Policy")}</Label>
                    <Select defaultValue="strong">
                      <SelectTrigger>
                        <SelectValue placeholder={tr("Select policy")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">{tr("Basic (8+ characters)")}</SelectItem>
                        <SelectItem value="medium">{tr("Medium (8+ chars, mixed case)")}</SelectItem>
                        <SelectItem value="strong">{tr("Strong (8+ chars, mixed case, numbers, symbols)")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? tr("Saving...") : tr("Save Changes")}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{tr("Security Audit Log")}</CardTitle>
                <CardDescription>{tr("Recent security events for your account")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 rounded-lg border p-4">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{tr("Successful login")}</p>
                      <p className="text-xs text-muted-foreground">{tr("IP: 41.222.103.45 • Today at 10:23 AM")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-lg border p-4">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{tr("Failed login attempt")}</p>
                      <p className="text-xs text-muted-foreground">{tr("IP: 185.176.43.89 • Yesterday at 8:47 PM")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-lg border p-4">
                    <Lock className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{tr("Password changed")}</p>
                      <p className="text-xs text-muted-foreground">{tr("IP: 41.222.103.45 • 3 days ago at 2:15 PM")}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline">{tr("View Full Audit Log")}</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{tr("User Roles")}</CardTitle>
                <CardDescription>{tr("Manage user roles and their permissions")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="rounded-[var(--ds-radius-large)] border border-slate-100 dark:border-white/5 bg-white dark:bg-[#1a1f2b] shadow-[var(--ds-shadow-raised)] overflow-hidden">
                    <TableBanner title={tr("User Roles")} description={tr("Roles and the permissions they grant")} icon="roles" />
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tr("Role Name")}</TableHead>
                          <TableHead>{tr("Description")}</TableHead>
                          <TableHead>{tr("Users")}</TableHead>
                          <TableHead>{tr("Status")}</TableHead>
                          <TableHead className="text-right">{tr("Actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">{tr("Super Admin")}</TableCell>
                          <TableCell>{tr("Full system access with all permissions")}</TableCell>
                          <TableCell>2</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{tr("Active")}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">{tr("Edit")}</Button>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">{tr("Admin")}</TableCell>
                          <TableCell>{tr("Administrative access with limited permissions")}</TableCell>
                          <TableCell>5</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{tr("Active")}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">{tr("Edit")}</Button>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">{tr("Manager")}</TableCell>
                          <TableCell>{tr("Management access for specific areas")}</TableCell>
                          <TableCell>8</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{tr("Active")}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">{tr("Edit")}</Button>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">{tr("Agent")}</TableCell>
                          <TableCell>{tr("Limited access for ticket agents")}</TableCell>
                          <TableCell>12</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{tr("Active")}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">{tr("Edit")}</Button>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">{tr("Driver")}</TableCell>
                          <TableCell>{tr("Access for vehicle drivers")}</TableCell>
                          <TableCell>25</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{tr("Active")}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">{tr("Edit")}</Button>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">{tr("Conductor")}</TableCell>
                          <TableCell>{tr("Access for bus conductors")}</TableCell>
                          <TableCell>25</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{tr("Active")}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">{tr("Edit")}</Button>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">{tr("Viewer")}</TableCell>
                          <TableCell>{tr("Read-only access to system data")}</TableCell>
                          <TableCell>3</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{tr("Limited")}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">{tr("Edit")}</Button>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-end">
                    <Button>{tr("Create New Role")}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{tr("Permission Management")}</CardTitle>
                <CardDescription>{tr("Configure permissions for each role")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium">{tr("Select Role to Edit Permissions")}</h3>
                    </div>
                    <Select defaultValue="admin">
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder={tr("Select role")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super-admin">{tr("Super Admin")}</SelectItem>
                        <SelectItem value="admin">{tr("Admin")}</SelectItem>
                        <SelectItem value="manager">{tr("Manager")}</SelectItem>
                        <SelectItem value="agent">{tr("Agent")}</SelectItem>
                        <SelectItem value="driver">{tr("Driver")}</SelectItem>
                        <SelectItem value="conductor">{tr("Conductor")}</SelectItem>
                        <SelectItem value="viewer">{tr("Viewer")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <h3 className="text-sm font-medium mb-3">{tr("Dashboard Access")}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="view-dashboard">{tr("View Dashboard")}</Label>
                          <Switch id="view-dashboard" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="view-analytics">{tr("View Analytics")}</Label>
                          <Switch id="view-analytics" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="export-reports">{tr("Export Reports")}</Label>
                          <Switch id="export-reports" defaultChecked />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <h3 className="text-sm font-medium mb-3">{tr("User Management")}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="view-users">{tr("View Users")}</Label>
                          <Switch id="view-users" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="create-users">{tr("Create Users")}</Label>
                          <Switch id="create-users" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="edit-users">{tr("Edit Users")}</Label>
                          <Switch id="edit-users" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="delete-users">{tr("Delete Users")}</Label>
                          <Switch id="delete-users" />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="manage-roles">{tr("Manage Roles")}</Label>
                          <Switch id="manage-roles" />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <h3 className="text-sm font-medium mb-3">{tr("Transportation Management")}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="view-vehicles">{tr("View Vehicles")}</Label>
                          <Switch id="view-vehicles" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="manage-vehicles">{tr("Manage Vehicles")}</Label>
                          <Switch id="manage-vehicles" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="view-routes">{tr("View Routes")}</Label>
                          <Switch id="view-routes" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="manage-routes">{tr("Manage Routes")}</Label>
                          <Switch id="manage-routes" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="view-bus-stops">{tr("View Bus Stops")}</Label>
                          <Switch id="view-bus-stops" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="manage-bus-stops">{tr("Manage Bus Stops")}</Label>
                          <Switch id="manage-bus-stops" defaultChecked />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <h3 className="text-sm font-medium mb-3">{tr("Booking Management")}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="view-bookings">{tr("View Bookings")}</Label>
                          <Switch id="view-bookings" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="create-bookings">{tr("Create Bookings")}</Label>
                          <Switch id="create-bookings" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="edit-bookings">{tr("Edit Bookings")}</Label>
                          <Switch id="edit-bookings" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="cancel-bookings">{tr("Cancel Bookings")}</Label>
                          <Switch id="cancel-bookings" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="issue-refunds">{tr("Issue Refunds")}</Label>
                          <Switch id="issue-refunds" />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <h3 className="text-sm font-medium mb-3">{tr("System Settings")}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="view-settings">{tr("View Settings")}</Label>
                          <Switch id="view-settings" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="edit-settings">{tr("Edit Settings")}</Label>
                          <Switch id="edit-settings" />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="manage-api">{tr("Manage API")}</Label>
                          <Switch id="manage-api" />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="system-backup">{tr("System Backup")}</Label>
                          <Switch id="system-backup" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit">{tr("Save Permissions")}</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-6">
            <Card>
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle>{tr("API Configuration")}</CardTitle>
                  <CardDescription>{tr("Manage API keys and access")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="api-url">{tr("API URL")}</Label>
                    <Input id="api-url" value="https://api.dalatix.com/v1" readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api-key">{tr("API Key")}</Label>
                    <div className="flex gap-2">
                      <Input id="api-key" value="••••••••••••••••••••••••••••••" readOnly />
                      <Button variant="outline" type="button">{tr("Show")}</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">{tr("Webhook URL")}</Label>
                    <Input id="webhook-url" placeholder="https://your-server.com/webhook" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="api-access">{tr("API Access")}</Label>
                      <p className="text-sm text-muted-foreground">{tr("Enable API access for third-party applications")}</p>
                    </div>
                    <Switch id="api-access" defaultChecked />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rate-limit">{tr("API Rate Limit")}</Label>
                    <Select defaultValue="1000">
                      <SelectTrigger>
                        <SelectValue placeholder={tr("Select rate limit")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">{tr("100 requests/minute")}</SelectItem>
                        <SelectItem value="500">{tr("500 requests/minute")}</SelectItem>
                        <SelectItem value="1000">{tr("1,000 requests/minute")}</SelectItem>
                        <SelectItem value="5000">{tr("5,000 requests/minute")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" type="button">{tr("Regenerate API Key")}</Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? tr("Saving...") : tr("Save Changes")}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{tr("API Documentation")}</CardTitle>
                <CardDescription>{tr("Resources for developers")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h3 className="text-sm font-medium">{tr("REST API Documentation")}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{tr("Comprehensive documentation for our RESTful API endpoints.")}</p>
                  <Button variant="link" className="px-0 h-auto mt-2">{tr("View Documentation")}</Button>
                </div>
                <div className="rounded-lg border p-4">
                  <h3 className="text-sm font-medium">{tr("API Changelog")}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{tr("Stay updated with the latest API changes and improvements.")}</p>
                  <Button variant="link" className="px-0 h-auto mt-2">{tr("View Changelog")}</Button>
                </div>
                <div className="rounded-lg border p-4">
                  <h3 className="text-sm font-medium">{tr("Developer SDKs")}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{tr("Download SDKs for various programming languages.")}</p>
                  <Button variant="link" className="px-0 h-auto mt-2">{tr("Browse SDKs")}</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  )
}
