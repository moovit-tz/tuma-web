/**
 * The words of every message Tuma sends (SMS, WhatsApp, email, push), in English and Swahili. HuduFeed delivers
 * finished text, so the template keys the services queue are turned into text here, at send time. Unknown keys and
 * missing variables never block a send: the key falls back to a plain line, and a missing {var} renders empty.
 */

type Lang = "en" | "sw";
type T = { title?: string; body: string };

const STATE: Record<string, Record<Lang, string>> = {
  CREATED: { en: "Booked", sw: "Kimesajiliwa" },
  AWAITING_HANDOVER: { en: "Waiting at the Tuma point", sw: "Kinasubiri kituoni" },
  RECEIVED: { en: "Received at the Tuma point", sw: "Kimepokelewa kituoni" },
  AT_HUB: { en: "At the office", sw: "Kiko ofisini" },
  IN_TRANSIT: { en: "On its way", sw: "Kiko njiani" },
  OUT_FOR_DELIVERY: { en: "Out for delivery", sw: "Kinaletwa kwako" },
  ATTEMPT_FAILED: { en: "Delivery attempt failed", sw: "Jaribio la kufikisha halikufanikiwa" },
  READY_FOR_COLLECTION: { en: "Ready to collect", sw: "Tayari kuchukuliwa" },
  DELIVERED: { en: "Delivered", sw: "Kimefikishwa" },
  RETURNING: { en: "Being returned", sw: "Kinarudishwa" },
  RETURNED: { en: "Returned to the sender", sw: "Kimerudishwa kwa mtumaji" },
  CANCELLED: { en: "Cancelled", sw: "Kimesitishwa" },
};

