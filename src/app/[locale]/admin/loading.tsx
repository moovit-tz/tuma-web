import { AdminPageLoader } from "@/components/admin/admin-page-loader"

// Any page in this portal without its own loading screen shows this while it loads
export default function Loading() {
    return <AdminPageLoader showCharts showTable={false} />
}
