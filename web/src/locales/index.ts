// One file per UI language. To add one: copy en.ts to <code>.ts, translate it and add a line below.
import ar from "./ar";
import bg from "./bg";
import cs from "./cs";
import da from "./da";
import de from "./de";
import el from "./el";
import en, { type Dict } from "./en";
import es from "./es";
import fi from "./fi";
import fr from "./fr";
import he from "./he";
import hr from "./hr";
import hu from "./hu";
import it from "./it";
import ja from "./ja";
import ka from "./ka";
import ko from "./ko";
import nb from "./nb";
import nl from "./nl";
import pl from "./pl";
import pt from "./pt";
import ro from "./ro";
import ru from "./ru";
import sq from "./sq";
import sv from "./sv";
import tr from "./tr";
import uk from "./uk";
import zh from "./zh";

export type { Dict, Key } from "./en";
export { en };

export interface Language {
  code: string;
  /** English name. */
  english: string;
  /** The language's own name. */
  native: string;
  /** flag-icons code shown next to the language. */
  flag: string;
  dir?: "rtl";
  dict: Dict;
}

// Alphabetical by language code. English is the default.
export const LANGUAGES: Language[] = [
  { code: "ar", english: "Arabic", native: "العربية", flag: "arab", dir: "rtl", dict: ar },
  { code: "bg", english: "Bulgarian", native: "Български", flag: "bg", dict: bg },
  { code: "cs", english: "Czech", native: "Čeština", flag: "cz", dict: cs },
  { code: "da", english: "Danish", native: "Dansk", flag: "dk", dict: da },
  { code: "de", english: "German", native: "Deutsch", flag: "de", dict: de },
  { code: "el", english: "Greek", native: "Ελληνικά", flag: "gr", dict: el },
  { code: "en", english: "English", native: "English", flag: "gb", dict: en },
  { code: "es", english: "Spanish", native: "Español", flag: "es", dict: es },
  { code: "fi", english: "Finnish", native: "Suomi", flag: "fi", dict: fi },
  { code: "fr", english: "French", native: "Français", flag: "fr", dict: fr },
  { code: "he", english: "Hebrew", native: "עברית", flag: "il", dir: "rtl", dict: he },
  { code: "hr", english: "Croatian", native: "Hrvatski", flag: "hr", dict: hr },
  { code: "hu", english: "Hungarian", native: "Magyar", flag: "hu", dict: hu },
  { code: "it", english: "Italian", native: "Italiano", flag: "it", dict: it },
  { code: "ja", english: "Japanese", native: "日本語", flag: "jp", dict: ja },
  { code: "ka", english: "Georgian", native: "ქართული", flag: "ge", dict: ka },
  { code: "ko", english: "Korean", native: "한국어", flag: "kr", dict: ko },
  { code: "nb", english: "Norwegian", native: "Norsk", flag: "no", dict: nb },
  { code: "nl", english: "Dutch", native: "Nederlands", flag: "nl", dict: nl },
  { code: "pl", english: "Polish", native: "Polski", flag: "pl", dict: pl },
  { code: "pt", english: "Portuguese", native: "Português", flag: "pt", dict: pt },
  { code: "ro", english: "Romanian", native: "Română", flag: "ro", dict: ro },
  { code: "ru", english: "Russian", native: "Русский", flag: "ru", dict: ru },
  { code: "sq", english: "Albanian", native: "Shqip", flag: "al", dict: sq },
  { code: "sv", english: "Swedish", native: "Svenska", flag: "se", dict: sv },
  { code: "tr", english: "Turkish", native: "Türkçe", flag: "tr", dict: tr },
  { code: "uk", english: "Ukrainian", native: "Українська", flag: "ua", dict: uk },
  { code: "zh", english: "Chinese (Simplified)", native: "简体中文", flag: "cn", dict: zh },
];
