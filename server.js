import dotenv from "dotenv";
dotenv.config();
import "./config/instrument.js";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import * as Sentry from "@sentry/node";
import adminRoutes from "./routes/adminRoutes.js";
import connectCloudinary from "./config/cloudinary.js";
import jobRoutes from "./routes/jobRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import userProfileRoutes from "./routes/userProfile.js";
import cookieParser from "cookie-parser";
import { addDirectAdmin } from "./controllers/adminController.js";

// Initialize Express
const app = express();

// ✅ CORS Configuration
const corsOptions = {
  origin: [
    "https://jobmela.com",
    "https://www.jobmela.com",
    "https://www.jobmela.co.in",
    "http://localhost:3000",
    "https://localhost:3000",
    "http://localhost:5173",
    "https://front-end-nu-sage.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Authorization",
    "Content-Type",
    "Accept",
    "Origin",
    "User-Agent",
    "DNT",
    "Cache-Control",
    "X-Mx-ReqToken",
    "Keep-Alive",
    "X-Requested-With",
    "If-Modified-Since"
  ],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors()); // Enable pre-flight for all routes

// ✅ Middlewares
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);
app.use(cookieParser());

// ✅ Routes
app.get("/", (req, res) => res.send("🚀 JobMela API is Live!"));
app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "Backend API is working fine!" });
});

app.use("/api/admin", adminRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profile", userProfileRoutes);

// ✅ Sentry Error Handler (optional but good practice)
app.use(Sentry.Handlers.errorHandler());

// ✅ Port Configuration
const PORT = process.env.PORT || 5001;

// ✅ Initialize direct admin
const initializeDirectAdmin = async () => {
  try {
    console.log("🔧 Initializing direct admin...");
    const result = await addDirectAdmin();

    if (result.success) {
      console.log("✅ Direct admin initialized successfully!");
      console.log(`📧 Email: ${process.env.ADMIN_EMAIL || "AdminAbhisek@JobMela.com"}`);
      console.log(`🔑 Default password set in environment file.`);
    } else {
      console.log("ℹ️ Direct admin initialization:", result.message);
    }
  } catch (error) {
    console.error("❌ Error initializing direct admin:", error.message);
  }
};

// ✅ Start Server
const startServer = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB connected successfully");

    await connectCloudinary();
    console.log("✅ Cloudinary connected successfully");

    await initializeDirectAdmin();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running at: http://localhost:${PORT}`);
      console.log("📡 Ready to accept requests from frontend!");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
