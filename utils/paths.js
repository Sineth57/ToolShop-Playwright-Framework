const path = require('path');

const AUTH_DIR = path.join(__dirname, '..', '.auth');

module.exports = {
  AUTH_DIR,
  AUTH_FILE: path.join(AUTH_DIR, 'user.json'),           // saved browser session
  USER_FILE: path.join(AUTH_DIR, 'user-credentials.json'), // email and password of that user
};