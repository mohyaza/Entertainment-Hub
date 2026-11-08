import "dotenv/config";
export function validateConfig() {
  if (!process.env.MONGODB_URI)
    throw new Error("Isi MONGODB_URI pada server/.env");
  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET.length < 32 ||
    process.env.JWT_SECRET.startsWith("GANTI")
  )
    throw new Error("Ganti JWT_SECRET dengan nilai acak minimal 32 karakter");
}
