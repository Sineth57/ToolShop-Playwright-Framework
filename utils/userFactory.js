// Builds unique user data so every test run registers a fresh, independent user
function uniqueEmail(prefix = 'qa') {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

function buildUserPayload(overrides = {}) {
  return {
    first_name: 'Test',
    last_name: 'User',
    address: {
      street: '12 Test Street',
      city: 'Colombo',
      state: 'Western',
      country: 'LK',
      postal_code: '10100',
    },
    phone: '0771234567',
    dob: '1995-05-15',
    password: 'Str0ng!Pass#2026',
    email: uniqueEmail(),
    ...overrides,
  };
}

module.exports = { uniqueEmail, buildUserPayload };