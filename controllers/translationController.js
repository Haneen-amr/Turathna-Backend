async function autoTranslate(text, targetLang = "en", sourceLang = "ar") {
  if (!text) return "";

  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}&de=youremail@gmail.com`,
  );

  const data = await res.json();

  if (data.responseStatus !== 200) throw new Error(data.responseDetails);

  return data.responseData.translatedText;
}

module.exports = { autoTranslate };
