import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { FloatTransaction, TransactionStats, PaymentProvider } from '@/lib/services/float-transactions'
import { formatTZS, getProviderName, formatStatus } from '@/lib/services/float-transactions'
import { format } from 'date-fns'
import { getCompanyLogo, drawCompanyLogoDirect } from './logo-utils'

// Extend jsPDF type to include autoTable and lastAutoTable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF
        lastAutoTable: {
            finalY: number
        }
    }
}

export interface TransactionReportData {
    transactions: FloatTransaction[]
    stats: TransactionStats
    providers: PaymentProvider[]
    filters?: {
        searchQuery?: string
        statusFilter?: string
        providerFilter?: string
        dateRange?: {
            from: Date
            to: Date
        }
    }
}

export interface ReportConfig {
    companyName: string
    companyAddress: string
    companyPhone: string
    companyEmail: string
    logoUrl?: string
    reportTitle: string
    includeFilters: boolean
    includeCharts: boolean
}

const defaultConfig: ReportConfig = {
    companyName: 'MySafari Parcel',
    companyAddress: 'Dar es Salaam, Tanzania',
    companyPhone: '',
    companyEmail: '',
    reportTitle: 'Float Transactions Report',
    includeFilters: true,
    includeCharts: false,
}

export class TransactionsPDFReportGenerator {
    private doc: jsPDF
    private pageWidth: number
    private pageHeight: number
    private margin: number = 20
    private currentY: number = 0

    constructor(private config: ReportConfig = defaultConfig) {
        this.doc = new jsPDF()
        this.pageWidth = this.doc.internal.pageSize.getWidth()
        this.pageHeight = this.doc.internal.pageSize.getHeight()
        this.currentY = this.margin
    }

    private async convertSvgToPng(svgDataUrl: string, width: number, height: number): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                const img = new Image()
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas')
                        canvas.width = width
                        canvas.height = height
                        const ctx = canvas.getContext('2d')
                        
