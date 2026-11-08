import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { User, Content, Review } from "./models.js";
// Middleware umum berlaku sebelum endpoint di bawah.
export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: (process.env.WEB_ORIGIN || "http://localhost:5173")
      .split(",")
      .map((s) => s.trim()),
  }),
);
app.use(express.json({ limit: "16kb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: 60000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Terlalu banyak permintaan. Tunggu satu menit." },
  }),
);
const authLimit = rateLimit({
  windowMs: 15 * 60000,
  limit: 30,
  skip: () => process.env.NODE_ENV === "test",
  message: { message: "Terlalu banyak percobaan. Tunggu 15 menit." },
});
const fail = (status, message) => Object.assign(new Error(message), { status });
const clean = (value) => (typeof value === "string" ? value.trim() : "");
const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  favorites: u.favorites,
});
const session = (u) => ({
  user: publicUser(u),
  token: jwt.sign({}, process.env.JWT_SECRET, {
    subject: u.id,
    expiresIn: "1d",
    algorithm: "HS256",
  }),
});
// ID pemilik data selalu berasal dari token, bukan input pengguna.
async function auth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ");
    if (token?.[0] !== "Bearer") throw Error();
    const data = jwt.verify(token[1], process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    req.user = await User.findById(data.sub);
    if (!req.user) throw Error();
  } catch {
    return next(fail(401, "Sesi berakhir. Silakan login kembali."));
  }
  next();
}
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.post("/api/auth/register", authLimit, async (req, res) => {
  const name = clean(req.body.name),
    email = clean(req.body.email).toLowerCase(),
    password = req.body.password;
  if (
    name.length < 2 ||
    name.length > 60 ||
    email.length > 254 ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password) > 72
  )
    throw fail(
      400,
      "Nama 2–60 karakter, email valid, password 8–72 byte diperlukan.",
    );
  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 12),
  });
  res.status(201).json(session(user));
});
app.post("/api/auth/login", authLimit, async (req, res) => {
  const email = clean(req.body.email).toLowerCase(),
    password = req.body.password;
  if (typeof password !== "string" || Buffer.byteLength(password) > 72)
    throw fail(400, "Data login tidak valid.");
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password)))
    throw fail(401, "Email atau password salah.");
  res.json(session(user));
});
app.get("/api/me", auth, (req, res) => res.json(publicUser(req.user)));
app.get("/api/contents", async (req, res) =>
  res.json(await Content.find().sort({ title: 1 })),
);
app.param("id", (req, res, next, id) =>
  mongoose.isObjectIdOrHexString(id)
    ? next()
    : next(fail(400, "ID tidak valid.")),
);
app.get("/api/contents/:id", async (req, res) => {
  const content = await Content.findById(req.params.id);
  if (!content) throw fail(404, "Konten tidak ditemukan.");
  const reviews = await Review.find({ content: content.id })
    .populate("user", "name")
    .sort({ updatedAt: -1 })
    .lean();
  res.json({
    ...content.toObject(),
    reviews,
    average: reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0,
  });
});
app.put("/api/contents/:id/review", auth, async (req, res) => {
  const { rating } = req.body,
    text = clean(req.body.text);
  if (
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    text.length > 1000 ||
    (req.body.text !== undefined && typeof req.body.text !== "string")
  )
    throw fail(400, "Rating harus 1–5 dan ulasan maksimal 1000 karakter.");
  if (!(await Content.exists({ _id: req.params.id })))
    throw fail(404, "Konten tidak ditemukan.");
  const review = await Review.findOneAndUpdate(
    { user: req.user.id, content: req.params.id },
    { rating, text },
    { upsert: true, new: true, runValidators: true },
  );
  res.json(review);
});
app.put("/api/favorites/:id", auth, async (req, res) => {
  if (typeof req.body.favorite !== "boolean")
    throw fail(400, "favorite harus boolean.");
  if (!(await Content.exists({ _id: req.params.id })))
    throw fail(404, "Konten tidak ditemukan.");
  const update = req.body.favorite
    ? { $addToSet: { favorites: req.params.id } }
    : { $pull: { favorites: req.params.id } };
  const user = await User.findByIdAndUpdate(req.user.id, update, { new: true });
  res.json(publicUser(user));
});
app.use((req, res) =>
  res.status(404).json({ message: "Endpoint tidak ditemukan." }),
);
app.use((err, req, res, next) => {
  const status =
    err.code === 11000
      ? 409
      : err.status || (err.name === "ValidationError" ? 400 : 500);
  if (status === 500) console.error(err.name); // Jangan mencetak password, token, atau URI database.
  res
    .status(status)
    .json({
      message:
        err.code === 11000
          ? "Data sudah terdaftar."
          : status === 500
            ? "Terjadi kesalahan server."
            : err.message,
    });
});
