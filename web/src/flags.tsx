// Country name (as the register spells it) -> ISO 3166-1 alpha-2 code, for SVG flags from flag-icons (MIT).
// Names without a current flag (Netherlands Antilles, Serbia and Montenegro) simply show no flag.
const CODES: Record<string, string> = {
  Afghanistan: "af",
  "Aland Islands": "ax",
  Albania: "al",
  Algeria: "dz",
  Andorra: "ad",
  Angola: "ao",
  Anguilla: "ai",
  "Antigua and Barbuda": "ag",
  Argentina: "ar",
  Armenia: "am",
  Aruba: "aw",
  Australia: "au",
  Austria: "at",
  Azerbaijan: "az",
  Bahamas: "bs",
  Bahrain: "bh",
  Bangladesh: "bd",
  Barbados: "bb",
  Belarus: "by",
  Belgium: "be",
  Belize: "bz",
  Bermuda: "bm",
  Bolivia: "bo",
  "Bolivia, Plurinational State of": "bo",
  "Bosnia and Herzegovina": "ba",
  Botswana: "bw",
  Brazil: "br",
  "British Virgin Islands": "vg",
  "Virgin Islands, British": "vg",
  Bulgaria: "bg",
  Cambodia: "kh",
  Cameroon: "cm",
  Canada: "ca",
  "Cayman Islands": "ky",
  Chile: "cl",
  China: "cn",
  Colombia: "co",
  "Costa Rica": "cr",
  Croatia: "hr",
  Cuba: "cu",
  Curacao: "cw",
  Curaçao: "cw",
  Cyprus: "cy",
  "Czech Republic": "cz",
  Czechia: "cz",
  Denmark: "dk",
  Dominica: "dm",
  "Dominican Republic": "do",
  Ecuador: "ec",
  Egypt: "eg",
  "El Salvador": "sv",
  Estonia: "ee",
  Ethiopia: "et",
  Finland: "fi",
  France: "fr",
  Georgia: "ge",
  Germany: "de",
  Ghana: "gh",
  Gibraltar: "gi",
  Greece: "gr",
  Grenada: "gd",
  Guatemala: "gt",
  Guernsey: "gg",
  Guyana: "gy",
  Honduras: "hn",
  "Hong Kong": "hk",
  Hungary: "hu",
  Iceland: "is",
  India: "in",
  Indonesia: "id",
  "Iran, Islamic Republic of": "ir",
  Iran: "ir",
  Iraq: "iq",
  Ireland: "ie",
  "Isle of Man": "im",
  Israel: "il",
  Italy: "it",
  Jamaica: "jm",
  Japan: "jp",
  Jersey: "je",
  Jordan: "jo",
  Kazakhstan: "kz",
  Kenya: "ke",
  "Korea, Republic of": "kr",
  "South Korea": "kr",
  Kosovo: "xk",
  Kuwait: "kw",
  Kyrgyzstan: "kg",
  Latvia: "lv",
  Lebanon: "lb",
  Liechtenstein: "li",
  Lithuania: "lt",
  Luxembourg: "lu",
  Macao: "mo",
  "Macedonia, the Former Yugoslav Republic of": "mk",
  "North Macedonia": "mk",
  Malaysia: "my",
  Maldives: "mv",
  Malta: "mt",
  Mauritius: "mu",
  Mexico: "mx",
  "Moldova, Republic of": "md",
  Moldova: "md",
  Monaco: "mc",
  Mongolia: "mn",
  Montenegro: "me",
  Morocco: "ma",
  Myanmar: "mm",
  Namibia: "na",
  Nepal: "np",
  Netherlands: "nl",
  "New Zealand": "nz",
  Nicaragua: "ni",
  Nigeria: "ng",
  Norway: "no",
  Oman: "om",
  Pakistan: "pk",
  Panama: "pa",
  Paraguay: "py",
  Peru: "pe",
  Philippines: "ph",
  Poland: "pl",
  Portugal: "pt",
  "Puerto Rico": "pr",
  Qatar: "qa",
  Romania: "ro",
  "Russian Federation": "ru",
  Russia: "ru",
  Rwanda: "rw",
  "Saint Kitts and Nevis": "kn",
  "Saint Lucia": "lc",
  "Saint Vincent and the Grenadines": "vc",
  "San Marino": "sm",
  "Saudi Arabia": "sa",
  Senegal: "sn",
  Serbia: "rs",
  Seychelles: "sc",
  Singapore: "sg",
  "Sint Maarten": "sx",
  Slovakia: "sk",
  Slovenia: "si",
  "South Africa": "za",
  Spain: "es",
  "Sri Lanka": "lk",
  Suriname: "sr",
  Sweden: "se",
  Switzerland: "ch",
  "Taiwan, Province of China": "tw",
  Taiwan: "tw",
  Tanzania: "tz",
  "Tanzania, United Republic of": "tz",
  Thailand: "th",
  "Trinidad and Tobago": "tt",
  Tunisia: "tn",
  Turkey: "tr",
  Türkiye: "tr",
  "Turks and Caicos Islands": "tc",
  Uganda: "ug",
  Ukraine: "ua",
  "United Arab Emirates": "ae",
  "United Kingdom": "gb",
  "United States": "us",
  Uruguay: "uy",
  Uzbekistan: "uz",
  Vanuatu: "vu",
  Venezuela: "ve",
  "Venezuela, Bolivarian Republic of": "ve",
  "Viet Nam": "vn",
  Vietnam: "vn",
  Zambia: "zm",
  Zimbabwe: "zw",
};

