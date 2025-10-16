import express from "express";
import {
  allUser,
  createJobByAdmin,
  getAllCompanies,
  getAdminData,
  getUserProfileById,
  loginAdmin,
  logoutAdmin,
  registerAdmin,
  raiseJobObjection,
  getUserJobApplications,
  getCompanyPostedJobs,
  getCompanyJobApplicants,
  updateJobByAdmin,
} from "../controllers/adminController.js";
import { protectAdmin } from "../middleware/authMiddleware.js";
import upload from "../config/multer.js";
const router = express.Router();

// Register Admin
router.post("/register", registerAdmin);
// Admin Login
router.post("/login", loginAdmin);
router.get("/logout", protectAdmin, logoutAdmin);
router.get("/admin", protectAdmin, getAdminData);

// Admin job creation routes (accept companyImage file)
router.post("/create-job", protectAdmin, upload.single('companyImage'), createJobByAdmin);
router.get("/companies", protectAdmin, getAllCompanies);

// User management routes
router.get("/all-users", protectAdmin, allUser);

// Route to get user profile by userId
router.get("/user-profile/:userId", protectAdmin, getUserProfileById);
router.get("/job-applications/:userId", protectAdmin, getUserJobApplications);

// Route to raise an objection for a job post
router.put("/job-objection/:jobId", protectAdmin, raiseJobObjection);

// Route: Get all job posts by a specific company (recruiter)
router.get("/company-jobs/:companyId", protectAdmin, getCompanyPostedJobs);

// Route: Get all applicants for a specific job
router.get("/job-applicants/:jobId", protectAdmin, getCompanyJobApplicants);

// Route: Update job by admin
router.put("/jobs/:jobId", protectAdmin, updateJobByAdmin);

// Route: Delete job by admin
router.delete("/jobs/:jobId", protectAdmin, async (req, res) => {
  try {
    const { jobId } = req.params;
    const deleted = await (await import('../models/Job.js')).default.findByIdAndDelete(jobId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Job not found' });
    return res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job by admin:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
