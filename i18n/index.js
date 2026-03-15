const i18next = require("i18next");
const middleware = require("i18next-http-middleware");
const FsBackend = require("i18next-fs-backend");

i18next
  .use(FsBackend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: "en",
    preload: ["en"],
    ns: ["common", "products", "checkout"],
    defaultNS: "common",
    backend: {
      loadPath: "./i18n/locales/{{lng}}/{{ns}}.json",
    },
    detection: {
      order: ["header", "querystring", "cookie"],
      lookupQuerystring: "lang",
      lookupCookie: "i18n",
      lookupHeader: "accept-language",
      cacheUserLanguage: true,
    },
  });

module.exports = { i18next, middleware };
