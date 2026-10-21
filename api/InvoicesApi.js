class InvoicesApi {
  constructor(request) {
    this.request = request;
  }

  list(token) {
    return this.request.get('/invoices', { headers: { Authorization: `Bearer ${token}` } });
  }

  async count(token) {
    const response = await this.list(token);
    const body = await response.json();
    return (Array.isArray(body) ? body : body.data).length;
  }
}

module.exports = { InvoicesApi };