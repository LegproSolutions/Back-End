import dotenv from "dotenv";
dotenv.config();
import "./config/instrument.js";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import * as Sentry from "@sentry/node";
import companyRoutes from "./routes/companyRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import connectCloudinary from "./config/cloudinary.js";
import jobRoutes from "./routes/jobRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import userProfileRoutes from "./routes/userProfile.js";
import cookieParser from "cookie-parser";
import { addDirectAdmin } from "./controllers/adminController.js";
import { auth } from "googleapis/build/src/apis/abusiveexperiencereport/index.js";

// Initialize Express
const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'https://jobmela.com',
    'https://www.jobmela.com',
    'http://localhost:3000',
    'https://localhost:3000',
    'http://localhost:5173',
    'https://front-end-nu-sage.vercel.app'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  allowedHeaders: [
    'Authorization', 
    'Content-Type', 
    'Accept', 
    'Origin', 
    'User-Agent', 
    'DNT', 
    'Cache-Control', 
    'X-Mx-ReqToken', 
    'Keep-Alive', 
    'X-Requested-With', 
    'If-Modified-Since'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes

// Middlewares
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);
app.use(cookieParser());

// Routes
app.get("/", (req, res) => res.send("API Working"));
app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "Backend API is working!" });
});

// API Routes
app.use("/api/admin", adminRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profile", userProfileRoutes);

// Port
const PORT = process.env.PORT || 5001;

// Sentry error handler
app.use(Sentry.Handlers.errorHandler());

// Function to initialize direct admin
const initializeDirectAdmin = async () => {
  try {
    console.log("🔧 Initializing direct admin...");
    const result = await addDirectAdmin();

    if (result.success) {
      console.log("✅ Direct admin created successfully!");
      console.log(`📧 Email: AdminAbhisek@JobMela.com`);
      console.log(`🔑 Password: Pass1125@`);
    } else {
      console.log("ℹ️ Direct admin initialization:", result.message);
    }
  } catch (error) {
    console.error("❌ Error initializing direct admin:", error.message);
  }
};

// Start server with async initialization
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log("✅ Database connected successfully");

    // Connect to Cloudinary
    await connectCloudinary();
    console.log("✅ Cloudinary connected successfully");

    // Redis disabled for now
    // await connectRedis();

    // Initialize direct admin after database connection
    await initializeDirectAdmin();

    // Start the server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log("🎯 Direct Admin Credentials:");
      console.log("Email: AdminAbhisek@JobMela.com");
      console.log("Password: Pass1125@");
      console.log("PassKey: NAVGAP2025BJ");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
