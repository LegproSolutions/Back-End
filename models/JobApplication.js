import mongoose from "mongoose";

const JobApplicationSchema = new mongoose.Schema({
  userId: { type: String, ref: "User", required: true },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  applicationData: { type: Object, required: true }, // New field to store form details
  status: { 
    type: String, 
    enum: ["pending", "accepted", "rejected", "under_review", "interviewed", "onboarded"], 
    default: "pending" 
  },
  interview: { type: String, default: "Not Interviewed" },
  onboarding: { type: String, default: "Not Onboarded" },
  date: { type: Number, required: true },
  // New fields for admin review tracking
  reviewedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Admin",
    default: null 
  },
  reviewedAt: { 
    type: Date, 
    default: null 
  },
  rejectionReason: { 
    type: String, 
    default: null 
  },
}, {
  timestamps: true // This will add createdAt and updatedAt automatically
});

const JobApplication = mongoose.model("JobApplication", JobApplicationSchema);

export default JobApplication;
