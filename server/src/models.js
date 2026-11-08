import mongoose from "mongoose";
const { Schema, model } = mongoose;
export const User = model(
  "User",
  new Schema(
    {
      name: { type: String, required: true, maxlength: 60 },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true, select: false },
      favorites: [{ type: Schema.Types.ObjectId, ref: "Content" }],
    },
    { timestamps: true },
  ),
);
export const Content = model(
  "Content",
  new Schema({
    slug: { type: String, unique: true, required: true },
    title: String,
    type: { type: String, enum: ["film", "serial", "musik"] },
    year: Number,
    description: String,
    creator: String,
    videoUrl: String,
  }),
);
const reviewSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: Schema.Types.ObjectId, ref: "Content", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    text: { type: String, maxlength: 1000, default: "" },
  },
  { timestamps: true },
);
reviewSchema.index({ user: 1, content: 1 }, { unique: true });
export const Review = model("Review", reviewSchema);
