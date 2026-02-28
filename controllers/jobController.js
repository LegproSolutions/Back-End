import Job from "../models/Job.js";
import Company from "../models/Company.js";
// Redis disabled for now
// import { redisClient } from "../utils/redisClient.js";

// Get All Jobs with Pagination
export const getJobs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 9,
      title,
      location,
      category,
      salaryMin,
      salaryMax,
      experience,
      states, // New parameter for state filtering
    } = req.query;

    // Convert page and limit to numbers
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query filter
    const filter = { 
      visible: true,
      isVerified: true
     };

    // jobType removed from schema; no type filter

    if (title && title !== "") {
      filter.title = { $regex: title, $options: "i" };
    }

    if (location && location !== "") {
      filter.$or = [
        { location: { $regex: location, $options: "i" } },
        { "companyDetails.state": { $regex: location, $options: "i" } },
        { "companyDetails.city": { $regex: location, $options: "i" } },
      ];
    }

    if (category && category !== "") {
      filter.category = category;
    }

    if (states && Array.isArray(states) && states.length > 0) {
      filter["companyDetails.state"] = { $in: states };
    } else if (states && typeof states === "string") {
      // Handle single state passed as string
      filter["companyDetails.state"] = states;
    }

    if (salaryMin || salaryMax) {
      filter.salary = {};
      if (salaryMin) filter.salary.$gte = parseInt(salaryMin);
      if (salaryMax) filter.salary.$lte = parseInt(salaryMax);
    }

    if (experience && experience !== "") {
      filter.experience = { $gte: parseInt(experience) };
    }

    // Create cache key based on all filters
    const cacheKey = `jobs_${JSON.stringify({
      page: pageNum,
      limit: limitNum,
      title,
      location,
      category,
      salaryMin,
      salaryMax,
      experience,
      states,
    })}`.replace(/[^a-zA-Z0-9]/g, "_");

    // Redis disabled for now
    // const cachedResult = await redisClient.get(cacheKey);
    // if (cachedResult) {
    //   return res.json({ success: true, ...JSON.parse(cachedResult) });
    // }
    
    const [jobs, totalJobs] = await Promise.all([
      Job.find(filter)
        .populate({
          path: "companyId",
          select: "-password",
        })
        .sort({ date: -1 }) // Sort by newest first
        .skip(skip)
        .limit(limitNum),
      Job.countDocuments(filter),
    ]);

    // 3. Calculate pagination info
    const totalPages = Math.ceil(totalJobs / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    const result = {
      jobs,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalJobs,
        hasNextPage,
        hasPrevPage,
        limit: limitNum,
      },
    };

    // Redis disabled for now
    // await redisClient.setEx(cacheKey, 120, JSON.stringify(result));

    return res.json({ success: true, ...result });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// Get Single Job Using JobID
export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id).populate({
      path: "companyId",
      select: "-password",
    });

    if (!job) {
      return res.json({
        success: false,
        message: "Job not found",
      });
    }

    res.json({
      success: true,
      job,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get companies with their jobs using aggregation
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
