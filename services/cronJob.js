import cron from "node-cron";
import xml2js from "xml2js";
import Job from "../models/Job.js";
import Company from "../models/Company.js";
import axios from "axios";

// Function to create or get JustJobs company
const getOrCreateJustJobsCompany = async () => {
  try {
    // First, try to find existing JustJobs company
    let company = await Company.findOne({
      $or: [
        { name: { $regex: /^justjobs$/i } },
        { email: "info@justjobs.com" },
      ],
    });

    if (company) {
      console.log("✅ Found existing JustJobs company:", company._id);
      return company._id;
    }

    // If not found, create new JustJobs company
    console.log("🏢 Creating new JustJobs company...");

    const newCompany = new Company({
      name: "JustJobs",
      email: "info@justjobs.com",
      phone: "+1-555-0123", // Default phone number
      image: "https://www.justjob.app/logo.png", // Default logo
      password: "defaultpassword123", // This should be hashed in real scenario
      isVerified: true,
      havePremiumAccess: true,
      // Credit system removed
    });

    const savedCompany = await newCompany.save();
    console.log("✅ Created new JustJobs company:", savedCompany._id);
    return savedCompany._id;
  } catch (error) {
    console.error("❌ Error creating/finding JustJobs company:", error.message);
    throw error;
  }
};

export const scheduleCronJobs = () => {
  console.log("🕐 Initializing cron jobs...");

  // Schedule a cron job to run every day at midnight to fetch jobs
  cron.schedule("0 0 * * *", async () => {
    try {
      console.log(
        "🔄 Starting daily job sync at:",
        new Date().toLocaleString()
      );

      // First, get or create the JustJobs company
      const justJobsCompanyId = await getOrCreateJustJobsCompany();

      // Fetch XML data from the API
      const response = await axios.get(
        "https://www.justjob.co.in/Api/api/Jobs/JobList",
        {
          headers: {
            "Content-Type": "application/xml",
            Accept: "application/xml",
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      const xmlData = response.data;
      console.log("✅ Successfully fetched XML data from API");

      // Parse XML data
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(xmlData);

      const jobs = result.jobs?.job;

      if (!Array.isArray(jobs) || jobs.length === 0) {
        console.log("⚠️ No jobs found in XML response");
        return;
      }

      console.log(`📋 Found ${jobs.length} jobs to process`);

      // Transform and save jobs
      const savedJobs = await Promise.all(
        jobs.map(async (job) => {
          try {
            // Extract basic job information
            const justjobId = job.jobid?.[0]?.trim() || null;
            const title = job.title?.[0]?.trim() || "Untitled";
            const description = job.description?.[0]?.trim() || "";
            const company = job.company?.[0]?.trim() || "Unknown";
            const city = job.city?.[0]?.trim() || "";
            const state = job.state?.[0]?.trim() || "";
            const country = job.country?.[0]?.trim() || "";

            // Build location string
            const locationParts = [city, state, country].filter((part) => part);
            const location = locationParts.join(", ") || "Not specified";

            const category = "General";

            // Parse dates
            const jobDate = job.date?.[0]?.trim()
              ? new Date(job.date[0].trim())
              : new Date();
            const deadline = job["job-end-date"]?.[0]?.trim()
              ? new Date(job["job-end-date"][0].trim())
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

            // Parse employment type and map to schema enum
            const employmentTypeRaw =
              job["employment-type"]?.[0]?.trim() || "Full Time";
            let employmentType = "full-time"; // default
            if (employmentTypeRaw.toLowerCase().includes("part")) {
              employmentType = "part-time";
            } else if (employmentTypeRaw.toLowerCase().includes("intern")) {
              employmentType = "internship";
            } else if (employmentTypeRaw.toLowerCase().includes("unpaid")) {
              employmentType = "unpaid";
            }

            const level = employmentTypeRaw; // Keep original for level field

            // Parse experience - handle ranges like "15 - 25 Years"
            let experience = 0;
            if (job.experience?.[0]) {
              const expStr = job.experience[0].trim();
              const expMatch = expStr.match(/(\d+)/); // Get first number from string
              experience = expMatch ? parseInt(expMatch[1]) : 0;
            }

            // Parse salary
            let salary = 0;
            if (job.salary?.[0]) {
              const sal = job.salary[0].trim().replace(/[^\d]/g, "");
              salary = sal ? parseInt(sal) : 0;
            }

            // Parse annual salary
            let annualSalary = 0;
            if (job["annual-salary"]?.[0]) {
              const annualSal = job["annual-salary"][0]
                .trim()
                .replace(/[^\d]/g, "");
              annualSalary = annualSal ? parseInt(annualSal) : 0;
            }

            // Parse openings
            let openings = 1; // default
            if (job.JobOpenings?.[0]) {
              const openingsStr = job.JobOpenings[0].trim();
              openings =
                openingsStr && /^\d+$/.test(openingsStr)
                  ? parseInt(openingsStr)
                  : 1;
            }

            // Extract additional fields
            const currency = job.currency?.[0]?.trim() || null;
            const cpc = job.cpc?.[0]?.trim() || null;
            const url = job.url?.[0]?.trim() || null;
            const logo = job.logo?.[0]?.trim() || null;
            const jobRole = job.JobRole?.[0]?.trim() || null;
            const qualification = job.Qualification?.[0]?.trim() || null;

            // Use the JustJobs company ID
            const companyId = justJobsCompanyId;

            const companyDetails = {
              name: company || "JustJobs Partner",
              shortDescription: "Imported via JustJobs XML sync",
              city: city,
              state: state,
              country: country,
            };

            // Check if job already exists using justjobId or combination of fields
            let existingJob = null;
            if (justjobId) {
              existingJob = await Job.findOne({ justjobId: justjobId });
            }

            if (!existingJob) {
              existingJob = await Job.findOne({
                title,
                companyId: justJobsCompanyId,
                location,
              });
            }

            if (existingJob) {
              return null;
            }

            const newJob = new Job({
              justjobId,
              title,
              description,
              location,
              category,
              deadline,
              level,
              experience,
              salary,
              openings,
              isVerified: true,
              date: jobDate,
              requirements: [], // Can be parsed from description if needed
              jobType: "all",
              employmentType,
              companyId,
              companyDetails,

              // Additional JustJobs fields
              annualSalary,
              currency,
              cpc,
              url,
              logo,
              jobRole,
              qualification,
            });

            const savedJob = await newJob.save();
            return savedJob;
          } catch (jobError) {
            console.error(
              "❌ Error processing individual job:",
              jobError.message
            );
            console.error("Job data that failed:", {
              title: job.title?.[0]?.trim(),
              company: job.company?.[0]?.trim(),
              jobid: job.jobid?.[0]?.trim(),
            });
            return null;
          }
        })
      );

      // Filter out null values (failed saves or duplicates)
      const successfulSaves = savedJobs.filter((job) => job !== null);

      console.log(
        `🎉 Daily job sync completed! ${successfulSaves.length} new jobs added out of ${jobs.length} total jobs`
      );
    } catch (error) {
      console.error("❌ Error in daily job sync:", error.message);

      // Log more specific error details
      if (error.response) {
        console.error(
          "API Response Error:",
          error.response.status,
          error.response.statusText
        );
      } else if (error.request) {
        console.error("Network Error: No response received");
      } else {
        console.error("Error Details:", error.message);
      }
    }
  });

  console.log("✅ Cron jobs scheduled successfully");
};
