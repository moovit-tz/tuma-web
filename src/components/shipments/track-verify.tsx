"use client";
import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n";
import { requestOtpAction, verifyOtpAction } from "@/app/actions/tracking";

/**
 * Receiver check: enter the code from the SMS sent when the parcel was booked.
 * "Send a new code" is only a fallback when the SMS is lost.
 */
export function TrackVerify({ waybill, maskedPhone, devCode: initialDevCode }: { waybill: string; maskedPhone: string; devCode?: string }) {
  const { dict } = useI18n();
  const t = dict.track.otp;
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState(initialDevCode);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [pending, start] = useTransition();
  const [resending, startResend] = useTransition();

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const verify = () =>
    start(async () => {
      setError(null);
      const r = await verifyOtpAction(waybill, code);
      if (!r.ok) setError(r.error === "invalid" ? t.invalid : r.error === "expired" ? t.expired : t.locked);
    });

  const resend = () =>
    startResend(async () => {
      setError(null);
      const r = await requestOtpAction(waybill);
      if (!r.ok) {
        setError(r.error === "wait" ? fmt(t.wait, { s: r.retryInSec ?? 60 }) : r.error === "too_many" ? t.tooMany : dict.track.notFound);
        if (r.error === "wait") setCountdown(r.retryInSec ?? 60);
        return;
      }
      setNotice(fmt(t.sentTo, { phone: r.maskedPhone }));
      setDevCode(r.devCode);
      setCountdown(r.resendInSec);
      setCode("");
    });

  return (
    <form
      className="mt-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === 6) verify();
      }}
    >
      <label htmlFor="otp" className="text-muted-foreground block text-[12.5px] leading-snug">
        {fmt(t.body, { phone: maskedPhone })}
      </label>
      <div className="mt-2.5 flex gap-2">
        <input
          id="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="••••••"
          aria-invalid={!!error}
          className="bg-background focus-visible:border-ring aria-[invalid=true]:border-destructive h-10 min-w-0 flex-1 rounded-md border px-3 text-center font-mono text-lg tracking-[0.4em] outline-none"
        />
        <button disabled={pending || code.length !== 6} className="bg-primary text-primary-foreground h-10 rounded-md px-4 text-sm font-medium disabled:opacity-50">
          {pending ? <Loader2 className="size-4 animate-spin" /> : t.verify}
        </button>
      </div>
      {devCode && (
        <p className="border-warn/40 bg-warn/10 text-warn mt-2 rounded-md border px-2.5 py-1.5 text-[12px]">
          {t.dev} <span className="font-mono font-semibold tracking-widest">{devCode}</span>
        </p>
      )}
      {notice && !error && <p className="text-ok mt-2 text-[12.5px]">{notice}</p>}
      {error && (
        <p role="alert" className="text-destructive mt-2 text-[12.5px]">
          {error}
        </p>
      )}
      <p className="text-muted-foreground mt-2 text-[12.5px]">
        {t.changed}{" "}
        {countdown > 0 ? (
          <span>{fmt(t.resendIn, { s: countdown })}</span>
        ) : (
          <button type="button" onClick={resend} disabled={resending} className="text-foreground underline underline-offset-4 disabled:opacity-60">
            {t.resend}
          </button>
        )}
      </p>
    </form>
  );
}
