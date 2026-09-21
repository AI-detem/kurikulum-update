// Zemi, kterou si admin prohlíží, držíme kromě adresy i v cookie.
// Díky tomu ji zná i levý panel, který se vykresluje v layoutu a parametry
// z adresy nedostává.
export const VIEW_COUNTRY_COOKIE = "viewCountry";

export const VIEW_COUNTRY_MAX_AGE = 60 * 60 * 24 * 365; // rok
