/**
 * Translates text using the MyMemory API.
 * @param {string} text - The content to translate.
 * @param {string} targetLang - Destination language code (default 'en').
 * @param {string} sourceLang - Source language code (default 'ar').
 * @returns {Promise<string>}
 */
const email = process.env.EMAIL_ADDRESS || "guest@gmail.com";
async function autoTranslate(text, targetLang = "en", sourceLang = "ar") {
  if (!text || typeof text !== "string") return "";

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}&de=${email}`;

    const res = await fetch(url);

    // Check for HTTP-level errors (e.g., 404, 500)
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const data = await res.json();

    // Check for API-level errors
    if (data.responseStatus !== 200) {
      throw new Error(data.responseDetails || "API Error");
    }

    return data.responseData?.translatedText || "";
  } catch (error) {
    console.error("Translation Error:", error.message);
    throw error; // Re-throw so the caller can handle it
  }
}

module.exports = { autoTranslate };
