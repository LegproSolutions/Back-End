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
import statRoutes from "./routes/statRoutes.js";
import cookieParser from "cookie-parser";
import { addDirectAdmin } from "./controllers/adminController.js";

const app = express();

// ✅ Trusted Frontend Origins
const allowedOrigins = [
  "https://www.jobmela.co.in", // main domain
  "https://jobmela.co.in", // without www
  "https://jobmela.com",
  "https://www.jobmela.com",
  "http://localhost:3000",
  "http://localhost:5173",
];

// ✅ Secure CORS Setup
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Allow mobile apps/postman
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked for origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
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
    "If-Modified-Since",
  ],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Enable preflight

// ✅ Middleware Config
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);
app.use(cookieParser());

// ✅ Optional: Redirect HTTP → HTTPS
app.use((req, res, next) => {
  if (
    process.env.NODE_ENV === "production" &&
    req.headers["x-forwarded-proto"] !== "https"
  ) {
    return res.redirect("https://" + req.headers.host + req.url);
  }
  next();
});

// ✅ Test Routes
app.get("/", (req, res) => res.send("🚀 JobMela API is Live!"));
app.get("/api/test", (req, res) =>
  res.json({ success: true, message: "Backend API working fine!" })
);

// ✅ API Routes
app.use("/api/admin", adminRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profile", userProfileRoutes);
app.use("/api/stats", statRoutes);

// ✅ Sentry Error Handler (optional but recommended)
app.use(Sentry.Handlers.errorHandler());

// ✅ Port
const PORT = process.env.PORT || 5001;

// ✅ Initialize Direct Admin Account
const initializeDirectAdmin = async () => {
  try {
    console.log("🔧 Initializing direct admin...");
    const result = await addDirectAdmin();

    if (result.success) {
      console.log("✅ Direct admin initialized successfully!");
      console.log(`📧 Email: ${process.env.ADMIN_EMAIL || "AdminAbhisek@JobMela.com"}`);
      console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD || "Pass1125@"}`);
      console.log("🪪 PassKey: NAVGAP2025BJ");
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
      console.log(`🚀 Server is live on port ${PORT}`);
      console.log("🌐 Frontend allowed origins:");
      allowedOrigins.forEach((o) => console.log("  - " + o));
      console.log("📡 Ready to accept requests from JobMela frontend!");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
