import bcrypt from "bcrypt";
import Admin from "../models/Admin.js";
import jwt from "jsonwebtoken";
import Company from "../models/Company.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import UserProfile from "../models/UserProfile.js";
import JobApplication from "../models/JobApplication.js";
import mongoose from "mongoose";

// Direct admin credentials constant
const DIRECT_ADMIN = {
  name: "Admin Abhisek",
  email: "AdminAbhisek@JobMela.com",
  password: "Pass1125@"
};

// Function to add the direct admin (call this once to create the admin)
export const addDirectAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: DIRECT_ADMIN.email });
    if (existingAdmin) {
      console.log("Direct admin already exists");
      return { success: false, message: "Admin already exists" };
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(DIRECT_ADMIN.password, salt);

    // Create admin
    const admin = await Admin.create({
      name: DIRECT_ADMIN.name,
      email: DIRECT_ADMIN.email,
      password: hashPassword,
    });

    console.log("Direct admin created successfully:", admin.email);
    return { success: true, message: "Direct admin created successfully", admin };
  } catch (error) {
    console.error("Error creating direct admin:", error);
    return { success: false, message: error.message };
  }
};

//Register a admin
export const registerAdmin = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.json({ success: false, message: "Missing Details" });
  }

  try {
    // Check if Admin already exists
    const AdminExists = await Admin.findOne({ email }).lean();
    if (AdminExists) {
      return res.json({
        success: false,
        message: "Admin already registered",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    // Create Admin
    const admin = await Admin.create({
      name,
      email,
      password: hashPassword,
    });

    // Generate JWT token
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });

    res.json({
      success: true,
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
      },
      message: "Admin registered successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const loginAdmin = async (req, res) => {
  const { email, password, passKey } = req.body;
  try {
    // Check if the Admin exists
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.json({ success: false, message: "Invalid email or password" });
    }

    // Compare the password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid email or password" });
    }
    // Compare Passkey
    if (passKey !== "NAVGAP2025BJ") {
      return res.json({ success: false, message: "Access Denied !!" });
    }
    // Generate JWT token
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });

    res.json({
      success: true,
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,

      },
      message: "Admin Login successful",
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Logout Admin
export const logoutAdmin = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.json({
      success: true,
      message: "Admin Logout successful",
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get company data
export const getAdminData = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id)
      .select("-password")
      .lean(); // returns plain objects, which are faster to create
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }
    res.json({ success: true, admin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// unverifiedRecruiters 
export const unverifiedRecruiters = async (req, res) => {
  try {
    const unverified = await Company.find({ isVerified: false }).select("-password"); // exclude password
    res.json({ success: true, data: unverified });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// AllRecruiters 
export const allRecruiters = async (req, res) => {
  try {
    const allRecruitersData = await Company.find().select("-password"); // exclude password
    res.status(200).json({ success: true, recruiters: allRecruitersData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// AllUser 
export const allUser = async (req, res) => {
  try {
    const allUserData = await User.find().select("-password");
    res.status(200).json({ success: true, users: allUserData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//Get  User Profile  

export const getUserProfileById = async (req, res) => {
  try {
    const userId = req.params.userId; // Get userId from URL

    const profile = await UserProfile.findOne({ userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// unverifiedPost
// /api/admin/unverified-jobs

export const unverifiedPost = async (req, res) => {
  try {
    const jobs = await Job.find({ visible: true, isVerified: false })
      .populate({ path: 'companyId', select: '-password' })

    res.status(200).json({ success: true, jobs })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export const viewApplicant = async (req, res) => {
  try {
    const jobs = await Job.find({ visible: true, isVerified: false, viewApplicant: false })
      .populate({ path: 'companyId', select: '-password' })

    res.json({ success: true, jobs })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

// controllers/jobController.js
export const verifyJobByAdmin = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    job.isVerified = true;
    await job.save();
    res.status(200).json({
      success: true,
      message: "Job verified successfully",
      job,
    });
  } catch (error) {
    console.error("Error verifying job:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};


//VerifyRecruiter
// 

export const verifyRecruiter = async (req, res) => {
  try {
    const { recruiterId } = req.params;

    const recruiter = await Company.findById(recruiterId);
    if (!recruiter) {
      return res.status(404).json({ success: false, message: "Recruiter not found" });
    }

    recruiter.isVerified = true;
    await recruiter.save();

    res.json({ success: true, message: "Recruiter verified successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// Toggle Access 
export const TogglePremiumAccessRecruiter = async (req, res) => {
  try {
    const { recruiterId } = req.params;

    const recruiter = await Company.findById(recruiterId);
    if (!recruiter) {
      return res.status(404).json({ success: false, message: "Recruiter not found" });
    }

    recruiter.havePremiumAccess = !recruiter.havePremiumAccess;
    await recruiter.save();

    res.json({ success: true, message: "Updated premium access" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// NEW: Controller to raise an objection for a job post
export const raiseJobObjection = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Objection message is required." });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found." });
    }

    // Add the new objection to the objections array
    job.isEdited = false;
    job.objectionsTrack.push({ message: message, timestamp: new Date() });
    job.objections.push({ message: message, timestamp: new Date() });
    await job.save();

    res.status(200).json({
      success: true,
      message: "Objection raised successfully!",
      job: job // Return the updated job object
    });
  } catch (error) {
    console.error("Error raising job objection:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while raising objection.",
    });
  }
};

// Controller function to get job applications for a specific user
export const getUserJobApplications = async (req, res) => {
  try {
    const userId = req.params.userId; // Get userId from URL parameters
    // Find all job applications for the given userId
    // Populate companyId and jobId to get detailed information about them
    const applications = await JobApplication.find({ userId })
      .populate("companyId", "name email image") // Populate company details (name, email, image)
      .populate("jobId", "title description location category level salary") // Populate job details (title, description, location, etc.)
      .exec(); // Execute the query
    // Check if any applications were found
    if (!applications || applications.length === 0) {
      return res.json({
        success: false,
        message: "No job applications found for this user.",
      });
    }

    // If applications are found, send them in the response
    return res.json({ success: true, applications });
  } catch (error) {
    console.error("Error in getUserJobApplications:", error); // Log the error for debugging
    res.status(500).json({ success: false, message: error.message }); // Send a 500 status for server errors
  }
};

// NEW: Controller to get all job posts by a specific company (recruiter)
export const getCompanyPostedJobs = async (req, res) => {
  try {
    const companyId = req.params.companyId; // Company ID from URL params

    const jobsData = await Job.aggregate([
      {
        $match: { companyId: new mongoose.Types.ObjectId(companyId) }, // Match jobs by companyId
      },
      // Get job application count
      {
        $lookup: {
          from: "jobapplications", // The collection name for JobApplication model
          localField: "_id",
          foreignField: "jobId",
          as: "applications",
        },
      },
      {
        $addFields: {
          applicants: { $size: "$applications" }, // Count the number of applications
        },
      },
      {
        $project: {
          applications: 0, // Exclude the raw applications array from the final output
        },
      },
      // Populate companyId (full document)
      {
        $lookup: {
          from: "companies", // The collection name for Company model
          localField: "companyId",
          foreignField: "_id",
          as: "companyId", // This will be an array, so unwind it
        },
      },
      {
        $unwind: "$companyId", // Unwind the companyId array
      },
    ]);

    res.json({ success: true, jobs: jobsData });
  } catch (error) {
    console.error("Error in getCompanyPostedJobs:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// NEW: Controller to get applicants for a specific job (for admin view)
// Note: The original getCompanyJobApplicants expected companyId from req.company._id.
// For admin, we are fetching by jobId directly.
export const getCompanyJobApplicants = async (req, res) => {
  try {
    const { jobId } = req.params; // Get jobId from URL parameters

    // Find job applications for the given jobId
    const applications = await JobApplication.find({ jobId })
      .populate("userId", "name image resume email") // Populate user details (name, image, resume, email)
      .populate("jobId", "title location category level salary") // Populate job details
      .exec();

    if (!applications || applications.length === 0) {
      return res.json({
        success: false,
        message: "No applicants found for this job.",
      });
    }

    // Normalize the applicationData field if it has extra nesting
    const normalizedApplications = applications.map((app) => {
      const appObj = app.toObject();
      if (appObj.applicationData && appObj.applicationData.applicationData) {
        appObj.applicationData = appObj.applicationData.applicationData;
      }
      return appObj;
    });

    return res.json({ success: true, applications: normalizedApplications });
  } catch (error) {
    console.error("Error in getCompanyJobApplicants:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Credit system removed

