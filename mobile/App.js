import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Linking,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { api } from "./api";
const labels = { film: "Film", serial: "Serial", musik: "Musik" };
function Button({ title, onPress, disabled, secondary }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[s.button, secondary && s.secondary, disabled && { opacity: 0.5 }]}
    >
      <Text
        style={{ color: secondary ? "#382988" : "white", fontWeight: "600" }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
function Field({ label, ...props }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.text}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#697287"
        style={s.input}
        {...props}
      />
    </View>
  );
}
export default function App() {
  const [page, setPage] = useState("home"),
    [id, setId] = useState(null),
    [token, setToken] = useState(""),
    [user, setUser] = useState(null);
  const [items, setItems] = useState([]),
    [detail, setDetail] = useState(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [query, setQuery] = useState(""),
    [type, setType] = useState("semua"),
    [only, setOnly] = useState(false),
    [rating, setRating] = useState(5),
    [text, setText] = useState("");
  function navigate(p) {
    setError("");
    setNotice("");
    setPassword("");
    setPage(p);
  }
  function logout() {
    setToken("");
    setUser(null);
    setOnly(false);
    navigate("login");
  }
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (page !== "home") {
        navigate("home");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [page]);
  async function action(fn) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      if (e.status === 401 && token) logout();
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    setDetail(null);
    if (page === "home" || page === "detail") {
      setLoading(true);
      api(page === "home" ? "/contents" : "/contents/" + id, token)
        .then((data) => {
          if (!active) return;
          if (page === "home") setItems(data);
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
  }, [page, id, token]);
  const visible = items.filter(
    (c) =>
      (type === "semua" || type === c.type) &&
      c.title.toLowerCase().includes(query.toLowerCase()) &&
      (!only || user?.favorites.includes(c._id)),
  );
  async function submitAuth() {
    await action(async () => {
      const data = await api("/auth/" + page, "", "POST", {
        name,
        email,
        password,
      });
      setToken(data.token);
      setUser(data.user);
      navigate("home");
    });
  }
  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.safe}>
        <StatusBar style="dark" />
        <View style={s.header}>
          <Text style={s.brand}>EH · Entertainment Hub</Text>
          <Button
            title={user ? "Keluar" : "Masuk"}
            secondary
            onPress={() => (user ? logout() : navigate("login"))}
          />
        </View>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={s.body}
            keyboardShouldPersistTaps="handled"
          >
            {page !== "home" && (
              <Button
                title="← Beranda"
                secondary
                onPress={() => navigate("home")}
              />
            )}
            {!!error && (
              <Text accessibilityRole="alert" style={s.error}>
                {error}
              </Text>
            )}
            {!!notice && <Text style={s.notice}>{notice}</Text>}
            {page === "login" || page === "register" ? (
              <View style={s.card}>
                <Text style={s.eyebrow}>RUANG HIBURANMU</Text>
                <Text style={s.title}>
                  {page === "register" ? "Buat akun" : "Selamat datang"}
                </Text>
                <Text style={s.text}>
                  Simpan favorit dan bagikan pendapatmu.
                </Text>
                {page === "register" && (
                  <Field
                    label="Nama"
                    value={name}
                    onChangeText={setName}
                    maxLength={60}
                    autoComplete="name"
                  />
                )}
                <Field
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  maxLength={254}
                />
                <Field
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  maxLength={72}
                />
                <Text style={s.small}>
                  Minimal 8 karakter; maksimal 72 byte.
                </Text>
                <Button
                  title={
                    busy
                      ? "Memproses…"
                      : page === "register"
                        ? "Daftar"
                        : "Masuk"
                  }
                  disabled={busy}
                  onPress={submitAuth}
                />
                <Button
                  secondary
                  title={
                    page === "register"
                      ? "Sudah punya akun? Masuk"
                      : "Belum punya akun? Daftar"
                  }
                  onPress={() =>
                    navigate(page === "register" ? "login" : "register")
                  }
                />
              </View>
            ) : page === "home" ? (
              <>
                <View style={s.hero}>
                  <Text style={s.eyebrow}>FILM · SERIAL · MUSIK</Text>
                  <Text style={s.title}>Temukan hiburan untuk harimu.</Text>
                  <Text style={s.text}>
                    Jelajahi cerita dan simpan yang kamu suka.
                  </Text>
                </View>
                {user && <Text style={s.text}>Halo, {user.name}</Text>}
                <Field
                  label="Cari judul"
                  value={query}
                  onChangeText={setQuery}
                />
                <View style={s.row}>
                  {["semua", "film", "serial", "musik"].map((t) => (
                    <Button
                      key={t}
                      title={labels[t] || "Semua"}
                      secondary={type !== t}
                      onPress={() => setType(t)}
                    />
                  ))}
                </View>
                {user && (
                  <Button
                    title={only ? "Tampilkan semua konten" : "Favorit saya"}
                    secondary
                    onPress={() => setOnly(!only)}
                  />
                )}
                {loading ? (
                  <Text>Memuat konten…</Text>
                ) : (
                  visible.map((c) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={"Lihat " + c.title}
                      key={c._id}
                      style={s.card}
                      onPress={() => {
                        setId(c._id);
                        navigate("detail");
                      }}
                    >
                      <View
                        style={[
                          s.poster,
                          {
                            backgroundColor:
                              c.type === "film"
                                ? "#d9d3f7"
                                : c.type === "serial"
                                  ? "#cfe9e5"
                                  : "#f6dfc4",
                          },
                        ]}
                      >
                        <Text style={s.eyebrow}>
                          {labels[c.type]} · {c.year}
                        </Text>
                        <Text style={s.heading}>{c.title}</Text>
                      </View>
                      <Text style={s.heading}>{c.title}</Text>
                      <Text style={s.small}>{c.creator}</Text>
                    </Pressable>
                  ))
                )}
                {!loading && !visible.length && (
                  <Text>
                    Belum ada konten. Periksa filter atau jalankan seed.
                  </Text>
                )}
              </>
            ) : (
              <>
                {loading && <Text>Memuat detail…</Text>}
                {detail && (
                  <>
                    <View style={s.card}>
                      <Text style={s.eyebrow}>
                        {labels[detail.type]} · {detail.year}
                      </Text>
                      <Text style={s.title}>{detail.title}</Text>
                      <Text style={s.small}>{detail.creator}</Text>
                      <Text style={s.text}>{detail.description}</Text>
                      <Text style={s.heading}>
                        ★ {detail.average.toFixed(1)} / 5
                      </Text>
                      <Text>{detail.reviews.length} penilaian</Text>
                      <Button
                        title="Buka trailer / video ↗"
                        onPress={() =>
                          action(() => Linking.openURL(detail.videoUrl))
                        }
                      />
                      <Button
                        secondary
                        disabled={busy}
                        title={
                          user?.favorites.includes(id)
                            ? "Hapus favorit"
                            : "Tambah favorit"
                        }
                        onPress={() =>
                          user
                            ? action(async () =>
                                setUser(
                                  await api("/favorites/" + id, token, "PUT", {
                                    favorite: !user.favorites.includes(id),
                                  }),
                                ),
                              )
                            : navigate("login")
                        }
                      />
                    </View>
                    <View style={s.card}>
                      <Text style={s.heading}>Rating dan ulasan</Text>
                      {user ? (
                        <>
                          <Text style={s.text}>Pilih rating</Text>
                          <View style={s.row}>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Button
                                key={n}
                                title={String(n)}
                                secondary={n !== rating}
                                onPress={() => setRating(n)}
                              />
                            ))}
                          </View>
                          <Field
                            label="Ulasan (opsional)"
                            value={text}
                            onChangeText={setText}
                            multiline
                            maxLength={1000}
                          />
                          <Button
                            title="Simpan penilaian"
                            disabled={busy}
                            onPress={() =>
                              action(async () => {
                                await api(
                                  "/contents/" + id + "/review",
                                  token,
                                  "PUT",
                                  { rating, text },
                                );
                                setDetail(await api("/contents/" + id, token));
                                setNotice("Penilaian tersimpan.");
                              })
                            }
                          />
                          <Text style={s.small}>
                            Simpan lagi untuk memperbarui penilaian Anda.
                          </Text>
                        </>
                      ) : (
                        <Button
                          title="Masuk untuk memberi penilaian"
                          onPress={() => navigate("login")}
                        />
                      )}
                      {!detail.reviews.length && <Text>Belum ada ulasan.</Text>}
                      {detail.reviews.map((r) => (
                        <View key={r._id} style={s.review}>
                          <Text style={s.heading}>
                            {r.user?.name || "Pengguna"} · {r.rating}/5
                          </Text>
                          <Text style={s.text}>
                            {r.text || "Memberikan rating tanpa teks."}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}
            <Text style={s.small}>Entertainment Hub · Proyek belajar</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f6fa" },
  header: { padding: 16, backgroundColor: "white", gap: 8 },
  brand: { fontSize: 20, fontWeight: "800", color: "#382988" },
  body: { padding: 20, gap: 18, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: "800", color: "#17213b", lineHeight: 36 },
  heading: { fontSize: 19, fontWeight: "700", color: "#17213b" },
  text: { fontSize: 16, lineHeight: 24, color: "#17213b" },
  small: { fontSize: 13, color: "#59647a" },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4938bf",
    letterSpacing: 1,
  },
  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: "#e1e4ef",
  },
  hero: { padding: 24, backgroundColor: "#e9e6fb", borderRadius: 18, gap: 16 },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#5543cc",
    borderRadius: 10,
    alignItems: "center",
    minHeight: 44,
  },
  secondary: { backgroundColor: "#e9e6fb" },
  input: {
    borderWidth: 1,
    borderColor: "#aab2c4",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#17213b",
    backgroundColor: "white",
    minHeight: 48,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  poster: {
    padding: 20,
    minHeight: 135,
    justifyContent: "space-between",
    borderRadius: 10,
  },
  review: { borderTopWidth: 1, borderColor: "#e1e4ef", paddingTop: 16, gap: 8 },
  error: {
    color: "#8a1d1d",
    backgroundColor: "#fde8e8",
    padding: 14,
    borderRadius: 8,
  },
  notice: {
    color: "#185634",
    backgroundColor: "#dcf3e7",
    padding: 14,
    borderRadius: 8,
  },
});
