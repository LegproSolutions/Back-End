// import mongoose from "mongoose";

// const userProfileSchema = new mongoose.Schema({
//   userId: { type: String, ref: "User", required: true },
//   firstName: { type: String, required: true },
//   lastName: { type: String, required: true },
//   gender: { type: String, required: true },
//   dateOfBirth: { type: Date, required: true },
//   email: { type: String, required: true },
//   phone: { type: String, required: true },
//   address: {
//     street: String,
//     city: String,
//     state: String,
//     country: String,
//     pincode: String
//   },
//   education: [{
//     degree: String,
//     institution: String,
//     yearOfPassing: Number,
//     percentage: Number
//   }],
//   experience: [{
//     company: String,
//     position: String,
//     startDate: Date,
//     endDate: Date,
//     description: String
//   }],
//   skills: [String],
//   languages: [{
//     name: String,
//     proficiency: String
//   }],
//   resume: String,
//   profilePicture: String,
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now }
// });

// const UserProfile = mongoose.model("UserProfile", userProfileSchema);

// export default UserProfile;

import mongoose from "mongoose";

const educationFieldSchema = new mongoose.Schema(
  {
    instituteType: { type: String, required: true },
    instituteFields: {
      instituteName: { type: String, required: true },
      certificationBody: { type: String, required: true },
      passingYear: { type: Number, required: true },
      percentage: { type: Number, required: true },
      courseType: { type: String },
      courseDuration: { type: Number },
      specialization: { type: String },
      courseName: { type: String },
      trade: { type: String },
    },
  },
  { _id: false }
);

const userProfileSchema = new mongoose.Schema({
  userId: { type: String, ref: "User", required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  aadharNumber: { type: String, required: true },
  fatherName: { type: String },
  gender: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    pincode: String,
  },
  // Updated education field as a Map keyed by education level.
  education: {
    type: Map,
    of: educationFieldSchema,
    default: {},
  },
  experience: [
    {
      company: String,
      position: String,
      startDate: Date,
      endDate: Date,
      description: String,
    },
  ],
  skills: [String],
  languages: [
    {
      name: String,
      proficiency: String,
    },
  ],
  resume: String,
  profilePicture: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Optionally, update the updatedAt timestamp on save
userProfileSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const UserProfile = mongoose.model("UserProfile", userProfileSchema);

export default UserProfile;
