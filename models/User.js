import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String},
  password: { type: String },
  resume: { type: String },
  image: { type: String },
});

const User = mongoose.model("User", userSchema);

export default User;
