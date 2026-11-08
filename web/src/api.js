const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
export async function api(path, token, method = "GET", body) {
  let response;
  try {
    response = await fetch(BASE + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw Error(
      "API tidak terhubung. Pastikan server aktif dan alamat API benar.",
    );
  }
  const data = await response.json();
  if (!response.ok) {
    const e = Error(data.message || "Permintaan gagal");
    e.status = response.status;
    throw e;
  }
  return data;
}
