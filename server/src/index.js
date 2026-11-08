import { validateConfig } from "./config.js";
import mongoose from "mongoose";
import { app } from "./app.js";
import { User, Review } from "./models.js";
try {
  validateConfig();
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([User.init(), Review.init()]);
  app.listen(process.env.PORT || 4000, "0.0.0.0", () =>
    console.log("API siap pada port " + (process.env.PORT || 4000)),
  );
} catch (error) {
  console.error("Server gagal dimulai:", error.message);
  process.exit(1);
}
