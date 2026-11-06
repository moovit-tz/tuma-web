/**
 * The legal documents, shared by the web pages and the Tuma app (GET /api/app/legal/[doc]). DRAFTS for legal to
 * complete: terms depend on open question Q10; privacy follows SRS 10.2–10.3 and the Personal Data Protection Act, 2022.
 */
export type LegalSection = { h: string; p: string[] };
export type LegalDocument = { updated: string; sections: LegalSection[] };

export const TERMS: LegalDocument = {
  updated: "1 November 2026",
  sections: [
        { h: "Who we are", p: ["Tuma is a parcel and cargo service operated by Moovit in the United Republic of Tanzania. These terms apply when you send, receive or track goods with Tuma, or use the Tuma website, merchant portal or API."] },
        { h: "The waybill", p: ["Every shipment travels on one waybill number. The waybill records the sender, the receiver, the goods, the service and the charges, and is the reference for tracking, billing and claims."] },
        { h: "What you may send", p: ["You must describe the goods accurately and confirm they contain no prohibited items, including weapons, illegal drugs, flammable or explosive materials, cash and live animals. We may open, hold or refuse any item we reasonably believe breaks these rules or the law."] },
        { h: "Prices and payment", p: ["We quote the price before you confirm an order, based on the route, chargeable weight, service level and any cash-on-delivery or cover options. If the weight or size measured at handover differs from what you declared, we may re-price the shipment and will tell you."] },
        { h: "Cash on delivery", p: ["When you choose cash on delivery we collect the stated amount from the receiver and remit it to you under your account agreement, less agreed fees."] },
        { h: "Delivery, failed attempts and returns", p: ["We will try to deliver up to three times or hold the parcel at a Wakala point for collection. If delivery is not possible, the parcel is returned to the sender under a linked return waybill and return charges may apply."] },
        { h: "Cancellation", p: ["You can cancel without a fee until the parcel is first handed over to us. After that, a cancellation fee applies."] },
        { h: "Loss, damage and claims", p: ["Report loss or damage as soon as possible, and within the claim period stated in your agreement. Our liability limits and declared-value cover are set out in the schedule to these terms."] },
        { h: "Changes and contact", p: ["We may update these terms and will publish the date of the latest version here. Questions: support@tuma.co.tz."] }
  ],
};

export const PRIVACY: LegalDocument = {
  updated: "1 November 2026",
  sections: [
        { h: "Scope", p: ["This policy explains how Moovit handles personal data in Tuma, under the Personal Data Protection Act, 2022 of Tanzania."] },
        { h: "What we collect", p: ["For senders and receivers: name, phone number, email if given, delivery address, landmark or map pin, and language preference. For deliveries: scan events, delivery proof such as a one-time code, signature or photo, and the time and place of handover. For riders and drivers: location while on duty only."] },
        { h: "Why we use it", p: ["To deliver and track shipments, send delivery messages, collect cash on delivery, handle claims and complaints, meet legal and tax duties, and improve the service. We record the purpose and legal basis for processing receiver data."] },
        { h: "Who we share it with", p: ["With the merchant who sent your parcel, the riders, agents and carriers who handle it, and Moovit systems that provide sign-in, customer service, messaging and finance. We do not sell personal data."] },
        { h: "How we protect it", p: ["Phone numbers and names are masked on the public tracking page, in shared links and in logs. Full receiver details on the tracking page need the last four digits of the receiver's phone. Data is encrypted in transit and at rest."] },
        { h: "How long we keep it", p: ["Waybills, events and charges: 7 years. Delivery photos and signatures: 3 years. Detailed GPS history: 13 months. Message logs: 13 months. Receiver personal data on closed waybills is anonymised after 24 months."] },
        { h: "Your rights", p: ["You may ask to see, correct or delete your personal data, subject to legal retention duties. Write to privacy@tuma.co.tz or use the contact page."] }
  ],
};

export const LEGAL = { terms: TERMS, privacy: PRIVACY } as const;
export type LegalKey = keyof typeof LEGAL;
