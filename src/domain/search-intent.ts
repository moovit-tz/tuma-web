/**
 * Portal search — query understanding.
 *
 * Turns free text ("overdue invoices", "malori yenye bima iliyoisha", "colis livrés à Arusha") into
 * structured intents: what the user is looking for (entity), which subset (filter), where (place) and
 * whether they want to do something (action). Works in English, Swahili and French with typo tolerance.
 *
 * Deterministic and dependency-free so it runs on every keystroke. The interface (interpret → Intent[])
 * is the seam where an LLM interpreter can be added later for open-ended questions.
 */
import { COUNTRIES } from "./countries";
import { TZ_REGIONS } from "./pricing";

export type Entity = "shipments" | "cargo" | "invoices" | "payments" | "vehicles" | "clients" | "exceptions" | "roles" | "team";
export type Filter =
  | "delivered"
  | "transit"
  | "failed"
  | "out_for_delivery"
  | "awaiting"
  | "at_hub"
  | "returned"
  | "cancelled"
  | "collection"
  | "overdue"
  | "unpaid"
  | "paid"
  | "unmatched"
  | "expired"
  | "available"
  | "maintenance"
  | "on_trip"
  | "at_risk";
export type Action = "new_shipment" | "new_invoice" | "record_payment" | "add_vehicle" | "add_client" | "new_role" | "add_member" | "track";

/** Phrases (any language) → concept. Multi-word phrases are matched before single words. */
const ENTITY: Record<Entity, string[]> = {
  shipments: ["shipment", "shipments", "parcel", "parcels", "package", "packages", "order", "orders", "waybill", "waybills", "delivery", "deliveries", "kifurushi", "vifurushi", "usafirishaji", "oda", "colis", "envoi", "envois", "commande", "commandes", "livraison", "livraisons", "bordereau"],
  cargo: ["cargo", "freight", "load", "loads", "consignment", "mzigo", "mizigo", "fret", "marchandise", "marchandises", "chargement"],
  invoices: ["invoice", "invoices", "bill", "bills", "billing", "receivable", "receivables", "ankara", "bili", "facture", "factures", "facturation"],
  payments: ["payment", "payments", "receipt", "receipts", "money received", "malipo", "risiti", "paiement", "paiements", "reglement", "encaissement"],
  vehicles: ["vehicle", "vehicles", "truck", "trucks", "lorry", "lorries", "van", "vans", "fleet", "motorbike", "trailer", "driver", "drivers", "gari", "magari", "lori", "malori", "pikipiki", "dereva", "camion", "camions", "vehicule", "vehicules", "flotte", "chauffeur"],
  clients: ["client", "clients", "customer", "customers", "account", "accounts", "mteja", "wateja", "compte"],
  exceptions: ["exception", "exceptions", "issue", "issues", "problem", "problems", "incident", "incidents", "tatizo", "matatizo", "probleme", "problemes"],
  roles: ["role", "roles", "permission", "permissions", "access", "nafasi", "ruhusa", "role", "roles", "acces", "droits"],
  team: ["team", "user", "users", "staff", "people", "member", "members", "employee", "timu", "mtumiaji", "watumiaji", "wafanyakazi", "equipe", "utilisateur", "utilisateurs", "personnel"],
};

const FILTER: Record<Filter, string[]> = {
  delivered: ["delivered", "completed", "done", "imefikishwa", "zimefikishwa", "vimefikishwa", "livre", "livres", "livrees", "livree"],
  transit: ["in transit", "transit", "on the road", "moving", "en route", "safarini", "njiani", "en transit", "en chemin"],
  failed: ["failed", "attempt failed", "missed", "not delivered", "undelivered", "imeshindikana", "jaribio limeshindikana", "haikufika", "echec", "echoue", "non livre"],
  out_for_delivery: ["out for delivery", "with rider", "inaletwa", "en cours de livraison"],
  awaiting: ["awaiting", "pending", "not picked up", "waiting", "not handed over", "inasubiri", "haijakabidhiwa", "en attente"],
  at_hub: ["at hub", "warehouse", "in warehouse", "kituoni", "ghalani", "ghala", "entrepot", "au hub"],
  returned: ["returned", "returning", "return", "imerudishwa", "inarudishwa", "retour", "retourne"],
  cancelled: ["cancelled", "canceled", "imeghairiwa", "annule", "annules"],
  collection: ["ready for collection", "pickup point", "collect", "wakala", "tayari kuchukuliwa", "pret a retirer", "point relais"],
  overdue: ["overdue", "late payment", "past due", "imepitwa", "zimepitwa", "zilizopitwa", "iliyopitwa", "imechelewa", "en retard", "echue", "echues", "impaye en retard"],
  unpaid: ["unpaid", "outstanding", "owing", "open", "due", "not paid", "haijalipwa", "hazijalipwa", "deni", "madeni", "zilizo wazi", "impaye", "impayes", "ouvert", "ouvertes", "a payer"],
  paid: ["paid", "settled", "imelipwa", "zimelipwa", "paye", "payee", "payees", "regle"],
  unmatched: ["unmatched", "unreconciled", "to reconcile", "not matched", "reconcile", "reconciliation", "hayajalinganishwa", "kulinganisha", "non rapproche", "rapprochement", "a rapprocher"],
  expired: ["expired", "expiring", "expiry", "insurance", "inspection", "compliance", "imeisha", "inaisha", "bima", "ukaguzi", "expire", "expiree", "assurance", "controle technique"],
  available: ["available", "free", "idle", "ready", "linapatikana", "yanapatikana", "wazi", "disponible", "disponibles", "libre"],
  maintenance: ["maintenance", "repair", "broken", "garage", "workshop", "matengenezo", "limeharibika", "en panne", "reparation", "entretien"],
  on_trip: ["on trip", "on a trip", "busy", "safarini", "en mission", "en course"],
  at_risk: ["at risk", "late", "delayed", "sla", "behind", "hatarini", "inachelewa", "en retard", "a risque", "retard"],
};

