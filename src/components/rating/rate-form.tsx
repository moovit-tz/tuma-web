"use client";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { rateAction } from "@/app/actions/rating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const ISSUES = ["late", "damaged", "missing", "rude", "overcharged", "other"] as const;

/** Stars, what went wrong when it's three or fewer, a comment, and send. Once. */
export function RateForm({ token }: { token: string }) {
  const { dict } = useI18n();
  const t = dict.rate;
  const [stars, setStars] = useState(0);
  const [issue, setIssue] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done)
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="size-12 text-emerald-600" aria-hidden />
        <p className="text-lg font-semibold">{t.thanks}</p>
        <p className="text-muted-foreground text-sm">{t.thanksSub}</p>
      </div>
    );

  const send = () => {
    if (!stars) return setError(t.pickStars);
    setError(null);
    start(async () => {
      const r = await rateAction(token, { stars, ...(stars <= 3 && issue ? { issue } : {}), ...(comment.trim() ? { comment: comment.trim() } : {}) });
      if (r.ok) setDone(true);
      else setError(r.error === "rated" ? t.rated : r.error === "expired" ? t.expired : r.error === "not_found" ? t.notFound : t.failed);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-center gap-2" role="radiogroup" aria-label={t.title}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={stars === n}
              aria-label={`${n} – ${t.stars[n - 1]}`}
              onClick={() => setStars(n)}
              className="rounded-md p-1 transition-transform hover:scale-110 focus-visible:outline-2"
            >
              <Star className={cn("size-10", n <= stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} aria-hidden />
            </button>
          ))}
        </div>
        <p className="text-muted-foreground mt-2 h-5 text-center text-sm">{stars ? t.stars[stars - 1] : ""}</p>
      </div>
      {stars > 0 && stars <= 3 && (
        <div>
          <p className="mb-2 text-sm font-medium">{t.whatWrong}</p>
          <div className="flex flex-wrap gap-2">
            {ISSUES.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setIssue(issue === k ? null : k)}
                className={cn("rounded-full border px-3 py-1.5 text-sm", issue === k ? "border-foreground bg-foreground text-background" : "hover:bg-muted")}
              >
                {t.issues[k]}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label htmlFor="rate-comment" className="mb-2 block text-sm font-medium">
          {t.comment}
        </label>
        <Textarea id="rate-comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={300} rows={3} />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button onClick={send} disabled={pending} className="w-full" size="lg">
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden /> {t.sending}
          </>
        ) : (
          t.send
        )}
      </Button>
    </div>
  );
}
