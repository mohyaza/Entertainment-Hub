import "dotenv/config";
import mongoose from "mongoose";
import { Content } from "./models.js";
import { seedData } from "./data.js";
try {
  if (!process.env.MONGODB_URI) throw Error("Isi MONGODB_URI dahulu");
  await mongoose.connect(process.env.MONGODB_URI);
  for (const item of seedData)
    await Content.updateOne(
      { slug: item.slug },
      { $set: item },
      { upsert: true },
    );
  console.log("6 konten siap. Akun, favorit, dan ulasan tidak dihapus.");
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
