const Ajv = require("ajv");
const ajvFormats = require("ajv-formats");
const ajvErrors = require("ajv-errors");
const ajv = new Ajv({ allErrors: true, strict: false, coerceTypes: true });
ajvFormats(ajv);
ajvErrors(ajv);

const cartSchema = {
  type: "object",
  properties: {
    buyer: {
      type: "string",
      pattern: "^[0-9a-fA-F]{24}$",
      errorMessage: "Invalid buyer ID format",
    },
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          product: {
            type: "string",
            pattern: "^[0-9a-fA-F]{24}$",
          },
          quantity: {
            type: "number",
            minimum: 1,
          },
          totalPrice: {
            type: "number",
          },
        },
        required: ["product", "quantity"],
        additionalProperties: false,
      },
    },
  },
  required: ["buyer", "products"],
  additionalProperties: false,
};

const cartValidator = ajv.compile(cartSchema);

module.exports = {
  cartValidator,
};
