"use client"

import { useAuth } from "@/providers/AuthProvider"
import { getToken, getCurrentUser } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useTr } from "@/lib/i18n/portal"

export function DebugAuth() {
    const tr = useTr()
    const { user, token, isAuthenticated } = useAuth()
    const localToken = getToken()
    const localUser = getCurrentUser()

    const handleTestAPI = async () => {
        try {
            const response = await fetch("/api/proxy/auth/users?page=1&per_page=5", {
                headers: {
                    Authorization: `Bearer ${localToken}`,
                    "Content-Type": "application/json",
                },
            })
            console.log("Test API Response:", response.status, await response.json())
        } catch (error) {
            console.error("Test API Error:", error)
        }
    }

    if (process.env.NODE_ENV !== "development") {
        return null
    }

    return (
        <Card className="mb-4">
            <CardHeader>
                <CardTitle className="text-sm">{tr("Debug Auth Info")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
                <div>
                    <strong>{tr("Auth Context:")}</strong>
                    <Badge variant={isAuthenticated ? "default" : "destructive"}>
                        {isAuthenticated ? tr("Authenticated") : tr("Not Authenticated")}
                    </Badge>
                </div>
                <div>
                    <strong>{tr("Context Token:")}</strong> {token ? `${token.substring(0, 20)}...` : tr("None")}
                </div>
                <div>
                    <strong>{tr("Local Token:")}</strong> {localToken ? `${localToken.substring(0, 20)}...` : tr("None")}
                </div>
                <div>
                    <strong>{tr("Context User:")}</strong> {user?.fullName || tr("None")}
                </div>
                <div>
                    <strong>{tr("Local User:")}</strong> {localUser?.fullName || tr("None")}
                </div>
                <Button size="sm" onClick={handleTestAPI}>{tr("Test API Call")}</Button>
            </CardContent>
        </Card>
    )
}
