import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { api } from "./api";
import "./style.css";
// Navigasi sederhana menggunakan hash URL: #/register, #/login, #/home, #/detail/id.
const labels = { film: "Film", serial: "Serial", musik: "Musik" };
function App() {
  const [route, setRoute] = useState(location.hash.slice(1) || "/home");
  const [token, setToken] = useState(""),
    [user, setUser] = useState(null),
    [items, setItems] = useState([]),
    [detail, setDetail] = useState(null);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false);
  const [type, setType] = useState("semua"),
    [favoriteOnly, setFavoriteOnly] = useState(false),
    [query, setQuery] = useState("");
  const [rating, setRating] = useState(5),
    [text, setText] = useState("");
  useEffect(() => {
    const h = () => setRoute(location.hash.slice(1) || "/home");
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  function go(path) {
    location.hash = path;
  }
  function logout() {
    setToken("");
    setUser(null);
    setFavoriteOnly(false);
    setQuery("");
    setType("semua");
    go("/login");
  }
  async function action(fn) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
      if (e.status === 401 && token) logout();
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    setError("");
    setNotice("");
    setDetail(null);
    setLoading(false);
    if (route === "/home" || route.startsWith("/detail/")) {
      setLoading(true);
      const path =
        route === "/home" ? "/contents" : "/contents/" + route.split("/")[2];
      api(path, token)
        .then((data) => {
          if (!active) return;
          if (route === "/home") setItems(data);
          else {
            setDetail(data);
            const own = data.reviews.find((r) => r.user?._id === user?.id);
            setRating(own?.rating || 5);
            setText(own?.text || "");
          }
        })
        .catch((e) => active && setError(e.message))
        .finally(() => active && setLoading(false));
    }
    return () => {
      active = false;
    };
  }, [route, token]);
  async function authenticate(event, register) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.target));
    await action(async () => {
      const data = await api(
        "/auth/" + (register ? "register" : "login"),
        "",
        "POST",
        body,
      );
      setToken(data.token);
      setUser(data.user);
      go("/home");
    });
  }
  const authPage = route === "/login" || route === "/register";
  const visible = items.filter(
    (c) =>
      (type === "semua" || c.type === type) &&
      c.title.toLowerCase().includes(query.toLowerCase()) &&
      (!favoriteOnly || user?.favorites.includes(c._id)),
  );
  return (
    <>
      <header>
        <a href="#/home" className="brand">
          EH <span>Entertainment Hub</span>
        </a>
        <nav>
          <a href="#/home">Beranda</a>
          {user ? (
            <>
              <span>{user.name}</span>
              <button className="secondary" onClick={logout}>
                Keluar
              </button>
            </>
          ) : (
            <a href="#/login">Masuk</a>
          )}
        </nav>
      </header>
      <main>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
        {authPage ? (
          <section className="auth card">
            <p className="eyebrow">RUANG HIBURANMU</p>
            <h1>{route === "/register" ? "Buat akun" : "Selamat datang"}</h1>
            <p>Simpan favorit dan bagikan pendapatmu.</p>
            <form
              key={route}
              onSubmit={(e) => authenticate(e, route === "/register")}
            >
              {route === "/register" && (
                <label>
                  Nama
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={60}
                    autoComplete="name"
                  />
                </label>
              )}
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={72}
                  autoComplete={
                    route === "/register" ? "new-password" : "current-password"
                  }
                />
              </label>
              <small>Minimal 8 karakter; maksimal 72 byte.</small>
              <button disabled={busy}>
                {busy
                  ? "Memproses…"
                  : route === "/register"
                    ? "Daftar"
                    : "Masuk"}
              </button>
            </form>
            <p>
              {route === "/register"
                ? "Sudah punya akun?"
                : "Belum punya akun?"}{" "}
              <a href={route === "/register" ? "#/login" : "#/register"}>
                {route === "/register" ? "Masuk" : "Daftar"}
              </a>
            </p>
          </section>
        ) : route === "/home" ? (
          <>
            <section className="hero">
              <p className="eyebrow">FILM · SERIAL · MUSIK</p>
              <h1>
                Temukan hiburan
                <br />
                untuk harimu.
              </h1>
              <p>
                Jelajahi cerita, dengarkan musik, dan simpan yang kamu suka.
              </p>
            </section>
            <section className="toolbar">
              <label className="search">
                Cari judul
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari film, serial, atau musik"
                />
              </label>
              <div className="chips">
                {["semua", "film", "serial", "musik"].map((t) => (
                  <button
                    className={type === t ? "" : "secondary"}
                    key={t}
                    aria-pressed={type === t}
                    onClick={() => setType(t)}
                  >
                    {labels[t] || "Semua"}
                  </button>
                ))}
                {user && (
                  <button
                    className={favoriteOnly ? "" : "secondary"}
                    aria-pressed={favoriteOnly}
                    onClick={() => setFavoriteOnly(!favoriteOnly)}
                  >
                    Favorit saya
                  </button>
                )}
              </div>
            </section>
            {loading ? (
              <p>Memuat konten…</p>
            ) : (
              <div className="grid">
                {visible.map((c) => (
                  <a
                    className="card content"
                    href={"#/detail/" + c._id}
                    key={c._id}
                  >
                    <div className={"poster " + c.type}>
                      <span>{labels[c.type]}</span>
                      <strong>{c.title}</strong>
                    </div>
                    <div className="cardBody">
                      <small>
                        {c.year} · {labels[c.type]}
                      </small>
                      <h2>{c.title}</h2>
                      <p>{c.creator}</p>
                      <span className="detailLink">Lihat detail →</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
            {!loading && !error && !visible.length && (
              <p role="status">
                {favoriteOnly
                  ? "Belum ada favorit yang cocok. Buka detail konten lalu pilih Tambah favorit."
                  : items.length
                    ? "Tidak ada judul yang cocok. Coba kata kunci atau kategori lain."
                    : "Katalog belum tersedia."}
              </p>
            )}
          </>
        ) : route.startsWith("/detail/") ? (
          <>
            <a href="#/home">← Kembali ke beranda</a>
            {loading && <p>Memuat detail…</p>}
            {detail && (
              <>
                <section className="detail card">
                  <div className={"poster " + detail.type}>
                    <span>{labels[detail.type]}</span>
                    <strong>{detail.title}</strong>
                  </div>
                  <div>
                    <p className="eyebrow">
                      {labels[detail.type]} · {detail.year}
                    </p>
                    <h1>{detail.title}</h1>
                    <p>{detail.creator}</p>
                    <p>{detail.description}</p>
                    <p>
                      ★ {detail.average.toFixed(1)} / 5 ·{" "}
                      {detail.reviews.length} penilaian
                    </p>
                    <div className="chips">
                      <a
                        className="button"
                        href={detail.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Buka trailer / video ↗
                      </a>
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                          user
                            ? action(async () => {
                                const updated = await api(
                                  "/favorites/" + detail._id,
                                  token,
                                  "PUT",
                                  {
                                    favorite: !user.favorites.includes(
                                      detail._id,
                                    ),
                                  },
                                );
                                setUser(updated);
                                setNotice(updated.favorites.includes(detail._id)
                                  ? "Konten ditambahkan ke favorit."
                                  : "Konten dihapus dari favorit.");
                              })
                            : go("/login")
                        }
                      >
                        {user?.favorites.includes(detail._id)
                          ? "Hapus favorit"
                          : "Tambah favorit"}
                      </button>
                    </div>
                  </div>
                </section>
                <section className="card review">
                  <h2>Rating dan ulasan</h2>
                  {user ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        action(async () => {
                          await api(
                            "/contents/" + detail._id + "/review",
                            token,
                            "PUT",
                            { rating: Number(rating), text },
                          );
                          setDetail(
                            await api("/contents/" + detail._id, token),
                          );
                          setNotice("Penilaian tersimpan.");
                        });
                      }}
                    >
                      <label>
                        Rating
                        <select
                          value={rating}
                          onChange={(e) => setRating(e.target.value)}
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n} / 5
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Ulasan (opsional)
                        <textarea
                          value={text}
                          maxLength={1000}
                          onChange={(e) => setText(e.target.value)}
                        />
                      </label>
                      <button disabled={busy}>Simpan penilaian</button>
                      <small>
                        Satu penilaian per akun; simpan lagi untuk memperbarui.
                      </small>
                    </form>
                  ) : (
                    <p>
                      <a href="#/login">Masuk</a> untuk memberi penilaian.
                    </p>
                  )}
                  {detail.reviews.length === 0 && (
                    <p>Belum ada ulasan. Jadilah yang pertama.</p>
                  )}
                  {detail.reviews.map((r) => (
                    <article className="reviewItem" key={r._id}>
                      <strong>
                        {r.user?.name || "Pengguna"} · {r.rating}/5
                      </strong>
                      <p>{r.text || "Memberikan rating tanpa teks."}</p>
                    </article>
                  ))}
                </section>
              </>
            )}
          </>
        ) : (
          <p>
            Halaman tidak ditemukan. <a href="#/home">Ke beranda</a>
          </p>
        )}
      </main>
      <footer>Entertainment Hub · Proyek belajar</footer>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
