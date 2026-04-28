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
    // errorMessage: "Workshop Title must be in Arabic",
  },
  title_en: {
    type: "string",
    // pattern: "^[A-Za-z0-9\\s]+$",
    // errorMessage: "Workshop Title must be in English",
  },
  description_ar: {
    type: "string",
    // pattern: "^[\\u0600-\\u06FF\\s.,،]+$",
    // errorMessage: "Workshop Description must be in Arabic",
  },
  description_en: {
    type: "string",
    // pattern: "^[A-Za-z0-9\\s]+$",
    // errorMessage: "Workshop Description must be in English",
  },
  originalPrice: {
    type: "number",
    minimum: 0,
  },
  finalPrice: {
    type: "number",
    minimum: 0,
  },
  workshopImages: {
    type: "array",
    items: { type: "string" },
    minItems: 1,
    maxItems: 1,
    errorMessage: "Please upload only 1 image of your workshop",
  },
  coverImage: {
    type: "string",
  },
  date: {
    type: "string",
    format: "date",
    errorMessage: "Invalid date format. Use YYYY-MM-DD",
  },
  time: {
    type: "string",
    format: "^([01]\\d|2[0-3]):([0-5]\\d):([0-5]\\d)$",
    errorMessage: "Please enter a valid time (hh:mm:ss)",
  },
  seats: {
    type: "number",
  },
  workshopOffline: {
    type: "boolean",
  },
  workshopOnline: {
    type: "boolean",
  },
  workshopAddress: {
    type: "string",
  },
  workshopLink: {
    oneOf: [
      { type: "string", format: "uri" },
      { type: "string", maxLength: 0 },
    ],
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

const workshopSchema = {
  type: "object",
  properties: baseProperties,
  required: [
    "title_ar",
    "originalPrice",
    "workshopImages",
    "date",
    "time",
    "seats",
    "workshopOffline",
    "workshopOnline",
  ],
  allOf: [
    {
      if: { properties: { workshopOnline: { const: true } } },
      then: { required: ["workshopLink"] },
    },
    {
      if: { properties: { workshopOffline: { const: true } } },
      then: { required: ["workshopAddress"] },
    },
  ],
};

const updateWorkshopSchema = {
  type: "object",
  properties: {
    ...baseProperties,
    rejectionMsg: {
      type: "string",
    },
  },
  allOf: [
    {
      if: {
        properties: { workshopOnline: { const: true } },
        required: ["workshopOnline"],
      },
      then: { required: ["workshopLink"] },
    },
    {
      if: {
        properties: { workshopOffline: { const: true } },
        required: ["workshopOffline"],
      },
      then: { required: ["workshopAddress"] },
    },
  ],
  additionalProperties: false,
};

const workshopValidator = ajv.compile(workshopSchema);
const updateWorkshopValidator = ajv.compile(updateWorkshopSchema);

module.exports = {
  workshopValidator,
  updateWorkshopValidator,
};
