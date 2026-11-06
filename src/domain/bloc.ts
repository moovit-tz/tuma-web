/**
 * Where Tuma works for now: the SADC and EAC member states. Phone numbers, places and addresses are held to these.
 * `digits` is the length of a mobile number after the country code. Mirrors tuma_x/lib/app/bloc.dart.
 */
export const BLOC = [
  { iso: "TZ", name: "Tanzania", dial: "255", digits: 9 },
  { iso: "KE", name: "Kenya", dial: "254", digits: 9 },
  { iso: "UG", name: "Uganda", dial: "256", digits: 9 },
  { iso: "RW", name: "Rwanda", dial: "250", digits: 9 },
  { iso: "BI", name: "Burundi", dial: "257", digits: 8 },
  { iso: "SS", name: "South Sudan", dial: "211", digits: 9 },
  { iso: "SO", name: "Somalia", dial: "252", digits: 9 },
  { iso: "CD", name: "DR Congo", dial: "243", digits: 9 },
  { iso: "ZA", name: "South Africa", dial: "27", digits: 9 },
  { iso: "ZM", name: "Zambia", dial: "260", digits: 9 },
  { iso: "ZW", name: "Zimbabwe", dial: "263", digits: 9 },
  { iso: "MW", name: "Malawi", dial: "265", digits: 9 },
  { iso: "MZ", name: "Mozambique", dial: "258", digits: 9 },
  { iso: "AO", name: "Angola", dial: "244", digits: 9 },
  { iso: "BW", name: "Botswana", dial: "267", digits: 8 },
  { iso: "NA", name: "Namibia", dial: "264", digits: 9 },
  { iso: "SZ", name: "Eswatini", dial: "268", digits: 8 },
  { iso: "LS", name: "Lesotho", dial: "266", digits: 8 },
  { iso: "MG", name: "Madagascar", dial: "261", digits: 9 },
  { iso: "MU", name: "Mauritius", dial: "230", digits: 8 },
  { iso: "SC", name: "Seychelles", dial: "248", digits: 7 },
  { iso: "KM", name: "Comoros", dial: "269", digits: 7 },
] as const;

export const BLOC_CODES: ReadonlySet<string> = new Set(BLOC.map((c) => c.iso));
