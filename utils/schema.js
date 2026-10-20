const { expect } = require('@playwright/test');
const Ajv = require('ajv');

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });

function expectSchema(schema, data) {
  const validate = ajv.compile(schema);
  const valid = validate(data);
  expect(valid, `Schema errors: ${JSON.stringify(validate.errors)}`).toBe(true);
}

module.exports = { expectSchema };