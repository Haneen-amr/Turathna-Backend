const Ajv = require("ajv");
const ajvFormats = require("ajv-formats");
const ajvErrors = require("ajv-errors");
const ajv = new Ajv({ allErrors: true, strict: false, coerceTypes: true });
ajvFormats(ajv);
ajvErrors(ajv);

const baseProperties = {
  title_ar: {
    type: "string",
    // pattern: "^[\\u0600-\\u06FF\\s.,،]+$",
    // errorMessage: "Product Title must be in Arabic",
  },
  title_en: {
    type: "string",
    // pattern: "^[A-Za-z0-9\\s]+$",
    // errorMessage: "Product Title must be in English",
  },
  description_ar: {
    type: "string",
    // pattern: "^[\\u0600-\\u06FF0-9\\s.,،!@#$%^&*()_+=\\-\\[\\]{}|;:'\"<>?]+$",
    // errorMessage: "Product Description must be in Arabic",
  },
  description_en: {
    type: "string",
    // pattern: "^[A-Za-z0-9\\s.,!@#$%^&*()_+=\\-\\[\\]{}|;:'\"<>?]+$",
    // errorMessage: "Product Description must be in English",
  },
  heritage_text: {
    type: "string",
  },
  heritage_video: {
    type: "string",
  },
  heritageType: {
    type: "string",
    enum: ["text", "video", null],
  },
  originalPrice: {
    type: "number",
    minimum: 0,
  },
  finalPrice: {
    type: "number",
    minimum: 0,
  },
  productImages: {
    type: "array",
    items: { type: "string" },
    minItems: 1,
    maxItems: 5,
    errorMessage: "Please upload 1-5 images of your product",
  },
  coverImage: {
    type: "string",
  },
  region: {
    type: "string",
    pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
    errorMessage: "Region must be a slug or an array of slugs",
  },
  seller: {
    type: "string",
    pattern: "^[0-9a-fA-F]{24}$",
  },
  verificationStatus: {
    type: "string",
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
};

const productSchema = {
  type: "object",
  properties: {
    ...baseProperties,
  },
  required: ["title_ar", "originalPrice", "productImages", "region"],
  additionalProperties: false,
};

const updateProductSchema = {
  type: "object",
  properties: {
    ...baseProperties,
    category: {
      type: "string",
      pattern: "^[\\p{L}0-9]+(?:-[\\p{L}0-9]+)*$",
      errorMessage: "Category must be a valid slug",
    },
    rejectionMsg: {
      type: "string",
    },
  },
  additionalProperties: false,
};

const productValidator = ajv.compile(productSchema);
const updateProductValidator = ajv.compile(updateProductSchema);

module.exports = {
  productValidator,
  updateProductValidator,
};