// ISO code -> main language, to show each country's own name (its endonym) via Intl.DisplayNames.
const LANGUAGE: Record<string, string> = {
  ad: "ca", ae: "ar", af: "ps", ag: "en", ai: "en", al: "sq", am: "hy", ao: "pt", ar: "es", at: "de", au: "en",
  aw: "nl", ax: "sv", az: "az", ba: "bs", bb: "en", bd: "bn", be: "nl", bg: "bg", bh: "ar", bm: "en", bo: "es",
  br: "pt", bs: "en", bw: "en", by: "be", bz: "en", ca: "en", ch: "de", cl: "es", cm: "fr", cn: "zh", co: "es",
  cr: "es", cu: "es", cw: "nl", cy: "el", cz: "cs", de: "de", dk: "da", dm: "en", do: "es", dz: "ar", ec: "es",
  ee: "et", eg: "ar", es: "es", et: "am", fi: "fi", fr: "fr", gb: "en", gd: "en", ge: "ka", gg: "en", gh: "en",
  gi: "en", gr: "el", gt: "es", gy: "en", hk: "zh-Hant", hn: "es", hr: "hr", hu: "hu", id: "id", ie: "ga",
  il: "he", im: "en", in: "hi", iq: "ar", ir: "fa", is: "is", it: "it", je: "en", jm: "en", jo: "ar", jp: "ja",
  ke: "sw", kg: "ky", kh: "km", kn: "en", kr: "ko", kw: "ar", ky: "en", kz: "kk", lb: "ar", lc: "en", li: "de",
  lk: "si", lt: "lt", lu: "lb", lv: "lv", ma: "ar", mc: "fr", md: "ro", me: "sr-Latn", mk: "mk", mm: "my",
  mn: "mn", mo: "zh-Hant", mt: "mt", mu: "en", mv: "dv", mx: "es", my: "ms", na: "en", ng: "en", ni: "es",
  nl: "nl", no: "nb", np: "ne", nz: "en", om: "ar", pa: "es", pe: "es", ph: "fil", pk: "ur", pl: "pl", pr: "es",
  pt: "pt", py: "es", qa: "ar", ro: "ro", rs: "sr", ru: "ru", rw: "rw", sa: "ar", sc: "en", se: "sv", sg: "en",
  si: "sl", sk: "sk", sm: "it", sn: "fr", sr: "nl", sv: "es", sx: "nl", tc: "en", th: "th", tn: "ar", tr: "tr",
  tt: "en", tw: "zh-Hant", tz: "sw", ua: "uk", ug: "en", us: "en", uy: "es", uz: "uz", vc: "en", ve: "es",
  vg: "en", vn: "vi", vu: "en", xk: "sq", za: "en", zm: "en", zw: "en",
};

export function flagCode(country: string): string | undefined {
  return CODES[country];
}

const cache = new Map<string, string | undefined>();

function regionName(code: string, language: string): string | undefined {
  const key = `${code}|${language}`;
  if (cache.has(key)) return cache.get(key);
  let name: string | undefined;
  try {
    const names = new Intl.DisplayNames([language], { type: "region" });
    // Browsers without data for a language silently fall back to another one; skip those.
    const resolved = names.resolvedOptions().locale.split("-")[0];
    name = resolved === language.split("-")[0] ? names.of(code.toUpperCase()) : undefined;
  } catch {
    name = undefined;
  }
  if (name && name.toUpperCase() === code.toUpperCase()) name = undefined; // unknown region
  cache.set(key, name);
  return name;
}

/** The country's own name in its main language ("Deutschland", "Κύπρος", "Україна"), when it differs from the register name. */
export function nativeName(country: string): string | undefined {
  const code = CODES[country];
  const language = code ? LANGUAGE[code] : undefined;
  const name = code && language ? regionName(code, language) : undefined;
  return name && name !== country ? name : undefined;
}

/** The country's name in the interface language, when it differs from the register name. */
export function localName(country: string, uiLanguage: string): string | undefined {
  const code = CODES[country];
  const name = code ? regionName(code, uiLanguage) : undefined;
  return name && name !== country ? name : undefined;
}

/** "Magyarország (Hungary)" — own name first, register (English) name in brackets. */
export function countryLabel(country: string): string {
  const own = nativeName(country);
  return own ? `${own} (${country})` : country;
}

/** Every name a country can be searched by: register name, own name and interface-language name. */
export function countrySearchText(country: string, uiLanguage: string): string {
  return [country, nativeName(country), localName(country, uiLanguage)].filter(Boolean).join(" ").toLowerCase();
}

/** Small SVG flag for a country name; renders nothing when the country has no flag. */
export function Flag({ country, className = "" }: { country: string; className?: string }) {
  const code = flagCode(country);
  if (!code) return null;
  return <span className={`fi fi-${code} flag ${className}`.trim()} role="img" aria-label={country} title={country} />;
}
