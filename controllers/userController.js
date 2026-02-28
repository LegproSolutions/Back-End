import Job from "../models/Job.js";
import JobApplication from "../models/JobApplication.js";
import User from "../models/User.js";
import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import streamifier from "streamifier";
import UserProfile from "../models/UserProfile.js";
import { OAuth2Client } from "google-auth-library";

//register
export const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Check if email or phone is already taken
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      let msg =
        existingUser.email === email
          ? "Email is already registered"
          : "Phone number is already registered";

      return res.status(400).json({
        success: false,
        message: msg,
      });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    const newUserProfile = new UserProfile({
      userId: newUser._id,
      firstName: name.split(" ")[0] || name,
      lastName: name.split(" ")[1] || "",
      email,
      phone,
    });

    await newUser.save();
    await newUserProfile.save();

    // Generate JWT token (expires in 1 day)
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // Set the JWT token in a cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Ensure secure cookies in production
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });

    // Send token in response too (for frontend header-based auth)
    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUserProfile.phone,
      },
      message: "User registered successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Login Controller
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide email and password" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials try again" });
    }

    // Check if user has a password (Google users might not have one)
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message:
          "This account was created with Google. Please use Google Sign-In.",
      });
    }

    // Validate that both password values exist before comparison
    if (!password || !user.password) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Compare the provided password with the hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // Set the JWT token in a cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Ensure secure cookies in production
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });

    // Send success response (include token to allow header-based auth)
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      message: "Login successful",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Login_With_Google Controller
export const googleAuth = async (req, res) => {
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  const { code } = req.body;
  try {
    const oAuth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "postmessage"
    );

    const { tokens } = await oAuth2Client.getToken(code);
    const { id_token } = tokens;

    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        image: picture,
      });

      const newUserProfile = new UserProfile({
        userId: user._id,
        firstName: name.split(" ")[0] || name,
        lastName: name.split(" ")[1] || "",
        email,
      });
      await newUserProfile.save();
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return res
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          image: user.image || null,
        },
        message: "Google login successful",
      });
  } catch (err) {
    console.error("Google Auth Error:", err);
    res.status(500).json({
      success: false,
      message: "Google authentication failed",
      error: err.message,
    });
  }
};

// Get user data
export const getUserData = async (req, res) => {
  try {
    // req.user is already the full user object from auth middleware
    // No need to query database again
    const user = req.user;
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Apply For Job
export const applyForJob = async (req, res) => {
  const { companyId, ...applicationData } = req.body;
  const userId = req.user._id;
  const jobId = req.params.id;

  try {
    // Check if the job exists
    const jobData = await Job.findById(jobId);
    if (!jobData) {
      return res.status(404).json({ success: false, message: "Job Not Found" });
    }

    if (companyId && jobData.companyId.toString() !== companyId) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid request: the selected job does not belong to the specified company.",
      });
    }

    const isAlreadyApplied = await JobApplication.find({ jobId, userId });
    if (isAlreadyApplied.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: "Already Applied" });
    }

    // Create a new job application including the detailed form data
    await JobApplication.create({
      companyId: jobData.companyId,
      userId,
      jobId,
      applicationData,
      date: Date.now(),
    });

    res.json({ success: true, message: "Applied Successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get User Applied Applications Data
export const getUserJobApplications = async (req, res) => {
  try {
    const userId = req.user._id;

    const applications = await JobApplication.find({ userId })
      .populate("companyId", "name email image")
      .populate("jobId", "title description location category level salary")
      .exec();
    if (!applications) {
      return res.json({
        success: false,
        message: "No job applications found for this user.",
      });
    }

    return res.json({ success: true, applications });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Update User Resume
export const updateUserResume = async (req, res) => {
  try {
    const userId = req.user._id;
    const resumeFile = req.file; // from memory storage

    if (!resumeFile) {
      return res.json({
        success: false,
        message: "No file received by Multer",
      });
    }

    // Convert Multer's buffer to a readable stream and upload to Cloudinary
    const streamUpload = (buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "resumes" }, // optional: specify a folder in your Cloudinary account
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });
    };

    const uploadResult = await streamUpload(resumeFile.buffer);

    // Update user record in DB
    const userData = await User.findById(userId);
    userData.resume = uploadResult.secure_url;
    await userData.save();

    // ✅ Update UserProfile model
    const userProfile = await UserProfile.findOne({ userId });
    if (userProfile) {
      userProfile.resume = uploadResult.secure_url;
      await userProfile.save();
    }

    return res.json({ success: true, message: "Resume Updated" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// Logout Controller
export const logout = async (req, res) => {
  try {
    // Clear the cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
