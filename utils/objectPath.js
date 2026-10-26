// Sets a value inside an object by path,-> setPath(user, 'address.street', 'x')
function setPath(object, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((node, key) => node[key], object);
  target[last] = value;
  return object;
}

// Removes a field by path, e.g. removePath(user, 'address.city')
function removePath(object, path) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((node, key) => node[key], object);
  delete target[last];
  return object;
}

module.exports = { setPath, removePath };