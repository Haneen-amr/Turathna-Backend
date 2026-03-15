const { autoTranslate } = require("../controllers/translationController");
const Translation = require("../models/translationModel");

function flatten(obj, prefix = "") {
  return Object.keys(obj).reduce((acc, key) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === "object" && obj[key] !== null) {
      Object.assign(acc, flatten(obj[key], fullKey));
    } else {
      acc[fullKey] = obj[key];
    }
    return acc;
  }, {});
}

function unflatten(obj) {
  return Object.keys(obj).reduce((acc, key) => {
    const keys = key.split(".");
    keys.reduce((nested, k, i) => {
      if (i === keys.length - 1) nested[k] = obj[key];
      else nested[k] = nested[k] || {};
      return nested[k];
    }, acc);
    return acc;
  }, {});
}

async function translateUI(lang) {
  const uiStrings = require("./uiStrings");

  // English is the source — return as-is, no translation needed
  if (lang === "en") return uiStrings;

  const flat = flatten(uiStrings);
  const translated = {};

  await Promise.all(
    Object.entries(flat).map(async ([key, defaultText]) => {
      // 1. Check DB first
      const cached = await Translation.findOne({ key: `ui.${key}`, lang });
      if (cached) {
        translated[key] = cached.text;
        return;
      }

      // 2. Not in DB → translate and save
      const text = await autoTranslate(defaultText, lang, "en");
      translated[key] = text;

      Translation.create({ key: `ui.${key}`, lang, text }).catch(console.error);
    }),
  );

  return unflatten(translated);
}

module.exports = { translateUI };
