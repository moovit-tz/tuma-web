export type DateRange = "today" | "7d" | "30d" | "overall";

export interface PerformanceMetrics {
    score: number;
    totalParcels: number;
    revenue: number;
    growthPercent: number;
    activeAgents: number;
    activeOffices: number;
    trend: number[]; // 7 data points for mini sparkline/chart
    consistency: number; // 0-100%
    lastActiveHoursText: string;
    statusLabel: "Top Performer" | "Stable" | "Underperforming" | "At Risk";
    statusColor: string;
}

// Simple deterministic hash based on a string
function hashStr(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

export function generatePerformanceMetrics(id: string | number, range: DateRange, entityType: 'country' | 'region' | 'district' | 'office'): PerformanceMetrics {
    const seed = hashStr(`${entityType}-${id}`);
    
    // Base multipliers
    const typeM = entityType === 'country' ? 100 : entityType === 'region' ? 20 : entityType === 'district' ? 5 : 1;
    const rangeM = range === 'today' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 180;
    
    const baseP = 50 + (seed % 150); // 50 to 200 parcels baseline
    const totalParcels = Math.floor(baseP * typeM * rangeM * (0.8 + (seed % 40) / 100)); // +/- 20%
    const revenue = Math.floor(totalParcels * (15000 + (seed % 10000))); // 15k to 25k per parcel average
    
    const isGrowing = (seed % 10) > 3; // 70% chance of growing
    const rawGrowth = (seed % 45) + (isGrowing ? 5 : -25);
    const growthPercent = range === 'overall' ? 0 : rawGrowth;
    
    const baseScore = 60 + (seed % 35) + (isGrowing ? 5 : -10); // 50 to 100
    const score = Math.max(0, Math.min(100, Math.floor(baseScore)));
    
    const trend = Array.from({ length: 7 }).map((_, i) => {
        return Math.max(10, Math.floor((totalParcels / 10) * (0.5 + Math.abs(hashStr(`${seed}-${i}`) % 100) / 100)));
    });
    
    const consistency = 50 + (seed % 50);
    const lastActiveHours = seed % 48;
    const lastActiveHoursText = lastActiveHours === 0 ? "Just now" : lastActiveHours < 24 ? `${lastActiveHours}h ago` : `${Math.floor(lastActiveHours/24)}d ago`;

    let statusLabel: PerformanceMetrics["statusLabel"] = "Stable";
    let statusColor = "bg-blue-500";
    
    if (score >= 85) {
        statusLabel = "Top Performer";
        statusColor = "text-emerald-500 bg-emerald-500/10";
    } else if (score < 50 || (range === 'today' && lastActiveHours > 24)) {
        statusLabel = "At Risk";
        statusColor = "text-red-500 bg-red-500/10";
    } else if (score < 65) {
        statusLabel = "Underperforming";
        statusColor = "text-amber-500 bg-amber-500/10";
    } else {
        statusLabel = "Stable";
        statusColor = "text-blue-500 bg-blue-500/10";
    }

    return {
        score,
        totalParcels,
        revenue,
        growthPercent,
        activeAgents: entityType === 'country' ? 100 + (seed % 200) : entityType === 'region' ? 20 + (seed%50) : entityType === 'district' ? 5 + (seed%15) : 1 + (seed%5),
        activeOffices: entityType === 'country' ? 20 + (seed % 50) : entityType === 'region' ? 5 + (seed%15) : entityType === 'district' ? 1 + (seed%5) : 1,
        trend,
        consistency,
        lastActiveHoursText,
        statusLabel,
        statusColor
    };
}
