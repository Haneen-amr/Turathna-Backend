const Ajv = require("ajv");
const ajvFormats = require("ajv-formats");
const ajvErrors = require("ajv-errors");
const ajv = new Ajv({ allErrors: true, strict: false, coerceTypes: true });
ajvFormats(ajv);
ajvErrors(ajv);

const updateSchema = {
  type: "object",
  properties: {
    role: { type: "string", enum: ["buyer", "seller"] },
    firstname: {
      type: "string",
      pattern: "^[A-Z][a-z]*$",
    },
    lastname: {
      type: "string",
      pattern: "^[A-Z][a-z]*$",
    },
    name: {
      type: "string",
      pattern:
        "^[\u0600-\u06FF]{2,}\\s+[\u0600-\u06FF]{2,}\\s+[\u0600-\u06FF]{2,}.*$", //arabic
      errorMessage: "Please enter at least 3 names, in Arabic",
    },
    email: {
      type: "string",
      format: "email",
      errorMessage: "Invalid email format",
    },
    phone: {
      type: "string",
      pattern: "^01[0125][0-9]{8}$",
      errorMessage: "Invalid phone number",
    },
    sellingOffline: {
      type: "boolean",
    },
    sellingOnline: {
      type: "boolean",
    },
    shopAddress: {
      type: "string",
    },
    websiteLink: {
      oneOf: [
        { type: "string", format: "uri" },
        { type: "string", maxLength: 0 },
      ],
    },
  },

  additionalProperties: false,
};

const updateValidator = ajv.compile(updateSchema);

module.exports = {
  updateValidator,
};
