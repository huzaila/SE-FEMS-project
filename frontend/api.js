const API_BASE = "http://localhost:5000/api";

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw {status: res.status, body};
  return body;
}

export default { request };
