import express from "express";
import UserProfile from "../models/UserProfile.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { v2 as cloudinary } from 'cloudinary';
import upload from "../config/multer.js";

const router = express.Router();

// Create or update user profile
// router.post("/create", authenticate, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const profileData = req.body;

//     const profile = await UserProfile.findOneAndUpdate(
//       { userId },
//       { ...profileData, userId },
//       { upsert: true, new: true }
//     );

//     res.status(200).json({
//       success: true,
//       profile,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });
router.post("/create", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const profileData = req.body;

    // Manually update the updatedAt field since findOneAndUpdate won't trigger pre-save hooks.
    profileData.updatedAt = Date.now();

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      { ...profileData, userId },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

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
});

// Get user profile
router.get("/get-user", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
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
});

// Upload resume
router.post("/upload-resume", authenticate, upload.single('resume'), async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No resume file uploaded"
      });
    }

    console.log('File details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer ? req.file.buffer.length : 'No buffer'
    });

    // Validate file type (PDF only)
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: "Only PDF files are allowed for resume upload"
      });
    }

    // Check file size (max 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "File size should be less than 5MB"
      });
    }

    // Validate that we have the file buffer
    if (!req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "File buffer is missing"
      });
    }

    // Find existing user profile to check for previous resume
    const existingProfile = await UserProfile.findOne({ userId });
    
    // Delete previous resume from Cloudinary if exists
    // Handle both old string format and new object format
    if (existingProfile && existingProfile.resume) {
      // Check if resume is an object with publicId (new format)
      if (typeof existingProfile.resume === 'object' && existingProfile.resume.publicId) {
        try {
          await cloudinary.uploader.destroy(existingProfile.resume.publicId, {
            resource_type: 'raw'
          });
        } catch (deleteError) {
          console.error('Error deleting previous resume:', deleteError);
          // Continue with upload even if deletion fails
        }
      }
      // If resume is a string (old format), we can't delete from Cloudinary
      // but we'll still replace it with the new format
    }

    // Upload new resume to Cloudinary
    console.log('Starting Cloudinary upload...');
    
    let uploadResult;
    
    try {
      // Method 1: Try stream upload first
      uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'raw',
            folder: 'resumes',
            public_id: `resume_${userId}_${Date.now()}`,
            use_filename: true,
            unique_filename: false
          },
          (error, result) => {
            if (error) {
              console.error('Stream upload error:', error);
              reject(error);
            } else {
              console.log('Stream upload success:', result.secure_url);
              resolve(result);
            }
          }
        );
        
        uploadStream.end(req.file.buffer);
      });
    } catch (streamError) {
      console.log('Stream upload failed, trying base64 method...');
      
      // Method 2: Fallback to base64 upload
      try {
        const base64Data = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        
        uploadResult = await cloudinary.uploader.upload(base64Data, {
          resource_type: 'raw',
          folder: 'resumes',
          public_id: `resume_${userId}_${Date.now()}`,
          use_filename: true,
          unique_filename: false
        });
        
        console.log('Base64 upload success:', uploadResult.secure_url);
      } catch (base64Error) {
        console.error('Both upload methods failed:', base64Error);
        throw new Error(`Upload failed: ${streamError.message} | ${base64Error.message}`);
      }
    }

    // Create new resume data object
    const resumeData = {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      originalName: req.file.originalname,
      uploadedAt: new Date()
    };

    // Update user profile with new resume information
    const updatedProfile = await UserProfile.findOneAndUpdate(
      { userId },
      { 
        $set: { 
          resume: resumeData,
          updatedAt: new Date()
        }
      },
      { 
        upsert: true, 
        new: true
      }
    );

    res.status(200).json({
      success: true,
      message: "Resume uploaded successfully",
      url: resumeData.url,
      publicId: resumeData.publicId,
      originalName: resumeData.originalName
    });

  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({
      success: false,
      message: "Error uploading resume. Please try again.",
      error: error.message
    });
  }
});

// Delete resume only
router.delete("/delete-resume", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find user profile
    const profile = await UserProfile.findOne({ userId });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    if (!profile.resume) {
      return res.status(404).json({
        success: false,
        message: "No resume found to delete"
      });
    }

    // Delete resume from Cloudinary if it's in the new object format
    if (typeof profile.resume === 'object' && profile.resume.publicId) {
      try {
        await cloudinary.uploader.destroy(profile.resume.publicId, {
          resource_type: 'raw'
        });
      } catch (deleteError) {
        console.error('Error deleting resume from Cloudinary:', deleteError);
        return res.status(500).json({
          success: false,
          message: "Error deleting resume from cloud storage"
        });
      }
    }
    // If resume is in old string format, we can't delete from Cloudinary
    // but we'll still remove it from the database

    // Update profile to remove resume information
    await UserProfile.findOneAndUpdate(
      { userId },
      { 
        $unset: { resume: 1 },
        $set: { updatedAt: new Date() }
      }
    );

    res.status(200).json({
      success: true,
      message: "Resume deleted successfully"
    });

  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({
      success: false,
      message: "Error deleting resume",
      error: error.message
    });
  }
});

// Delete user profile
router.delete("/delete", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find profile to get resume info before deletion
    const profile = await UserProfile.findOne({ userId });
    
    // Delete resume from Cloudinary if exists (only for new object format)
    if (profile && profile.resume && typeof profile.resume === 'object' && profile.resume.publicId) {
      try {
        await cloudinary.uploader.destroy(profile.resume.publicId, {
          resource_type: 'raw'
        });
      } catch (deleteError) {
        console.error('Error deleting resume during profile deletion:', deleteError);
        // Continue with profile deletion even if resume deletion fails
      }
    }
    
    await UserProfile.findOneAndDelete({ userId });
    res.status(200).json({
      success: true,
      message: "Profile deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
