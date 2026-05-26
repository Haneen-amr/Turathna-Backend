const Ajv = require("ajv");
const ajvFormats = require("ajv-formats");
const ajvErrors = require("ajv-errors");
const userModel = require("../../models/userModel");
const ajv = new Ajv({ allErrors: true, strict: false, coerceTypes: true });
ajvFormats(ajv);
ajvErrors(ajv);

const orderSchema = {
  type: "object",
  properties: {
    user: {
      type: "string",
      pattern: "^[0-9a-fA-F]{24}$",
      errorMessage: "Invalid user ID format",
    },
    buyerDetails: {
      type: "object",
      properties: {
        firstname: { type: "string" },
        lastname: { type: "string" },
        phone: { type: "string" },
      },
      additionalProperties: false,
    },
    sellerDetails: {
      type: "object",
      properties: {
        name: { type: "string" },
        phone: { type: "string" },
      },
      additionalProperties: false,
    },
    workshop: {
      type: "string",
      pattern: "^[0-9a-fA-F]{24}$",
      errorMessage: "Invalid workshop ID format",
    },
    workshopDetails: {
      type: "object",
      properties: {
        title_ar: { type: "string" },
        title_en: { type: "string" },
        finalPrice: { type: "number", minimum: 0 },
        date: { type: "string" },
        time: { type: "string" },
        coverImage: { type: "string" },
      },
      required: ["title_en", "finalPrice", "date", "time", "coverImage"],
      additionalProperties: false,
    },
    isReserved: { type: "boolean" },
  },
  required: ["user", "workshop"],
  additionalProperties: false,
};
