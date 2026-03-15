// routes/uiRoutes.js
const express = require("express");
const router = express.Router();
const asyncFunction = require("../middlewares/asyncMW");
const { translateUI } = require("../i18n/translateUI");

router.get(
  "/ui/strings",
  asyncFunction(async (req, res) => {
    const lang = req.query.lang || req.language || "en";
    const strings = await translateUI(lang);

    res.status(200).json({
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      strings,
    });
  }),
);

router.post("/language", (req, res) => {
  const { lang } = req.body;
  const supported = ["en", "ar", "fr", "de"];

  if (!supported.includes(lang)) {
    return res.status(400).json({ message: "Unsupported language" });
  }

  res.cookie("i18n", lang, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: false,
  });
  res.status(200).json({ message: "Language updated", lang });
});

module.exports = router;
