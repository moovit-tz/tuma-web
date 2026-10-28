/**
 * Logo utilities for PDF reports
 * This file contains functions to generate and embed logos in PDF documents
 */

// Create a simple circular logo with initials
export function createSimpleLogo(): string {
    // Create an SVG logo
    const svg = `
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="#3B82F6" stroke="#1E40AF" stroke-width="2"/>
            <text x="20" y="26" font-family="Arial, sans-serif" font-size="14" font-weight="bold" 
                  text-anchor="middle" fill="white">MS</text>
        </svg>
    `
    
    // Convert SVG to data URL
    return `data:image/svg+xml;base64,${btoa(svg)}`
}

// Create a more elaborate company logo
export function createCompanyLogo(): string {
    const svg = `
        <svg width="120" height="40" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
            <!-- Background -->
            <rect x="0" y="0" width="120" height="40" rx="4" fill="#3B82F6"/>
            
            <!-- Icon -->
            <circle cx="20" cy="20" r="12" fill="#1E40AF"/>
            <path d="M15 20 L18 17 L25 24" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
            
            <!-- Text -->
            <text x="38" y="16" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="white">MySafari</text>
            <text x="38" y="28" font-family="Arial, sans-serif" font-size="8" fill="#E0E7FF">PARCEL</text>
        </svg>
    `
    
    return `data:image/svg+xml;base64,${btoa(svg)}`
}

// Get the appropriate logo based on context
export function getCompanyLogo(type: 'simple' | 'full' = 'simple'): string {
    return type === 'simple' ? createSimpleLogo() : createCompanyLogo()
}

// Convert data URL to base64 for jsPDF
export function getLogoForPDF(type: 'simple' | 'full' = 'simple'): string {
    const logoDataUrl = getCompanyLogo(type)
    // Extract just the base64 part
    return logoDataUrl.split(',')[1]
}

// Direct PDF logo drawing function (no SVG dependency)
export function drawCompanyLogoDirect(doc: any, x: number, y: number, width: number, height: number): void {
    try {
        // Draw background rectangle
        doc.setFillColor(59, 130, 246) // Blue background
        doc.rect(x, y, width, height, 'F')
        
        // Draw icon circle
        const circleX = x + height * 0.5
        const circleY = y + height * 0.5
        const circleRadius = height * 0.3
        
        doc.setFillColor(30, 64, 175) // Darker blue
        doc.circle(circleX, circleY, circleRadius, 'F')
        
        // Draw checkmark
        doc.setDrawColor(255, 255, 255)
        doc.setLineWidth(1.5)
        const checkStartX = circleX - circleRadius * 0.3
        const checkStartY = circleY
        const checkMidX = circleX - circleRadius * 0.1
        const checkMidY = circleY + circleRadius * 0.2
        const checkEndX = circleX + circleRadius * 0.3
        const checkEndY = circleY - circleRadius * 0.2
        
        doc.line(checkStartX, checkStartY, checkMidX, checkMidY)
        doc.line(checkMidX, checkMidY, checkEndX, checkEndY)
        
        // Draw company name
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(height * 0.3)
        doc.setFont('helvetica', 'bold')
        const textX = x + height + 4
        const textY = y + height * 0.4
        doc.text('MySafari', textX, textY)
        
        // Draw "PARCEL" subtitle
        doc.setFontSize(height * 0.2)
        doc.setTextColor(224, 231, 255) // Light blue
        doc.text('PARCEL', textX, textY + height * 0.3)
        
    } catch (error) {
        console.warn('Error drawing logo directly, using simple fallback:', error)
        // Simple fallback - just draw a blue circle with "MS"
        doc.setFillColor(59, 130, 246)
        doc.circle(x + width * 0.2, y + height * 0.5, height * 0.3, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(height * 0.25)
        doc.setFont('helvetica', 'bold')
        doc.text('MS', x + width * 0.15, y + height * 0.55)
    }
}
