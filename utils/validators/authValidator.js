const Ajv = require("ajv");
const ajvFormats = require("ajv-formats");
const ajvErrors = require("ajv-errors");
const {
  coerceAndCheckDataType,
} = require("ajv/dist/compile/validate/dataType");
const ajv = new Ajv({ allErrors: true, strict: false, coerceTypes: true });
ajvFormats(ajv);
ajvErrors(ajv);

const registerationSchema = {
  type: "object",
  properties: {
    role: {
      type: "string",
      enum: ["buyer", "seller"],
    },
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
    password: {
      type: "string",
      minLength: 6,
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
    uploadedPhotos: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      errorMessage: "Please upload 5 images of your work",
    },
    verificationStatus: {
      type: "string",
      enum: ["pending", "approved", "rejected"],
    },
  },
  required: ["role", "phone", "password"],
  allOf: [
    {
      if: { properties: { role: { const: "buyer" } } },
      then: { required: ["firstname", "lastname", "email"] },
    },
    {
      if: { properties: { role: { const: "seller" } } },
      then: {
        required: ["name", "sellingOffline", "sellingOnline", "uploadedPhotos"],
        allOf: [
          {
            if: { properties: { sellingOnline: { const: true } } },
            then: { required: ["websiteLink"] },
          },
          {
            if: { properties: { sellingOffline: { const: true } } },
            then: { required: ["shopAddress"] },
          },
        ],
      },
    },
  ],
  additionalProperties: false,
};

const loginSchema = {
  type: "object",
  properties: {
    role: {
      type: "string",
      enum: ["buyer", "seller"],
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
    password: {
      type: "string",
      minLength: 6,
    },
    // verificationStatus: {
    //   type: "string",
    //   enum: ["pending", "approved", "declined"],
    // },
  },
  required: ["role", "password"],
  allOf: [
    {
      if: { properties: { role: { const: "buyer" } } },
      then: { required: ["email"] },
    },
    {
      if: { properties: { role: { const: "seller" } } },
      then: { required: ["phone"] },
    },
  ],
  additionalProperties: false,
};

const registerValidator = ajv.compile(registerationSchema);
const loginValidator = ajv.compile(loginSchema);

module.exports = {
  registerValidator,
  loginValidator,
};
