const Ajv = require("ajv");
const ajvFormats = require("ajv-formats");
const ajvErrors = require("ajv-errors");
const ajv = new Ajv({ allErrors: true, strict: false, coerceTypes: true });
ajvFormats(ajv);
ajvErrors(ajv);

const regions = ["Sinai", "Nubia", "Siwa Oasis", "Upper Egypt", "Fayoum"];

const productSchema = {
  type: "object",
  properties: {
    title_ar: {
      type: "string",
      pattern: "^[\\u0600-\\u06FF\\s]+$",
      errorMessage: "Product Title must be in Arabic",
    },
    title_en: {
      type: "string",
      pattern: "^[A-Za-z0-9\\s]+$",
      errorMessage: "Product Title must be in English",
    },
    description_ar: {
      type: "string",
    },
    description_video: {
      type: "string",
    },
    descriptionType: {
      type: "string",
      enum: ["text", "video"],
    },
    description_en: {
      type: "string",
      pattern: "^[A-Za-z0-9\\s]+$",
      errorMessage: "Product Description must be in English",
    },
    price: {
      type: "number",
      minimum: 0,
    },
    productImages: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 5,
      errorMessage: "Please upload maximum 5 images of your product",
    },
    coverImage: {
      type: "string",
    },
    region: {
      oneOf: [
        {
          type: "string",
          pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
        },
        {
          type: "array",
          items: {
            type: "string",
            pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
          },
        },
      ],
      errorMessage: "Region must be a slug or an array of slugs",
    },
    regionDescription: { type: "array" },
    seller: {
      type: "string",
      pattern: "^[0-9a-fA-F]{24}$",
    },
    review: {
      type: "string",
    },
    verificationStatus: {
      type: "string",
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  required: ["title_ar", "price", "productImages", "region"],
  additionalProperties: false,
};

const updateProductSchema = {
  type: "object",
  properties: {
    title_ar: {
      type: "string",
      pattern: "^[\\u0600-\\u06FF\\s]+$",
      errorMessage: "Product Title must be in Arabic",
    },
    title_en: {
      type: "string",
      pattern: "^[A-Za-z0-9\\s]+$",
      errorMessage: "Product Title must be in English",
    },
    description_ar: {
      type: "string",
    },
    description_video: {
      type: "string",
    },
    descriptionType: {
      type: "string",
      enum: ["text", "video"],
    },
    description_en: {
      type: "string",
      pattern: "^[A-Za-z0-9\\s]+$",
      errorMessage: "Product Description must be in English",
    },
    price: {
      type: "number",
      minimum: 0,
    },
    productImages: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 5,
      errorMessage: "Please upload maximum 5 images of your product",
    },
    coverImage: {
      type: "string",
    },
    category: {
      type: "string",
      pattern: "^[\\p{L}0-9]+(?:-[\\p{L}0-9]+)*$",
      errorMessage: "Category must be a valid slug",
    },
    region: {
      oneOf: [
        {
          type: "string",
          pattern: "^[\\p{L}0-9]+(?:-[\\p{L}0-9]+)*$",
        },
        {
          type: "array",
          items: {
            type: "string",
            pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
          },
        },
      ],
      errorMessage: "Region must be a slug or an array of slugs",
    },
    categoryDescription: { type: "string" },
    regionDescription: { type: "array" },
    seller: {
      type: "string",
      pattern: "^[0-9a-fA-F]{24}$",
    },
    review: {
      type: "string",
    },
    verificationStatus: {
      type: "string",
      enum: ["pending", "approved", "rejected"],
      default: "pending",
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
