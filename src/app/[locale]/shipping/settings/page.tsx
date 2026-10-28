"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Bell, Shield, SettingsIcon, Upload, Save, Trash2, Eye, EyeOff } from "lucide-react"
import { useTitle } from "@/context/TitleContext"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Mock user data
const userData = {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+255 712 345 678",
    company: "ABC Trading Ltd",
    address: "123 Uhuru Street, Dar es Salaam",
    avatar: "/avatars/default.jpg",
}

const notificationSettings = {
    emailNotifications: {
        cargoUpdates: true,
        bidReceived: true,
        paymentReminders: true,
        promotions: false,
    },
    smsNotifications: {
        cargoUpdates: true,
        bidReceived: false,
        paymentReminders: true,
        promotions: false,
    },
    pushNotifications: {
        cargoUpdates: true,
        bidReceived: true,
        paymentReminders: true,
        promotions: false,
    },
}

const preferences = {
    language: "en",
    timezone: "Africa/Dar_es_Salaam",
    currency: "TZS",
    theme: "system",
}

export default function SettingsPage() {
    const { setTitle } = useTitle()
    const { toast } = useToast()
    const [profile, setProfile] = useState(userData)
    const [notifications, setNotifications] = useState(notificationSettings)
    const [userPreferences, setUserPreferences] = useState(preferences)
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    })

    useEffect(() => {
        setTitle("Settings")
    }, [setTitle])

    const handleProfileSave = () => {
        toast({
            title: "Profile Updated",
            description: "Your profile information has been saved successfully.",
        })
    }

    const handleNotificationSave = () => {
        toast({
            title: "Notifications Updated",
            description: "Your notification preferences have been saved.",
        })
    }

    const handlePasswordChange = () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast({
                title: "Password Mismatch",
                description: "New password and confirm password do not match.",
                variant: "destructive",
            })
            return
        }

        toast({
            title: "Password Changed",
            description: "Your password has been updated successfully.",
        })
        setPasswordData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        })
    }

    const handlePreferencesSave = () => {
        toast({
            title: "Preferences Updated",
            description: "Your preferences have been saved successfully.",
        })
    }

    const handleDeleteAccount = () => {
        toast({
            title: "Account Deletion Requested",
            description: "Your account deletion request has been submitted. You will receive a confirmation email.",
            variant: "destructive",
        })
    }

    const handleAvatarUpload = () => {
        toast({
            title: "Avatar Updated",
            description: "Your profile picture has been updated successfully.",
        })
    }

    return (
        <div className="flex-1 space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Settings</h2>
                    <p className="text-muted-foreground">Manage your account settings and preferences</p>
                </div>
            </div>

            {/* Settings Tabs */}
            <Tabs defaultValue="profile" className="space-y-4">
                <TabsList className="portal-sticky-tabs grid w-full grid-cols-4">
                    <TabsTrigger value="profile" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Profile
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Notifications
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Security
                    </TabsTrigger>
                    <TabsTrigger value="preferences" className="flex items-center gap-2">
                        <SettingsIcon className="h-4 w-4" />
                        Preferences
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Information</CardTitle>
                            <CardDescription>Update your personal information and profile picture</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Avatar Section */}
                            <div className="flex items-center space-x-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={profile.avatar || "/placeholder.svg"} alt={profile.name} />
                                    <AvatarFallback className="text-lg">
                                        {profile.name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="space-y-2">
                                    <Button variant="outline" onClick={handleAvatarUpload}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload New Picture
                                    </Button>
                                    <p className="text-sm text-muted-foreground">JPG, PNG or GIF. Max size 2MB.</p>
                                </div>
                            </div>

                            {/* Profile Form */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input
                                        id="name"
                                        value={profile.name}
                                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={profile.email}
                                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input
                                        id="phone"
                                        value={profile.phone}
                                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="company">Company</Label>
                                    <Input
                                        id="company"
                                        value={profile.company}
                                        onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <Textarea
                                    id="address"
                                    value={profile.address}
                                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <Button onClick={handleProfileSave}>
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notification Preferences</CardTitle>
                            <CardDescription>
                                Choose how you want to be notified about your cargo and account activity
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Email Notifications */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium">Email Notifications</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Cargo Updates</Label>
                                            <p className="text-sm text-muted-foreground">Get notified when your cargo status changes</p>
                                        </div>
                                        <Switch
                                            checked={notifications.emailNotifications.cargoUpdates}
                                            onCheckedChange={(checked) =>
                                                setNotifications({
                                                    ...notifications,
                                                    emailNotifications: {
                                                        ...notifications.emailNotifications,
                                                        cargoUpdates: checked,
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Bid Received</Label>
                                            <p className="text-sm text-muted-foreground">Get notified when you receive new bids</p>
                                        </div>
                                        <Switch
                                            checked={notifications.emailNotifications.bidReceived}
                                            onCheckedChange={(checked) =>
                                                setNotifications({
                                                    ...notifications,
                                                    emailNotifications: {
                                                        ...notifications.emailNotifications,
                                                        bidReceived: checked,
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Payment Reminders</Label>
                                            <p className="text-sm text-muted-foreground">Get reminded about pending payments</p>
                                        </div>
                                        <Switch
                                            checked={notifications.emailNotifications.paymentReminders}
                                            onCheckedChange={(checked) =>
                                                setNotifications({
                                                    ...notifications,
                                                    emailNotifications: {
                                                        ...notifications.emailNotifications,
                                                        paymentReminders: checked,
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Promotions</Label>
                                            <p className="text-sm text-muted-foreground">Receive promotional offers and updates</p>
                                        </div>
                                        <Switch
                                            checked={notifications.emailNotifications.promotions}
                                            onCheckedChange={(checked) =>
                                                setNotifications({
                                                    ...notifications,
                                                    emailNotifications: {
                                                        ...notifications.emailNotifications,
                                                        promotions: checked,
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SMS Notifications */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium">SMS Notifications</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Cargo Updates</Label>
                                            <p className="text-sm text-muted-foreground">Get SMS updates about your cargo</p>
                                        </div>
                                        <Switch
                                            checked={notifications.smsNotifications.cargoUpdates}
                                            onCheckedChange={(checked) =>
                                                setNotifications({
                                                    ...notifications,
                                                    smsNotifications: {
                                                        ...notifications.smsNotifications,
                                                        cargoUpdates: checked,
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Payment Reminders</Label>
                                            <p className="text-sm text-muted-foreground">Get SMS reminders for payments</p>
                                        </div>
                                        <Switch
                                            checked={notifications.smsNotifications.paymentReminders}
                                            onCheckedChange={(checked) =>
                                                setNotifications({
                                                    ...notifications,
                                                    smsNotifications: {
                                                        ...notifications.smsNotifications,
                                                        paymentReminders: checked,
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button onClick={handleNotificationSave}>
                                <Save className="mr-2 h-4 w-4" />
                                Save Notification Settings
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Security Settings</CardTitle>
                            <CardDescription>Manage your password and account security</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Change Password */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium">Change Password</h4>
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="current-password">Current Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="current-password"
                                                type={showCurrentPassword ? "text" : "password"}
                                                value={passwordData.currentPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            >
                                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="new-password">New Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="new-password"
                                                type={showNewPassword ? "text" : "password"}
                                                value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                            >
                                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="confirm-password"
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            >
                                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <Button onClick={handlePasswordChange}>Change Password</Button>
                            </div>

                            {/* Two-Factor Authentication */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium">Two-Factor Authentication</h4>
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <Label>Enable 2FA</Label>
                                        <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                                    </div>
                                    <Button variant="outline">Setup 2FA</Button>
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
                                <div className="p-4 border border-destructive rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-destructive">Delete Account</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Permanently delete your account and all associated data
                                            </p>
                                        </div>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete Account
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete your account and remove all your
                                                        data from our servers.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={handleDeleteAccount}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Delete Account
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="preferences" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Preferences</CardTitle>
                            <CardDescription>Customize your experience with language, timezone, and display settings</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="language">Language</Label>
                                    <Select
                                        value={userPreferences.language}
                                        onValueChange={(value) => setUserPreferences({ ...userPreferences, language: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">English</SelectItem>
                                            <SelectItem value="sw">Kiswahili</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="timezone">Timezone</Label>
                                    <Select
                                        value={userPreferences.timezone}
                                        onValueChange={(value) => setUserPreferences({ ...userPreferences, timezone: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select timezone" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Africa/Dar_es_Salaam">East Africa Time (EAT)</SelectItem>
                                            <SelectItem value="UTC">UTC</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="currency">Currency</Label>
                                    <Select
                                        value={userPreferences.currency}
                                        onValueChange={(value) => setUserPreferences({ ...userPreferences, currency: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select currency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="TZS">Tanzanian Shilling (TZS)</SelectItem>
                                            <SelectItem value="USD">US Dollar (USD)</SelectItem>
                                            <SelectItem value="EUR">Euro (EUR)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="theme">Theme</Label>
                                    <Select
                                        value={userPreferences.theme}
                                        onValueChange={(value) => setUserPreferences({ ...userPreferences, theme: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select theme" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="light">Light</SelectItem>
                                            <SelectItem value="dark">Dark</SelectItem>
                                            <SelectItem value="system">System</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button onClick={handlePreferencesSave}>
                                <Save className="mr-2 h-4 w-4" />
                                Save Preferences
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
