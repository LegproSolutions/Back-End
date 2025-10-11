import express from "express";
import {
  allRecruiters,
  allUser,
  getAdminData,
  getUserProfileById,
  loginAdmin,
  logoutAdmin,
  registerAdmin,
  TogglePremiumAccessRecruiter,
  unverifiedPost,
  unverifiedRecruiters,
  verifyJobByAdmin,
  verifyRecruiter,
  viewApplicant,
  raiseJobObjection, // NEW: Import the new controller
  getUserJobApplications,
  getCompanyPostedJobs,
  getCompanyJobApplicants,

} from "../controllers/adminController.js";
import { protectAdmin } from "../middleware/authMiddleware.js";
const router = express.Router();

// Register Admin
router.post("/register", registerAdmin);
// Admin Login
router.post("/login", loginAdmin);
router.get("/logout", protectAdmin, logoutAdmin);
router.get("/admin", protectAdmin, getAdminData);
router.get("/unverified-jobs", protectAdmin, unverifiedPost);
router.get("/view-applicant", protectAdmin, viewApplicant);
router.get("/all-recruiters", protectAdmin, allRecruiters);
router.get("/all-users", protectAdmin, allUser);
router.get("/unverified-recruiters", protectAdmin, unverifiedRecruiters);
router.put("/verify/:jobId", protectAdmin, verifyJobByAdmin);
router.put("/verify-recruiter/:recruiterId", protectAdmin, verifyRecruiter);
router.put(
  "/update-premium/:recruiterId",
  protectAdmin,
  TogglePremiumAccessRecruiter
);
// Credit system routes removed
// Route to get user profile by userId
router.get("/user-profile/:userId", protectAdmin, getUserProfileById);
router.get("/job-applications/:userId", protectAdmin, getUserJobApplications);
// NEW: Route to raise an objection for a job post
router.put("/job-objection/:jobId", protectAdmin, raiseJobObjection);
// NEW Route: Get all job posts by a specific company (recruiter)
router.get( "/company-jobs/:companyId",protectAdmin,getCompanyPostedJobs);

// NEW Route: Get all applicants for a specific job
router.get("/job-applicants/:jobId",protectAdmin,getCompanyJobApplicants);

export default router;
