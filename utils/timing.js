// Performs a GET and measures how long it took
async function timedGet(request, url, options = {}) {
  const start = Date.now();
  const response = await request.get(url, options);
  return { response, duration: Date.now() - start };
}

module.exports = { timedGet };