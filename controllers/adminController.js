import bcrypt from "bcrypt";
import Admin from "../models/Admin.js";
import jwt from "jsonwebtoken";
import Company from "../models/Company.js";
import Job from "../models/Job.js";
import UserProfile from "../models/UserProfile.js";
import JobApplication from "../models/JobApplication.js";
import mongoose from "mongoose";
import { v2 as cloudinary } from 'cloudinary';
import multer from "multer";
import csv from "csv-parser";
import stream from "stream";
import Candidate from "../models/Candidate.js";
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

// AllUser 
export const allUser = async (req, res) => {
  try {
    const allUserData = await UserProfile.find().select("-password");
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


// Create Job Post by Admin (with auto company creation)
export const createJobByAdmin = async (req, res) => {
  try {
    // Support both JSON and multipart/form-data
    const body = req.body || {};
    const file = req.file; // multer single('companyImage')

    const title = body.title;
    const description = body.description || body.jobDescription; // rich text
    const location = body.location;
    const category = body.category;
    const deadline = body.deadline;
    const level = body.level;
    const experience = body.experience;
    const salary = body.salary;
    const openings = body.openings;
    const employmentType = body.employmentType;
    const requirements = body.requirements ? (Array.isArray(body.requirements) ? body.requirements : [body.requirements]) : [];

    // Company details
    const companyId = body.companyId;
    const companyName = body.companyName || body["companyDetails[name]"]; // fallback if nested form keys used
    const shortDescription = body.companyDescription || body.shortDescription || body["companyDetails[shortDescription]"]; // rich text
    const city = body.companyCity || body.city || body["companyDetails[city]"];
    const state = body.companyState || body.state || body["companyDetails[state]"];
    const country = body.companyCountry || body.country || body["companyDetails[country]"];
    const hrName = body.hrName || body["companyDetails[hrName]"];
    const hrEmail = body.hrEmail || body.companyEmail || body["companyDetails[hrEmail]"];
    const hrPhone = body.hrPhone || body.companyPhone || body["companyDetails[hrPhone]"];
    const companyEmail = body.companyEmail || body["companyDetails[email]"]; 
    const companyPhone = body.companyPhone || body["companyDetails[phone]"];
    const companyPassword = body.companyPassword || body["companyDetails[password]"];

    let finalCompanyId;
    let finalCompanyDetails;

    // Check if company ID is provided (existing company)
    if (companyId) {
      const existingCompany = await Company.findById(companyId);
      if (!existingCompany) {
        return res.status(404).json({
          success: false,
          message: "Selected company not found"
        });
      }
      finalCompanyId = companyId;
      finalCompanyDetails = {
        name: existingCompany.name,
        shortDescription: shortDescription || `${existingCompany.name} is a leading company`,
        city,
        state,
        country,
        hrName: hrName || existingCompany.name,
        hrEmail: hrEmail || existingCompany.email,
        hrPhone: hrPhone || existingCompany.phone
      };
    } else {
      // Create new company if it doesn't exist
      let existingCompany = null;
      if (companyId) {
        existingCompany = await Company.findById(companyId);
      } else {
        // Normalize companyName for search
        const normalizedName = (companyName || "").trim().toLowerCase();
        existingCompany = await Company.findOne({ name: { $regex: `^${normalizedName}$`, $options: "i" } });
      }

      // Only use existing company if both name and email match
      if (
        existingCompany &&
        existingCompany.name.trim().toLowerCase() === (companyName || "").trim().toLowerCase() &&
        existingCompany.email.trim().toLowerCase() === (companyEmail || "").trim().toLowerCase()
      ) {
        // Use existing company
        finalCompanyId = existingCompany._id;
        finalCompanyDetails = {
          name: existingCompany.name,
          shortDescription: shortDescription || `${existingCompany.name} is a leading company`,
          city,
          state,
          country,
          hrName: hrName || existingCompany.name,
          hrEmail: hrEmail || existingCompany.email,
          hrPhone: hrPhone || existingCompany.phone
        };
      } else {
        // Create new company (even if email matches, if name is different)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(companyPassword || 'DefaultPass123!', salt);

        // Upload logo to Cloudinary if provided
        let imageUrl = 'https://cdn.iconscout.com/icon/premium/png-256-thumb/building-icon-svg-download-png-1208046.png?f=webp&w=128';
        if (file && file.buffer) {
          const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({ folder: 'companies', resource_type: 'image' }, (err, result) => {
              if (err) return reject(err);
              resolve(result);
            });
            stream.end(file.buffer);
          });
          imageUrl = uploadResult?.secure_url || imageUrl;
        }

        const newCompany = await Company.create({
          name: companyName,
          email: companyEmail,
          phone: companyPhone,
          image: imageUrl,
          password: hashedPassword,
          isVerified: true // Auto-verify since admin is creating
        });

        finalCompanyId = newCompany._id;
        finalCompanyDetails = {
          name: companyName,
          shortDescription: shortDescription || `${companyName} is a leading company`,
          city,
          state,
          country,
          hrName: hrName || companyName,
          hrEmail: hrEmail || companyEmail,
          hrPhone: hrPhone || companyPhone
        };
      }
    }

    // Create the job post
    const job = await Job.create({
      title,
      description,
      location,
      category,
      deadline: new Date(deadline),
      level,
      experience,
      salary,
      openings,
      date: new Date(),
      requirements: Array.isArray(requirements) ? requirements : [requirements],
      employmentType,
      companyId: finalCompanyId,
      companyDetails: finalCompanyDetails,
      // Track which admin created this job (primary admin or sub-admin)
      createdBy: req.admin?._id,
      visible: true,
      isVerified: true, // Auto-verify since admin is creating
      isViewApplicant: false
    });

    // Populate company details in response
    const populatedJob = await Job.findById(job._id).populate('companyId', 'name email phone image isVerified');

    res.status(201).json({
      success: true,
      message: "Job created successfully by admin",
      job: populatedJob
    });

  } catch (error) {
    console.error("Error creating job by admin:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all companies for dropdown selection
export const getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.find({}, 'name email phone image isVerified')
      .sort({ name: 1 });

    res.json({
      success: true,
      companies
    });
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get jobs for admin dashboard. If admin is a sub-admin, return only jobs created by them.
export const getAdminJobs = async (req, res) => {
  try {
    const admin = req.admin;
    const filter = {};

    if (admin && admin.role === 'sub-admin') {
      filter.createdBy = admin._id;
    }

    const jobs = await Job.find(filter)
      .populate({ path: 'companyId', select: '-password' })
      .sort({ date: -1 });

    return res.json({ success: true, jobs });
  } catch (error) {
    console.error('Error fetching admin jobs:', error);
    return res.status(500).json({ success: false, message: error.message });
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
      .populate("userId", "name image resume email phone") // Populate user details (name, image, resume, email)
      .populate("jobId", "title location category level salary") // Populate job details
      .populate("reviewedBy", "name email") // Populate admin who reviewed
      .exec();

    if (!applications || applications.length === 0) {
      return res.json({
        success: false,
        message: "No applicants found for this job.",
      });
    }

    // Normalize the applicationData field if it has extra nesting and add status info
    const normalizedApplications = applications.map((app) => {
      const appObj = app.toObject();
      if (appObj.applicationData && appObj.applicationData.applicationData) {
        appObj.applicationData = appObj.applicationData.applicationData;
      }
      
      // Ensure status is lowercase for frontend consistency
      appObj.status = appObj.status ? appObj.status.toLowerCase() : 'pending';
      
      return appObj;
    });

    return res.json({ success: true, applications: normalizedApplications });
  } catch (error) {
    console.error("Error in getCompanyJobApplicants:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// NEW: Update Job by Admin
export const updateJobByAdmin = async (req, res) => {
  try {
    const { jobId } = req.params;
    const body = req.body || {};

    const allowedFields = [
      "title",
      "description",
      "location",
      "category",
      "deadline",
      "level",
      "experience",
      "salary",
      "openings",
      "employmentType",
      "requirements",
      "visible",
      // allow admin to change job's company reference and optional company location overrides
      "companyId",
      "companyCity",
      "companyState",
      "companyCountry",
    ];

    const update = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    // Normalize some fields
    if (update.deadline) update.deadline = new Date(update.deadline);
    if (update.experience !== undefined) update.experience = parseInt(update.experience);
    if (update.salary !== undefined) update.salary = parseInt(update.salary);
    if (update.openings !== undefined) update.openings = parseInt(update.openings);
    if (update.requirements && !Array.isArray(update.requirements)) {
      update.requirements = [update.requirements];
    }

    // If companyId provided, derive companyDetails from the Company doc and any overrides provided
    if (body.companyId) {
      const companyDoc = await Company.findById(body.companyId);
      if (!companyDoc) {
        return res.status(404).json({ success: false, message: "Selected company not found" });
      }

      update.companyId = body.companyId;
      update.companyDetails = {
        name: companyDoc.name,
        shortDescription: body.shortDescription || companyDoc.shortDescription || `${companyDoc.name} is a leading company`,
        city: body.companyCity || companyDoc.city || "",
        state: body.companyState || companyDoc.state || "",
        country: body.companyCountry || companyDoc.country || "",
        hrName: body.hrName || companyDoc.name,
        hrEmail: body.hrEmail || companyDoc.email,
        hrPhone: body.hrPhone || companyDoc.phone,
      };
    }

    // Ensure companyDetails is present for validation: if not changed by the request, reuse existing values
    const existingJob = await Job.findById(jobId).lean();
    if (!existingJob) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (!update.companyDetails) {
      // Merge any flat overrides (companyCity/companyState/companyCountry/shortDescription/hr fields) onto existing companyDetails
      update.companyDetails = {
        name: existingJob.companyDetails?.name || "",
        shortDescription: body.shortDescription || existingJob.companyDetails?.shortDescription || `${existingJob.companyDetails?.name || 'Company'} is a leading company`,
        city: body.companyCity || existingJob.companyDetails?.city || "",
        state: body.companyState || existingJob.companyDetails?.state || "",
        country: body.companyCountry || existingJob.companyDetails?.country || "",
        hrName: body.hrName || existingJob.companyDetails?.hrName || "",
        hrEmail: body.hrEmail || existingJob.companyDetails?.hrEmail || "",
        hrPhone: body.hrPhone || existingJob.companyDetails?.hrPhone || "",
      };
    }

    // Remove any flat company* fields from update to avoid storing unexpected fields
    delete update.companyCity;
    delete update.companyState;
    delete update.companyCountry;
    delete update.hrName;
    delete update.hrEmail;
    delete update.hrPhone;

    const updatedJob = await Job.findByIdAndUpdate(jobId, update, {
      new: true,
      runValidators: true,
    }).populate('companyId', 'name email phone image isVerified');

    if (!updatedJob) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    return res.json({ success: true, message: "Job updated successfully", job: updatedJob });
  } catch (error) {
    console.error("Error updating job by admin:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Accept job application
export const changeApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    // Validate applicationId
    if (!mongoose.isValidObjectId(applicationId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid application ID" 
      });
    }

    // Find and update the application status
    const application = await JobApplication.findByIdAndUpdate(
      applicationId,
      { 
        status: status,
        reviewedBy: req.admin.id,
        reviewedAt: new Date()
      },
      { 
        new: true,
        runValidators: true 
      }
    ).populate('userId', 'name email phone')
     .populate('jobId', 'title companyId');

    if (!application) {
      return res.status(404).json({ 
        success: false, 
        message: "Application not found" 
      });
    }

    // Optional: Send email notification to applicant (implement if needed)
    // await sendAcceptanceEmail(application.userId.email, application.jobId.title);

    return res.json({
      success: true,
      message: "Application accepted successfully",
      application
    });

  } catch (error) {
    console.error("Error accepting application:", error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Get application status statistics for a job (optional utility function)
export const getJobApplicationStats = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Validate jobId
    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid job ID" 
      });
    }

    // Get application statistics
    const stats = await JobApplication.aggregate([
      { $match: { jobId: new mongoose.Types.ObjectId(jobId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Format the results
    const formattedStats = {
      total: 0,
      pending: 0,
      accepted: 0,
      rejected: 0
    };

    stats.forEach(stat => {
      formattedStats.total += stat.count;
      formattedStats[stat._id || 'pending'] = stat.count;
    });

    return res.json({
      success: true,
      stats: formattedStats
    });

  } catch (error) {
    console.error("Error getting application stats:", error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const createSubAdmin = async (req, res) => {
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
      role: 'sub-admin'
    });

    res.json({
      success: true,
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      },
      message: "Sub-Admin created successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllSubAdmins = async (req, res) => {
  try {
    const subAdmins = await Admin.find({ role: 'sub-admin' }).select("-password").lean();
    res.status(200).json({ success: true, subAdmins });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSubAdmin = async (req, res) => {
  try {
    const { subAdminId } = req.params;

    // Validate subAdminId
    if (!mongoose.isValidObjectId(subAdminId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid Sub-Admin ID" 
      });
    }

    const deletedSubAdmin = await Admin.findOneAndDelete({ _id: subAdminId, role: 'sub-admin' });

    if (!deletedSubAdmin) {
      return res.status(404).json({ 
        success: false, 
        message: "Sub-Admin not found" 
      });
    }

    res.json({
      success: true,
      message: "Sub-Admin deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting Sub-Admin:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};
// Vercel safe (important)
const storage = multer.memoryStorage();
export const upload = multer({ storage });

// Upload CSV and save to MongoDB
export const uploadCandidatesCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file required" });
    }

    const results = [];

    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    bufferStream
      .pipe(csv())
      .on("data", (data) => {
        results.push({
          name: data.name,
          email: data.email,
          phone: data.phone,
        });
      })
      .on("end", async () => {
        // Save all records to MongoDB
        await Candidate.insertMany(results);

        res.json({
          message: "Data uploaded & saved to MongoDB",
          totalInserted: results.length,
        });
      });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