const TEMPLATES: Record<string, Record<Lang, T>> = {
  "parcel.received": {
    en: { body: "Tuma: parcel {waybill} for you was received and is on its way. Track: {track}" },
    sw: { body: "Tuma: kifurushi {waybill} chako kimepokelewa na kiko njiani. Fuatilia: {track}" },
  },
  "parcel.out_for_delivery": {
    en: { body: "Tuma: parcel {waybill} is out for delivery to you today. Keep your phone on." },
    sw: { body: "Tuma: kifurushi {waybill} kinaletwa kwako leo. Weka simu yako wazi." },
  },
  "parcel.attempt_failed": {
    en: { body: "Tuma: we couldn't deliver parcel {waybill}. We'll try again; call the Tuma point if you need to." },
    sw: { body: "Tuma: hatukuweza kufikisha kifurushi {waybill}. Tutajaribu tena; piga simu kituo cha Tuma ukihitaji." },
  },
  "parcel.ready": {
    en: { body: "Tuma: parcel {waybill} is ready to collect at {point}. Bring your ID and the code we send you." },
    sw: { body: "Tuma: kifurushi {waybill} kiko tayari kuchukuliwa {point}. Njoo na kitambulisho na namba tutakayokutumia." },
  },
  "parcel.delivered": {
    en: { body: "Tuma: parcel {waybill} was delivered. Thank you for using Tuma." },
    sw: { body: "Tuma: kifurushi {waybill} kimefikishwa. Asante kwa kutumia Tuma." },
  },
  "parcel.returned": {
    en: { body: "Tuma: parcel {waybill} was returned to the sender." },
    sw: { body: "Tuma: kifurushi {waybill} kimerudishwa kwa mtumaji." },
  },
  "parcel.receipt": {
    en: { body: "Tuma receipt: parcel {waybill} to {receiver}, TZS {amount} paid ({method}). Track: {track}" },
    sw: { body: "Risiti ya Tuma: kifurushi {waybill} kwa {receiver}, TZS {amount} kimelipwa ({method}). Fuatilia: {track}" },
  },
  "parcel.sent_to_you": {
    en: { body: "Tuma: {sender} sent you parcel {waybill}. Track it: {track}" },
    sw: { body: "Tuma: {sender} amekutumia kifurushi {waybill}. Fuatilia: {track}" },
  },
  "parcel.tracking_code": {
    en: { body: "Tuma: your code for parcel {waybill} is {code}. Give it only to the person handing it over." },
    sw: { body: "Tuma: namba yako ya kifurushi {waybill} ni {code}. Mpe tu anayekukabidhi kifurushi." },
  },
  "parcel.rate": {
    en: { body: "Tuma: how was {business} with parcel {waybill}? Rate them in 10 seconds: {link}" },
    sw: { body: "Tuma: {business} walikuhudumiaje kwa kifurushi {waybill}? Wape alama kwa sekunde 10: {link}" },
  },
  "kyb.received": {
    en: { body: "Tuma: we received the application for {business} (ref {ref}). We'll let you know when it's reviewed." },
    sw: { body: "Tuma: tumepokea maombi ya {business} (namba {ref}). Tutakujulisha yakishakaguliwa." },
  },
  "kyb.updated": {
    en: { body: "Tuma: your application {ref} is now {status}. {note}" },
    sw: { body: "Tuma: maombi yako {ref} sasa yako {status}. {note}" },
  },
  "support.case_received": {
    en: { body: "Tuma: we received your report (ref {ref}). We'll get back to you." },
    sw: { body: "Tuma: tumepokea taarifa yako (namba {ref}). Tutawasiliana nawe." },
  },
  "support.case_updated": {
    en: { body: "Tuma: your case {ref} is now {status}. {note}" },
    sw: { body: "Tuma: kesi yako {ref} sasa iko {status}. {note}" },
  },
  "team.invite": {
    en: { body: "Tuma: {inviter} invited {name} to join {business}. Accept: {link} or in the Tuma app enter code {code}" },
    sw: { body: "Tuma: {inviter} amemkaribisha {name} kujiunga na {business}. Kubali: {link} au kwenye programu ya Tuma weka namba {code}" },
  },

  /* ----- push (the app on the person's phone) ----- */
  "push.parcel_state": {
    en: { title: "Parcel {waybill}", body: "{stateLabel}" },
    sw: { title: "Kifurushi {waybill}", body: "{stateLabel}" },
  },
  "push.parcel_coming": {
    en: { title: "A parcel is coming to you", body: "{sender} sent you parcel {waybill}." },
    sw: { title: "Una kifurushi kinakuja", body: "{sender} amekutumia kifurushi {waybill}." },
  },
  "push.booked_here": {
    en: { title: "New parcel booked at {point}", body: "{sender} is bringing parcel {waybill} for {receiver}." },
    sw: { title: "Kifurushi kipya kimesajiliwa {point}", body: "{sender} analeta kifurushi {waybill} kwa {receiver}." },
  },
  "push.wallet_topup": {
    en: { title: "Wallet topped up", body: "TZS {amount} is in your Tuma wallet. Balance: TZS {balance}." },
    sw: { title: "Pochi imeongezwa", body: "TZS {amount} imeingia kwenye pochi yako ya Tuma. Salio: TZS {balance}." },
  },
  "push.wallet_paid": {
    en: { title: "Paid from your wallet", body: "TZS {amount} for parcel {waybill}. Balance: TZS {balance}." },
    sw: { title: "Imelipwa kutoka pochi", body: "TZS {amount} kwa kifurushi {waybill}. Salio: TZS {balance}." },
  },
  "push.momo_setup": {
    en: { title: "Set up mobile money", body: "{name} wants to take mobile money at the counter. Turn it on in Payments." },
    sw: { title: "Weka pesa kwa simu", body: "{name} anataka kupokea malipo kwa simu kaunta. Iwashe kwenye Malipo." },
  },
  "push.wallet_refund": {
    en: { title: "Refund to your wallet", body: "TZS {amount} for cancelled parcel {waybill} is back in your wallet." },
    sw: { title: "Umerudishiwa pesa", body: "TZS {amount} ya kifurushi {waybill} kilichositishwa imerudi kwenye pochi yako." },
  },
};

export const stateLabel = (state: string, lang: string) => STATE[state]?.[lang === "sw" ? "sw" : "en"] ?? state;

/** Finished text for one message. */
export function render(template: string, language: string | null | undefined, vars: Record<string, unknown> = {}): { title: string; body: string } {
  const lang: Lang = language === "sw" ? "sw" : "en";
  const t = TEMPLATES[template]?.[lang];
  const v: Record<string, unknown> = { ...vars, stateLabel: typeof vars.state === "string" ? stateLabel(vars.state, lang) : vars.stateLabel };
  const fill = (s: string) =>
    s
      .replace(/\{(\w+)\}/g, (_, k: string) => (v[k] == null ? "" : String(v[k])))
      .replace(/\s{2,}/g, " ")
      .trim();
  if (!t) return { title: "Tuma", body: fill(`Tuma: ${template}${vars.waybill ? " {waybill}" : ""}`) };
  return { title: fill(t.title ?? "Tuma"), body: fill(t.body) };
}

export const knownTemplate = (template: string) => template in TEMPLATES;
