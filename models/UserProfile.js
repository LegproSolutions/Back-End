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
  
  // Basic personal information
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  middleName: { type: String },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  alternatePhone: { type: String },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, required: true },
  maritalStatus: { type: String },
  nationality: { type: String, default: "Indian" },
  fatherName: { type: String },
  aadharNumber: { type: String },
  
  // Address information
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    pincode: String,
    landmark: String,
  },
  permanentAddress: {
    street: String,
    city: String,
    state: String,
    country: String,
    pincode: String,
    landmark: String,
  },
  
  // Education (Map structure)
  education: {
    type: Map,
    of: educationFieldSchema,
    default: {},
  },
  
  // Experience array
  experience: [
    {
      company: String,
      position: String,
      startDate: Date,
      endDate: Date,
      description: String,
    },
  ],
  
  // Professional Information
  professional: {
    currentJobTitle: String,
    currentCompany: String,
    workExperience: String,
    currentSalary: String,
    expectedSalary: String,
    noticePeriod: String,
    workMode: String,
    preferredLocations: [String],
    industryExperience: [String],
    availableFrom: String,
  },
  
  // Skills (basic array for backward compatibility)
  skills: [String],
  
  // Detailed skills breakdown
  skillsDetailed: {
    technical: [String],
    soft: [String],
    certifications: [String],
  },
  
  // Languages
  languages: [
    {
      name: String,
      proficiency: String,
    },
  ],
  
  // Documents
  documents: {
    resume: mongoose.Schema.Types.Mixed,
    profilePicture: mongoose.Schema.Types.Mixed,
    portfolio: mongoose.Schema.Types.Mixed,
  },
  
  // Social Media and Portfolio Links
  socialLinks: {
    linkedin: String,
    github: String,
    portfolio: String,
    website: String,
    other: [{
      platform: String,
      url: String,
    }],
  },
  
  // Job Preferences
  preferences: {
    jobTypes: [String],
    workShifts: [String],
    disabilities: String,
    careerObjective: String,
  },
  
  // Backward compatibility fields
  resume: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  profilePicture: String,
  
  // Timestamps
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
