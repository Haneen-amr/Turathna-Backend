const slugify = require("slugify");

const CATEGORIES_INFO = {
  "Textiles & Embroidery": "Handwoven fabrics, kilims, and Sinai embroidery.",
  "Pottery & Ceramics": "Traditional handmade pottery and decorative ceramics.",
  "Jewelry & Accessories": "Silver, copper, and heritage-inspired accessories.",
  "Home Décor": "Authentic Egyptian decorative pieces.",
  "Bags & Leather Goods": "Handcrafted leather bags and accessories.",
  "Wood & Carved Art": "Hand-carved wooden crafts and ornaments.",
  "Handmade Gifts": "Unique gift items crafted by local artisans.",
  "Art & Paintings": "Cultural paintings and handcrafted artwork.",
};

const REGIONS_INFO = {
  Sinai: "Intricate Embroidery",
  Nubia: "Vibrant Beadwork & Baskets",
  "Siwa Oasis": "Heritage Silver & Salt Lamps",
  "Upper Egypt": "Handwoven Textiles & Alabaster",
  Fayoum: "Authentic Pottery",
};

const getNameFromSlug = (slug, infoObject) => {
  return Object.keys(infoObject).find(
    (key) => slugify(key, { lower: true, strict: true }) === slug,
  );
};

module.exports = {
  CATEGORIES_INFO,
  REGIONS_INFO,
  getNameFromSlug,
};
