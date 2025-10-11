import Company from "../models/Company.js";
import bcrypt from "bcrypt";
import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";
import Job from "../models/Job.js";
import JobApplication from "../models/JobApplication.js";

const uploadToCloudinary = (imageBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: "image", folder: "company_images" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(imageBuffer);
  });
};

//Register a company
export const registerCompany = async (req, res) => {
  const { name, email, phone, password } = req.body;
  const imageFile = req.file;

  if (!name || !email || !phone || !password || !imageFile) {
    return res.json({ success: false, message: "Missing Details" });
  }

  try {
    // Check if company already exists
    const companyExists = await Company.findOne({ email }).lean();
    if (companyExists) {
      return res.json({
        success: false,
        message: "Company already registered",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    // Upload image to Cloudinary
    const imageUrl = await uploadToCloudinary(imageFile.buffer);

    // Create company
    const company = await Company.create({
      name,
      email,
      phone,
      password: hashPassword,
      image: imageUrl,
    });

    // Generate JWT token
    const token = jwt.sign({ id: company._id }, process.env.JWT_SECRET, {
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
      company: {
        _id: company._id,
        name: company.name,
        email: company.email,
        phone: company.phone,
        image: company.image,
      },
      message: "Company registered successfully",
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Login Company
export const loginCompany = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the company exists
    const company = await Company.findOne({ email });
    if (!company) {
      return res.json({ success: false, message: "Invalid email or password" });
    }

    // Compare the password
    const isMatch = await bcrypt.compare(password, company.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid email or password" });
    }
    // company verification check
    if (!company.isVerified) {
      return res.json({ success: false, message: "Your company is not yet verified. Please contact the admin team for approval." })
    }
    // Generate JWT token
    const token = jwt.sign({ id: company._id }, process.env.JWT_SECRET, {
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
      company: {
        _id: company._id,
        name: company.name,
        email: company.email,
        image: company.image,
      },
      message: "Login successful",
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get company data
export const getCompanyData = async (req, res) => {
  try {
    const company = await Company.findById(req.company._id)
      .select("-password")
      .lean(); // returns plain objects, which are faster to create
    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }
    res.json({ success: true, company });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// add a job
export const postJob = async (req, res) => {
  try {
    // Destructure required fields from request body
    const {
      title,
      description,
      location,
      category,
      level,
      jobType,
      employmentType,
      experience,
      salary,
      openings,
      visible = true,
      companyDetails,
      deadline,
      requirements,
    } = req.body;

    // Check if companyId exists in req (Ensure middleware sets it properly)
    if (!req.company || !req.company._id) {
      return res
        .status(400)
        .json({ success: false, message: "Company ID is missing" });
    }

    const companyId = req.company._id;

    // Validate companyDetails
    if (
      !companyDetails ||
      !companyDetails.name ||
      !companyDetails.shortDescription ||
      !companyDetails.city ||
      !companyDetails.state ||
      !companyDetails.country
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Complete company details are required (name, shortDescription, city, state, country)",
      });

    }

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    // Credit system removed - jobs can be posted freely
    // Basic validations
    if (
      !title ||
      !description ||
      !location ||
      !category ||
      !level ||
      !experience ||
      salary === "" ||
      !openings
    ) {
      return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
    }
    
    const newJob = new Job({
      title,
      description,
      location,
      category,
      level,
      jobType,
      employmentType,
      experience,
      salary,
      openings,
      deadline: new Date(deadline), // Add deadline field and convert to Date object
      date: Date.now(),
      visible,
      companyId,
      companyDetails: {
        name: companyDetails.name,
        shortDescription: companyDetails.shortDescription,
        city: companyDetails.city,
        state: companyDetails.state,
        country: companyDetails.country,
        hrName: companyDetails.hrName, // Add HR contact details
        hrEmail: companyDetails.hrEmail,
        hrPhone: companyDetails.hrPhone,
      },
      requirements: requirements || [], // Add requirements array if available
    });
    
    // Save to database
    await newJob.save();
    await company.save();
    
    // Return success response
    res.status(201).json({
      success: true,
      job: newJob,
      message: "Job posted successfully.",
    });
  } catch (error) {
    console.error("Error posting job:", error);

    // More detailed error logging
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// Get Company Job Applicants
export const getCompanyJobApplicants = async (req, res) => {
  try {
    const companyId = req.company._id.toString();
    const { jobId } = req.params;

    const filter = { companyId };

    if (jobId) {
      filter.jobId = jobId;

      // OPTIONAL: Validate that the job exists and belongs to the company
      const job = await Job.findById(jobId);

      if (!job) {
        return res
          .status(404)
          .json({ success: false, message: "Job not found" });
      }
      if (job.companyId.toString() !== companyId) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: This job does not belong to your company.",
        });
      }
    }

    // Retrieve job applications matching the filter
    const applications = await JobApplication.find(filter)
      .populate("userId", "name image resume")
      .populate("jobId", "title location category level salary")
      .exec();

    // Normalize the applicationData field
    const normalizedApplications = applications.map((app) => {
      // Convert Mongoose document to plain object
      const appObj = app.toObject();
      // Check if there is an extra nesting layer
      if (appObj.applicationData && appObj.applicationData.applicationData) {
        appObj.applicationData = appObj.applicationData.applicationData;
      }
      return appObj;
    });

    return res.json({ success: true, applications: normalizedApplications });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Company Posted Jobs
export const getCompanyPostedJobs = async (req, res) => {
  try {
    if (!req.company || !req.company._id) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const companyId = req.company._id;

    const jobsData = await Job.aggregate([
      {
        $match: { companyId },
      },

      // Get job application count
      {
        $lookup: {
          from: "jobapplications",
          localField: "_id",
          foreignField: "jobId",
          as: "applications",
        },
      },
      {
        $addFields: {
          applicants: { $size: "$applications" },
        },
      },
      {
        $project: {
          applications: 0,
        },
      },

      // Populate companyId (full document)
      {
        $lookup: {
          from: "companies",
          localField: "companyId",
          foreignField: "_id",
          as: "companyId",
        },
      },
      {
        $unwind: "$companyId",
      },
    ]);
    // res.json({ success: true, jobs: jobsData });
    res.json({ success: true, jobs: jobsData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Change Job Application Status
export const ChangeJobApplicationsStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    const companyId = req.company._id.toString();

    // Find the job application by its ID
    const jobApplication = await JobApplication.findOne({ _id: id });
    if (!jobApplication) {
      return res
        .status(404)
        .json({ success: false, message: "Job application not found" });
    }

    // Check if the job application belongs to the authenticated company
    if (jobApplication.companyId.toString() !== companyId) {
      return res.status(403).json({
        success: false,
        message:
          "Unauthorized: You are not allowed to update the status of this job application.",
      });
    }

    // Update the job application's status
    jobApplication.status = status;
    await jobApplication.save();

    res.json({ success: true, message: "Status Changed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Change Job Visiblity
export const changeVisiblity = async (req, res) => {
  try {
    const { id } = req.body;
    const companyId = req.company._id;

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    //here i am checking that if this is the authenticated job or not
    if (companyId.toString() !== job.companyId.toString()) {
      return res.status(403).json({
        success: false,
        message:
          "Unauthorized: You cannot change the visibility of a job that does not belong to your company.",
      });
    }

    job.visible = !job.visible;
    await job.save();

    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//Change Interview Status
export const ChangeInterviewStatus = async (req, res) => {
  try {
    const { id, interviewStatus } = req.body;

    // Validate request body
    if (!id || !interviewStatus) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: id or interviewStatus.",
      });
    }

    const companyId = req.company._id.toString();

    // Find the job application by its ID
    const jobApplication = await JobApplication.findById(id);
    if (!jobApplication) {
      return res
        .status(404)
        .json({ success: false, message: "Job application not found" });
    }

    // Check if the job application belongs to the authenticated company
    if (jobApplication.companyId.toString() !== companyId) {
      return res.status(403).json({
        success: false,
        message:
          "Unauthorized: You are not allowed to update the interview status of this job application.",
      });
    }

    // Update the interview status
    jobApplication.interview = interviewStatus;
    await jobApplication.save();

    return res.json({ success: true, message: "Interview status updated" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

//Change Job Status
export const ChangeOnboardingStatus = async (req, res) => {
  try {
    const { id, onboardingStatus } = req.body;

    // Validate request body
    if (!id || onboardingStatus === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: id or onboardingStatus.",
      });
    }

    if (!req.company || !req.company._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Company authentication failed.",
      });
    }

    const companyId = req.company._id.toString();

    // Find the job application by its ID
    const jobApplication = await JobApplication.findById(id);
    if (!jobApplication) {
      return res
        .status(404)
        .json({ success: false, message: "Job application not found" });
    }

    // Check if the job application belongs to the authenticated company
    if (jobApplication.companyId.toString() !== companyId) {
      return res.status(403).json({
        success: false,
        message:
          "Unauthorized: You cannot update the onboarding status of this job application.",
      });
    }

    // Update the onboarding status
    jobApplication.onboarding = onboardingStatus;
    await jobApplication.save();

    return res.json({
      success: true,
      message: "Onboarding status updated successfully",
      jobApplication,
    });
  } catch (error) {
    console.error("Error in ChangeOnboardingStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

//universal company controller
// export const getCompaniesWithJobs = async (req, res) => {
//   try {
//     const companies = await Company.find();

//     const companiesWithJobs = await Promise.all(
//       companies.map(async (company) => {
//         const jobs = await Job.find({ companyId: company._id });
//         return {
//           company,
//           jobs,
//         };
//       })
//     );

//     res.json({
//       success: true,
//       jobs: companiesWithJobs
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Error fetching companies and jobs",
//       error: error.message
//     });
//   }
// };

export const getCompaniesWithJobs = async (req, res) => {
  try {
    // Use aggregation to join companies with their jobs in one query.
    const companiesWithJobs = await Company.aggregate([
      {
        $lookup: {
          from: "jobs", // This should match the collection name (typically the pluralized, lower-case version)
          localField: "_id",
          foreignField: "companyId",
          as: "jobs",
        },
      },
    ]);

    res.json({
      success: true,
      jobs: companiesWithJobs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching companies and jobs",
      error: error.message,
    });
  }
};

//logout
export const logout = async (req, res) => {
  // Clear the cookie
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  res.json({ success: true, message: "Logged out successfully" });
};

// Edit a job
// NEW: User-provided editJob controller, updated to include isEdited and isVerified flags
export const editJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const companyId = req.company._id; // Assuming req.company._id is set by protectCompany middleware
    const {
      title,
      description,
      location,
      category,
      level,
      experience,
      salary,
      openings,
      visible,
      companyDetails,
      deadline, // Added deadline from the provided code
      isEdited // This will be true from frontend
    } = req.body;

    // Find the job
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // Check if the job belongs to the company
    if (job.companyId.toString() !== companyId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You cannot edit a job that does not belong to your company",
      });
    }

    // Update the job fields, using provided values or existing ones
    job.title = title !== undefined ? title : job.title;
    job.description = description !== undefined ? description : job.description;
    job.location = location !== undefined ? location : job.location;
    job.category = category !== undefined ? category : job.category;
    job.level = level !== undefined ? level : job.level;
    job.experience = experience !== undefined ? experience : job.experience;
    job.salary = salary !== undefined ? salary : job.salary;
    job.openings = openings !== undefined ? openings : job.openings;
    job.visible = visible !== undefined ? visible : job.visible;
    job.companyDetails = companyDetails !== undefined ? companyDetails : job.companyDetails;
    job.deadline = deadline !== undefined ? deadline : job.deadline; // Update deadline

    // Set isEdited to true and isVerified to false upon company editing the job
    job.isEdited = true; // Set to true as the job has been edited by the company
    job.isVerified = false; // Set to false, requiring re-verification by admin
    job.objections = []; // Clear the objections array
    job.objectionsTrack[job.objectionsTrack.length - 1].isEditedTrack = true;
    await job.save();

    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a job
export const deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const companyId = req.company._id;

    // Find the job
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // Check if the job belongs to the company
    if (job.companyId.toString() !== companyId.toString()) {
      return res.status(403).json({
        success: false,
        message:
          "Unauthorized: You cannot delete a job that does not belong to your company",
      });
    }

    // Delete the job
    await Job.findByIdAndDelete(jobId);

    res.json({ success: true, message: "Job deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Credit system removed
