import mongoose from "mongoose";

// Define Admin Schema
const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    }
  }
);

// Create User Model
const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
