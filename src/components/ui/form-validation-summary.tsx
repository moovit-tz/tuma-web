"use client"

import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, X, ChevronDown, ChevronUp, ExternalLink } from "lucide-react"
import { useTr } from "@/lib/i18n/portal"

interface ValidationError {
    field: string
    message: string
}

interface FormValidationSummaryProps {
    errors: ValidationError[]
    onFieldFocus?: (fieldName: string) => void
    onDismiss?: () => void
    className?: string
    showErrorCount?: boolean
    collapsible?: boolean
}

export function FormValidationSummary({
                                          errors,
                                          onFieldFocus,
                                          onDismiss,
                                          className = "",
                                          showErrorCount = true,
                                          collapsible = true,
                                      }: FormValidationSummaryProps) {
    const tr = useTr()
    const [isCollapsed, setIsCollapsed] = useState(false)

    if (errors.length === 0) return null

    const handleFieldClick = (fieldName: string) => {
        if (onFieldFocus) {
            onFieldFocus(fieldName)
        }
    }

    const formatFieldName = (fieldName: string) => {
        return fieldName
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())
            .trim()
    }

    return (
        <Card className={`border-red-200 bg-red-50 ${className}`}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <CardTitle className="text-red-900 text-lg">{tr("Form Validation Errors")}</CardTitle>
                        {showErrorCount && (
                            <Badge variant="destructive" className="bg-red-600">
                                {errors.length} {errors.length === 1 ? tr("error") : tr("errors")}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {collapsible && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="h-8 w-8 p-0 text-red-600 hover:bg-red-100"
                            >
                                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                            </Button>
                        )}
                        {onDismiss && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onDismiss}
                                className="h-8 w-8 p-0 text-red-600 hover:bg-red-100"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>

            {!isCollapsed && (
                <CardContent className="pt-0">
                    <Alert className="border-red-200 bg-red-50/50 mb-4">
                        <AlertDescription className="text-red-800">{tr("Please fix the following errors before submitting the form:")}</AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        {errors.map((error, index) => (
                            <div key={`${error.field}-${index}`}>
                                <div
                                    className={`flex items-start gap-3 p-3 rounded-lg border border-red-200 bg-white hover:bg-red-50/50 transition-colors ${
                                        onFieldFocus ? "cursor-pointer" : ""
                                    }`}
                                    onClick={() => handleFieldClick(error.field)}
                                >
                                    <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-2" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-red-900 text-sm">{formatFieldName(error.field)}</span>
                                            {onFieldFocus && <ExternalLink className="h-3 w-3 text-red-600" />}
                                        </div>
                                        <p className="text-red-700 text-sm">{error.message}</p>
                                    </div>
                                </div>
                                {index < errors.length - 1 && <Separator className="bg-red-200" />}
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-200">
                        <p className="text-red-800 text-sm">
                            💡 <strong>{tr("Tip:")}</strong>{" "}{tr("Click on any error above to jump directly to that field.")}</p>
                    </div>
                </CardContent>
            )}
        </Card>
    )
}
