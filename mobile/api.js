const BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";
export async function api(path, token, method = "GET", body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) {
      const e = Error(data.message || "Permintaan gagal");
      e.status = res.status;
      throw e;
    }
    return data;
  } catch (e) {
    if (e.status) throw e;
    throw Error("API tidak terhubung. Periksa IP Mac, Wi-Fi, dan server.");
  } finally {
    clearTimeout(timer);
  }
}
