import Image from "next/image"
import { useTr } from "@/lib/i18n/portal"

export function Logo() {
    const tr = useTr()
    return (
        <div className="flex items-center justify-center w-full">
            <div className="rounded-full overflow-hidden">
                <Image src="/logo.png" alt={tr("mysafari Parcel Logo")} width={140} height={20} />
            </div>
        </div>
    )
}