                        if (ctx) {
                            // Set transparent background
                            ctx.clearRect(0, 0, width, height)
                            
                            // Draw the image
                            ctx.drawImage(img, 0, 0, width, height)
                            
                            // Convert to PNG data URL
                            const pngDataUrl = canvas.toDataURL('image/png')
                            resolve(pngDataUrl)
                        } else {
                            reject(new Error('Could not get canvas context'))
                        }
                    } catch (canvasError) {
                        reject(new Error(`Canvas error: ${canvasError instanceof Error ? canvasError.message : 'Unknown canvas error'}`))
                    }
                }
                img.onerror = (error) => reject(new Error(`Could not load SVG image: ${error}`))
                
                // Set crossOrigin to avoid CORS issues
                img.crossOrigin = 'anonymous'
                img.src = svgDataUrl
                
                // Add timeout to prevent hanging
                setTimeout(() => {
                    reject(new Error('SVG to PNG conversion timed out'))
                }, 5000)
            } catch (error) {
                reject(new Error(`SVG conversion setup error: ${error instanceof Error ? error.message : 'Unknown error'}`))
            }
        })
    }

    generateReport(data: TransactionReportData): void {
        // Add header
        this.addHeader()
        
        // Add report title and date
        this.addReportTitle()
        
        // Add filters information if enabled
        if (this.config.includeFilters && data.filters) {
            this.addFiltersSection(data.filters, data.providers)
        }
        
        // Add summary statistics
        this.addSummaryStats(data.stats)
        
        // Add status breakdown
        this.addStatusBreakdown(data.stats)
        
        // Check if we need a new page before the transactions table
        if (this.currentY > this.pageHeight - 100) {
            this.addNewPage()
        }
        
        // Add transactions table
        this.addTransactionsTable(data.transactions, data.providers)
        
        // Add footer to all pages
        this.addFooterToAllPages()
    }

    private addHeader(): void {
        // Company logo - use direct drawing method (no async needed)
        try {
            drawCompanyLogoDirect(this.doc, 20, 15, 40, 13)
        } catch (error) {
            // Simple fallback to basic logo
            console.warn('Could not draw logo directly, using simple fallback:', error)
            this.doc.setFillColor(59, 130, 246) // Blue color
            this.doc.circle(35, 25, 10, 'F')
            this.doc.setTextColor(255, 255, 255)
            this.doc.setFontSize(10)
            this.doc.setFont('helvetica', 'bold')
            this.doc.text('MS', 31, 28)
        }

        // Company information
        this.doc.setTextColor(0, 0, 0)
        this.doc.setFontSize(18)
        this.doc.setFont('helvetica', 'bold')
        this.doc.text(this.config.companyName, 70, 22)
        
        this.doc.setFontSize(10)
        this.doc.setFont('helvetica', 'normal')
        this.doc.text(this.config.companyAddress, 70, 30)
        // Only print contact lines that were actually provided
        if (this.config.companyPhone) this.doc.text(`Tel: ${this.config.companyPhone}`, 70, 36)
        if (this.config.companyEmail) this.doc.text(`Email: ${this.config.companyEmail}`, 70, 42)
        
        // Add a line separator
        this.doc.setDrawColor(200, 200, 200)
        this.doc.line(this.margin, 50, this.pageWidth - this.margin, 50)
        
        this.currentY = 60
    }

    private addReportTitle(): void {
        this.doc.setFontSize(16)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(0, 0, 0)
        
        const title = this.config.reportTitle
        const titleWidth = this.doc.getTextWidth(title)
        const titleX = (this.pageWidth - titleWidth) / 2
        
        this.doc.text(title, titleX, this.currentY)
        this.currentY += 15
        
        // Add generation date
        this.doc.setFontSize(10)
        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(100, 100, 100)
        
        const generatedText = `Generated on: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`
        const dateWidth = this.doc.getTextWidth(generatedText)
        const dateX = (this.pageWidth - dateWidth) / 2
        
        this.doc.text(generatedText, dateX, this.currentY)
        this.currentY += 20
    }

    private addFiltersSection(filters: TransactionReportData['filters'], providers: PaymentProvider[]): void {
        if (!filters) return

        const hasActiveFilters = filters.searchQuery || 
                                filters.statusFilter !== 'all' || 
                                filters.providerFilter !== 'all' ||
                                filters.dateRange

        if (!hasActiveFilters) return

        this.doc.setFontSize(12)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(0, 0, 0)
        this.doc.text('Report Filters', this.margin, this.currentY)
        this.currentY += 10

        this.doc.setFontSize(10)
        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(60, 60, 60)

        if (filters.searchQuery) {
            this.doc.text(`Search Query: "${filters.searchQuery}"`, this.margin + 10, this.currentY)
            this.currentY += 8
        }

        if (filters.statusFilter && filters.statusFilter !== 'all') {
            this.doc.text(`Status Filter: ${formatStatus(filters.statusFilter)}`, this.margin + 10, this.currentY)
            this.currentY += 8
        }

        if (filters.providerFilter && filters.providerFilter !== 'all') {
            const providerName = getProviderName(parseInt(filters.providerFilter), providers)
            this.doc.text(`Provider Filter: ${providerName}`, this.margin + 10, this.currentY)
            this.currentY += 8
        }

        if (filters.dateRange) {
            const fromDate = format(filters.dateRange.from, 'MMM dd, yyyy')
            const toDate = format(filters.dateRange.to, 'MMM dd, yyyy')
            this.doc.text(`Date Range: ${fromDate} - ${toDate}`, this.margin + 10, this.currentY)
            this.currentY += 8
        }

        this.currentY += 10
    }

    private addSummaryStats(stats: TransactionStats): void {
        this.doc.setFontSize(14)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(0, 0, 0)
        this.doc.text('Summary Statistics', this.margin, this.currentY)
        this.currentY += 15

        // Create a summary stats table
        const summaryData = [
            ['Total Transactions', (stats.totalTransactions ?? 0).toLocaleString()],
            ['Total Amount', formatTZS(stats.totalAmount ?? 0)],
            ['Average Amount', formatTZS(stats.averageAmount ?? 0)],
            ['Today\'s Transactions', (stats.todayTransactions ?? 0).toString()],
            ['Today\'s Amount', formatTZS(stats.todayAmount ?? 0)],
            ['Total Fees', formatTZS(stats.totalFees ?? 0)]
        ]

        const summaryTableResult = autoTable(this.doc, {
            head: [['Metric', 'Value']],
            body: summaryData,
            startY: this.currentY,
            margin: { left: this.margin, right: this.margin },
            styles: {
                fontSize: 10,
                cellPadding: 5,
            },
            headStyles: {
                fillColor: [59, 130, 246],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245],
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 80 },
                1: { halign: 'right', cellWidth: 60 }
            }
        })

        // Update currentY based on table result or fallback to lastAutoTable
        this.currentY = ((this.doc as any).lastAutoTable?.finalY || (this.doc as any).autoTable?.previous?.finalY || this.currentY + 100) + 20
    }

    private addStatusBreakdown(stats: TransactionStats): void {
        this.doc.setFontSize(14)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(0, 0, 0)
        this.doc.text('Status Breakdown', this.margin, this.currentY)
        this.currentY += 15

        const statusData = [
            ['Paid', (stats.paidCount ?? 0).toLocaleString(), formatTZS(stats.totalPaidAmount ?? 0)],
            ['Pending', (stats.pendingCount ?? 0).toLocaleString(), formatTZS(stats.totalPendingAmount ?? 0)],
            ['Failed', (stats.failedCount ?? 0).toLocaleString(), formatTZS(stats.totalFailedAmount ?? 0)]
        ]

        const statusTableResult = autoTable(this.doc, {
            head: [['Status', 'Count', 'Total Amount']],
            body: statusData,
            startY: this.currentY,
            margin: { left: this.margin, right: this.margin },
            styles: {
                fontSize: 10,
                cellPadding: 5,
            },
            headStyles: {
                fillColor: [59, 130, 246],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245],
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 50 },
                1: { halign: 'center', cellWidth: 50 },
                2: { halign: 'right', cellWidth: 70 }
            },
            didParseCell: function(data: any) {
                // Color code the status rows
                if (data.section === 'body') {
                    const status = data.cell.raw
                    if (data.column.index === 0) {
                        switch (status) {
                            case 'Paid':
                                data.cell.styles.textColor = [34, 197, 94] // Green
                                break
                            case 'Pending':
                                data.cell.styles.textColor = [245, 158, 11] // Yellow
                                break
                            case 'Failed':
                                data.cell.styles.textColor = [239, 68, 68] // Red
                                break
                        }
                    }
                }
            }
        })

        // Update currentY based on table result or fallback
        this.currentY = ((this.doc as any).lastAutoTable?.finalY || (this.doc as any).autoTable?.previous?.finalY || this.currentY + 100) + 20
    }

    private addTransactionsTable(transactions: FloatTransaction[], providers: PaymentProvider[]): void {
        if (transactions.length === 0) {
            this.doc.setFontSize(12)
            this.doc.setTextColor(100, 100, 100)
            this.doc.text('No transactions to display', this.margin, this.currentY)
            return
        }

        this.doc.setFontSize(14)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(0, 0, 0)
        this.doc.text('Transaction Details', this.margin, this.currentY)
        this.currentY += 15

        const tableData = transactions.map(transaction => [
            transaction.transactionReference ?? 'N/A',
            transaction.user?.fullName || transaction.user?.username || 'Unknown',
            transaction.phoneNumber ?? 'N/A',
            formatTZS(parseInt(transaction.amount) || 0),
            getProviderName(transaction.providerId, providers) || 'Unknown',
            formatStatus(transaction.status) || 'Unknown',
            transaction.createdAt ? format(new Date(transaction.createdAt), 'MMM dd, yyyy HH:mm') : 'N/A'
        ])

        autoTable(this.doc, {
            head: [['Transaction ID', 'User', 'Phone', 'Amount', 'Provider', 'Status', 'Date']],
            body: tableData,
            startY: this.currentY,
            margin: { left: this.margin, right: this.margin },
            styles: {
                fontSize: 8,
                cellPadding: 3,
            },
            headStyles: {
                fillColor: [59, 130, 246],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9,
            },
            alternateRowStyles: {
                fillColor: [249, 249, 249],
            },
            columnStyles: {
                0: { cellWidth: 35, fontSize: 7 }, // Transaction ID
                1: { cellWidth: 25 }, // User
                2: { cellWidth: 20 }, // Phone
                3: { halign: 'right', cellWidth: 25 }, // Amount
                4: { cellWidth: 20 }, // Provider
                5: { halign: 'center', cellWidth: 18 }, // Status
                6: { cellWidth: 25, fontSize: 7 } // Date
            },
            didParseCell: function(data: any) {
                // Color code the status column
                if (data.section === 'body' && data.column.index === 5) {
                    const status = data.cell.raw
                    switch (status) {
                        case 'Paid':
                            data.cell.styles.textColor = [34, 197, 94] // Green
                            data.cell.styles.fontStyle = 'bold'
                            break
                        case 'Pending':
                            data.cell.styles.textColor = [245, 158, 11] // Yellow
                            data.cell.styles.fontStyle = 'bold'
                            break
                        case 'Failed':
                            data.cell.styles.textColor = [239, 68, 68] // Red
                            data.cell.styles.fontStyle = 'bold'
                            break
                    }
                }
            }
        })
    }

    private addNewPage(): void {
        this.doc.addPage()
        this.currentY = this.margin
        this.addHeader()
    }

    private addFooterToAllPages(): void {
        const pageCount = this.doc.getNumberOfPages()
        
        for (let i = 1; i <= pageCount; i++) {
            this.doc.setPage(i)
            
            // Add page numbers
            this.doc.setFontSize(8)
            this.doc.setFont('helvetica', 'normal')
            this.doc.setTextColor(100, 100, 100)
            
            const pageText = `Page ${i} of ${pageCount}`
            const pageTextWidth = this.doc.getTextWidth(pageText)
            this.doc.text(pageText, this.pageWidth - this.margin - pageTextWidth, this.pageHeight - 15)
            
            // Add generation timestamp
            const timestamp = `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`
            this.doc.text(timestamp, this.margin, this.pageHeight - 15)
            
            // Add company name in footer
            const footerText = `© ${new Date().getFullYear()} ${this.config.companyName}. All rights reserved.`
            const footerWidth = this.doc.getTextWidth(footerText)
            const footerX = (this.pageWidth - footerWidth) / 2
            this.doc.text(footerText, footerX, this.pageHeight - 8)
        }
    }

    public getDocument(): jsPDF {
        return this.doc
    }

    public save(filename?: string): void {
        const defaultFilename = `transactions-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`
        this.doc.save(filename || defaultFilename)
    }

    public getBlob(): Blob {
        return this.doc.output('blob')
    }

    public getDataUrl(): string {
        return this.doc.output('dataurlstring')
    }
}

// Helper function to generate and download transaction report
export function generateTransactionReport(
    data: TransactionReportData,
    config?: Partial<ReportConfig>
): void {
    const reportConfig = { ...defaultConfig, ...config }
    const generator = new TransactionsPDFReportGenerator(reportConfig)
    
    generator.generateReport(data)
    generator.save()
}

// Helper function to get report data from current state
export function prepareReportData(
    transactions: FloatTransaction[],
    stats: TransactionStats,
    providers: PaymentProvider[],
    filters?: {
        searchQuery?: string
        statusFilter?: string
        providerFilter?: string
    }
): TransactionReportData {
    return {
        transactions,
        stats,
        providers,
        filters
    }
}
