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
  changesPanelTitle: "Co se v této verzi změnilo",
  changesPanelEmpty: "Zatím nic označeného.",

  // značkování změn v dokumentu
  annotateHint:
    "Táhni myší přes místo v dokumentu, které se změnilo — pak napiš, co se tam změnilo.",
  pasteLinkToSeeDocument: "Vlož odkaz na PDF z Google Drive a dokument se načte sem.",
  whatChangedHere: "Co se tady změnilo?",
  cancel: "Zrušit",
  saved: "Uloženo.",
  done: "Hotovo",
  saveChanges: "Uložit změny",
  saveFailedDetail: "Uložení se nepodařilo:",
  uploadedBy: "nahrál/a",
  existingVersionInfo: "Pro {country} už existuje verze {version} ({when}, nahrál/a {who}). Uloží se jako verze {next}.",
  firstVersionInfo: "Pro {country} to bude první verze.",
  concurrentWarning: "Mezitím přibyla verze {version} od {who} ({when}). Tvoje úprava se uložila jako verze {saved} — zkontroluj, jestli se nepřekrývají.",
  openThatVersion: "Otevřít modul",
  olderVersions: "Starší verze",
  latest: "nejnovější",
  firstVersion: "První verze",
  nothingToCompare: "Tohle je první zveřejněná verze, není co porovnávat.",
  changesAgainst: "Změny oproti verzi {version}",
  uploadedByWho: "Nahrál/a {who}",
  markedPlacesForms: "vyznačené místo|vyznačená místa|vyznačených míst",
  markedChangesForms: "vyznačená změna|vyznačené změny|vyznačených změn",
  summaryLabel: "Shrnutí",
  noCategory2: "Bez kategorie",
  otherCategory: "Jiná…",
  otherCategoryPlaceholder: "vlastní název kategorie",
  savingDraft: "Ukládám…",
  draftSaved: "Rozpracováno — uloženo v {time}",
  draftFound: "Máš rozpracovanou verzi pro {module} / {country} (uloženo {time}).",
  continueDraft: "Pokračovat",
  startOver: "Začít znovu",
  newerVersionAppeared: "K tvé verzi {version} modulu {module} přibyla novější verze {newVersion}.",
  markDiscarded: "Označení zrušeno — bez popisu se neuloží.",
  markDeleted: "Značka smazána",
  undo: "Vrátit zpět",
  hideMarks: "Skrýt značky",
  showMarks: "Zobrazit značky",
  pageLabel: "Strana",
  summaryOptional: "Celkové shrnutí (nepovinné)",
  demoLabel: "takhle",
  edit: "Upravit",
  delete: "Smazat",
  needMarkOrSummary: "Označ aspoň jedno místo v dokumentu nebo napiš celkové shrnutí.",
  catContent: "Obsahová změna",
  catFix: "Oprava chyby",
  catLocalization: "Lokalizace",
  catNewPart: "Nová část",
  catFormal: "Formální úprava",

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
