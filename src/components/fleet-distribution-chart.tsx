"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { useMemo } from "react"
import type { Vehicle } from "@/types/vehicle"
import { useTr } from "@/lib/i18n/portal"

interface FleetDistributionChartProps {
    vehicles: Vehicle[]
}

// Generate colors for the pie chart
const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
    "#FFC658",
    "#FF7C7C",
    "#8DD1E1",
    "#D084D0",
]

export function FleetDistributionChart({ vehicles }: FleetDistributionChartProps) {
    const tr = useTr()
    const chartData = useMemo(() => {
        // Group vehicles by company
        const companyGroups = vehicles.reduce(
            (acc, vehicle) => {
                const companyName = vehicle.company?.name || "Unknown Company"
                const companyId = vehicle.company?.id || 0

                if (!acc[companyId]) {
                    acc[companyId] = {
                        name: companyName,
                        value: 0,
                        vehicles: [],
                    }
                }

                acc[companyId].value += 1
                acc[companyId].vehicles.push(vehicle)

                return acc
            },
            {} as Record<number, { name: string; value: number; vehicles: Vehicle[] }>,
        )

        // Convert to array and sort by vehicle count
        return Object.values(companyGroups)
            .sort((a, b) => b.value - a.value)
            .map((item, index) => ({
                ...item,
                color: COLORS[index % COLORS.length],
                percentage: vehicles.length > 0 ? ((item.value / vehicles.length) * 100).toFixed(1) : "0",
            }))
    }, [vehicles])

    const CustomTooltip = ({ active, payload }: any) => {
    const tr = useTr()
        if (active && payload && payload.length) {
            const data = payload[0].payload
            return (
                <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-[var(--ds-shadow-raised)]">
                    <p className="font-medium">{data.name}</p>
                    <p className="text-sm text-muted-foreground">
                        {data.value}{" "}{tr("vehicles (")}{data.percentage}%)
                    </p>
                </div>
            )
        }
        return null
    }

    const CustomLegend = ({ payload }: any) => {
        return (
            <div className="flex flex-wrap gap-2 justify-center mt-4">
                {payload?.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-muted-foreground">
              {entry.value} ({entry.payload.percentage}%)
            </span>
                    </div>
                ))}
            </div>
        )
    }

    if (vehicles.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{tr("Fleet Distribution by Company")}</CardTitle>
                    <CardDescription>{tr("Vehicle distribution across companies")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">{tr("No vehicles data available")}</div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{tr("Fleet Distribution by Company")}</CardTitle>
                <CardDescription>{tr("Vehicle distribution across {chartDataCount} companies", { chartDataCount: chartData.length })}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percentage }) => `${name}: ${percentage}%`}
                                outerRadius={120}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend content={<CustomLegend />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Company breakdown table */}
                <div className="mt-6">
                    <h4 className="text-sm font-medium mb-3">{tr("Company Breakdown")}</h4>
                    <div className="space-y-2">
                        {chartData.map((company, index) => (
                            <div key={index} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: company.color }} />
                                    <span className="font-medium">{company.name}</span>
                                </div>
                                <div className="text-right">
                                    <div className="font-medium">{tr("{company} vehicles", { company: company.value })}</div>
                                    <div className="text-sm text-muted-foreground">{company.percentage}%</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
