const { autoTranslate } = require("../controllers/translationController");
const Translation = require("../models/translationModel");

// In-memory cache to avoid repeated DB hits
const memoryCache = {};

async function getTranslation(key, defaultText, lang) {
  if (lang === "en") return defaultText;

  const cacheKey = `${lang}:${key}`;

  // 1. Check in-memory cache first (fastest)
  if (memoryCache[cacheKey]) return memoryCache[cacheKey];

  // 2. Check MongoDB (persisted across restarts)
  const existing = await Translation.findOne({ key, lang });
  if (existing) {
    memoryCache[cacheKey] = existing.text; // warm up memory cache
    return existing.text;
  }

  // 3. Auto-translate (only hits API when truly new)
  const translated = await autoTranslate(defaultText, lang);

  // 4. Save to memory + DB (non-blocking)
  memoryCache[cacheKey] = translated;
  Translation.create({ key, lang, text: translated }).catch(console.error);

  return translated;
}

module.exports = { getTranslation };