const ACTION: Record<Action, string[]> = {
  new_shipment: ["new shipment", "send a parcel", "send parcel", "create shipment", "book", "book a parcel", "ship", "tuma kifurushi", "usafirishaji mpya", "nouvel envoi", "envoyer un colis", "expedier"],
  new_invoice: ["new invoice", "create invoice", "invoice client", "raise invoice", "ankara mpya", "unda ankara", "nouvelle facture", "creer une facture", "facturer"],
  record_payment: ["record payment", "add payment", "log payment", "received money", "rekodi malipo", "enregistrer un paiement"],
  add_vehicle: ["add vehicle", "new vehicle", "add truck", "register truck", "ongeza gari", "ajouter un vehicule"],
  add_client: ["add client", "new client", "add customer", "ongeza mteja", "ajouter un client", "nouveau client"],
  new_role: ["new role", "create role", "add role", "nafasi mpya", "nouveau role", "creer un role"],
  add_member: ["add member", "add user", "invite", "add team member", "ongeza mwanatimu", "ajouter un membre", "inviter"],
  track: ["track", "trace", "where is", "fuatilia", "iko wapi", "suivre", "ou est"],
};

/** Places: Tanzanian regions plus every city of the 22 member states. */
const PLACES: { name: string; key: string }[] = [
  ...TZ_REGIONS.map((r) => ({ name: r, key: fold(r) })),
  ...COUNTRIES.flatMap((c) => c.cities.map((city) => ({ name: city.name, key: fold(city.name) }))),
].filter((p, i, all) => all.findIndex((x) => x.key === p.key) === i);

export type Interpretation = {
  text: string;
  entity?: Entity;
  filters: Filter[];
  place?: string;
  action?: Action;
  /** Free text left after removing understood words; used for record lookups. */
  rest: string;
};

/** Lowercase, strip accents and punctuation. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Edit distance where a swap of two neighbouring letters counts as one typo (optimal string alignment). */
function distance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

/** A word matches a vocabulary term exactly, by plural/prefix, or within one typo (two for long words). */
function wordMatches(word: string, term: string): boolean {
  if (word === term) return true;
  if (word.length >= 4 && (term.startsWith(word) || word.startsWith(term)) && Math.abs(word.length - term.length) <= 3) return true;
  // One typo (a swapped pair counts as one) for words of 5+ letters; more lets "delivered" read as "deliveries".
  const tolerance = term.length >= 5 ? 1 : 0;
  return tolerance > 0 && distance(word, term) <= tolerance;
}

/** Find the best vocabulary concept for a run of words; phrases beat single words. `exact` disables typo tolerance. */
function scan<K extends string>(words: string[], vocab: Record<K, string[]>, used: Set<number>, exact = false): K[] {
  const found: K[] = [];
  const entries = (Object.entries(vocab) as [K, string[]][]).flatMap(([k, terms]) => terms.map((t) => [k, t.split(" ")] as [K, string[]]));
  entries.sort((a, b) => b[1].length - a[1].length); // longest phrases first
  for (const [k, parts] of entries) {
    for (let i = 0; i + parts.length <= words.length; i++) {
      if (parts.some((_, j) => used.has(i + j))) continue;
      if (parts.every((p, j) => (parts.length > 1 || exact ? words[i + j] === p : wordMatches(words[i + j], p)))) {
        parts.forEach((_, j) => used.add(i + j));
        if (!found.includes(k)) found.push(k);
      }
    }
  }
  return found;
}

const STOP = new Set(["the", "a", "an", "of", "to", "for", "with", "in", "on", "my", "all", "show", "me", "list", "find", "which", "that", "are", "is", "from", "za", "ya", "wa", "la", "kwa", "na", "yenye", "zenye", "vyenye", "zote", "nionyeshe", "le", "la", "les", "des", "du", "de", "a", "au", "aux", "mes", "tous", "toutes", "avec", "pour", "dans"]);

export function interpret(text: string): Interpretation {
  const words = fold(text).split(" ").filter(Boolean);
  const used = new Set<number>();
  // Actions must be said exactly; nouns are read before conditions so "deliveries" is a noun, not "delivered".
  const action = scan(words, ACTION, used, true)[0];
  const entity = scan(words, ENTITY, used)[0];
  const filters = scan(words, FILTER, used);

  let place: string | undefined;
  for (const p of PLACES) {
    const parts = p.key.split(" ");
    for (let i = 0; i + parts.length <= words.length; i++) {
      if (parts.every((part, j) => !used.has(i + j) && (words[i + j] === part || (part.length >= 6 && distance(words[i + j], part) <= 1)))) {
        place = p.name;
        parts.forEach((_, j) => used.add(i + j));
        break;
      }
    }
    if (place) break;
  }

  const rest = words.filter((w, i) => !used.has(i) && !STOP.has(w)).join(" ");
  return { text, entity, filters, place, action, rest };
}

/** Which entity a filter implies when the user didn't name one ("overdue" → invoices). */
export function impliedEntity(filters: Filter[]): Entity | undefined {
  if (filters.some((f) => ["overdue", "unpaid", "paid"].includes(f))) return "invoices";
  if (filters.includes("unmatched")) return "payments";
  if (filters.some((f) => ["expired", "maintenance", "available", "on_trip"].includes(f))) return "vehicles";
  if (filters.some((f) => ["delivered", "transit", "failed", "out_for_delivery", "awaiting", "at_hub", "returned", "cancelled", "collection", "at_risk"].includes(f))) return "shipments";
  return undefined;
}
