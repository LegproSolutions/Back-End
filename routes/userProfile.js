import express from "express";
import UserProfile from "../models/UserProfile.js";
import { authenticate } from "../middleware/authMiddleware.js";

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

// Delete user profile
router.delete("/delete", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
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
