// Český slovník textů rozhraní. Je zároveň vzorem pro ostatní jazyky –
// když sem přidáš klíč, TypeScript si vyžádá jeho doplnění i v sk/en/hu.
//
// POZOR: překládá se jen rozhraní appky. Obsah nahraných PDF metodik
// se nikdy nepřekládá ani neupravuje.
export const cs = {
  // formát data podle zvyklostí jazyka
  dateLocale: "cs-CZ",

  // navigace
  overview: "Přehled",
  upload: "Nahrát",
  admin: "Administrace",
  logout: "Odhlásit se",
  notifications: "Notifikace",
  noNotifications: "Zatím žádné notifikace.",

  // přehled modulů
  methodologies: "Metodiky",
  noModules: "Zatím žádné moduly",
  currentVersion: "Aktuální verze",
  totalVersions: "Celkem verzí",
  noVersionYet: "Zatím žádná nahraná verze.",
  noCategory: "Bez kategorie",

  // detail modulu a verze
  version: "Verze",
  uploaded: "Nahráno",
  noVersions: "Pro tento modul zatím není nahraná žádná verze.",
  downloadPdf: "Stáhnout PDF",
  viewPdf: "Zobrazit PDF",
  hidePdf: "Skrýt PDF",
  openPdf: "Otevřít PDF",
  fileUnavailable: "Soubor se nepodařilo načíst.",
  loadingPdf: "Načítám PDF...",
  pdfLoadFailed: "PDF se nepodařilo načíst",
  openInDrive: "Otevřít v Google Drive",

  // nahrání nové verze
  uploadNewVersion: "Nahrát novou verzi",
  module: "Modul",
  country: "Země",
  driveLink: "Odkaz na PDF v Google Drive",
  driveLinkHelp:
    "Ve složce/souboru v Drive musí být sdílení nastavené na „Kdokoli s odkazem“ (režim Prohlížející), jinak appka PDF nezobrazí.",
  driveLinkNotRecognized:
    "Nepodařilo se rozpoznat odkaz na Google Drive, zkontroluj prosím formát.",
  uploadMissingFields: "Vyplň prosím modul, zemi, odkaz na PDF i poznámku ke změně.",
  uploadNotAllowed: "Nemáš oprávnění přidávat nové verze.",
  saveFailed: "Uložení se nepodařilo.",
  saving: "Ukládám...",
  changeCategory: "Kategorie změny",
  changeCategoryPlaceholder: "např. oprava, nový obsah, překlad",
  whatChanged: "Co se změnilo",
  whatChangedPlaceholder: "Popiš stručně změnu, ať čtenáři vědí, co se aktualizovalo.",
  uploadAndNotify: "Nahrát a upozornit",
  optional: "volitelné",
  noCountryForUpload: "Bez přiřazené země",

  // administrace
  countries: "Země",
  addCountry: "Přidat zemi",
  countryName: "Název země",
  languageCode: "jazyk (cs, sk, en...)",
  users: "Uživatelé",
  email: "E-mail",
  countryAndRole: "Země / role",
  save: "Uložit",
  inviteUser: "Pozvat uživatele",
  invite: "Pozvat",
  roleViewer: "čtenář",
  roleEditor: "editor",
  roleAdmin: "admin",

  // stavy bez země
  noCountryAssigned: "Zatím ti není přiřazená žádná země. Ozvi se administrátorovi appky.",
  noCountriesYet: "Zatím není založená žádná země. Přidej ji v Administraci.",
};

export type Dictionary = typeof cs;
