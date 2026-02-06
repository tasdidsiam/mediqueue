import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ["admin", "doctor", "patient"],
      default: "patient"
    },

    approved: {
      type: Boolean,
      default: false
    },

    isActive: {
      type: Boolean,
      default: true
    },

    // doctor login account এর জন্য
    licenseNumber: {
      type: String,
      unique: true,
      sparse: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
