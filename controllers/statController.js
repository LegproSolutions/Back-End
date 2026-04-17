import User from "../models/User.js";
import Company from "../models/Company.js";
import Job from "../models/Job.js";

export const getStats = async (req, res) => {
    try {
        const [jobseekers, companies, jobs] = await Promise.all([
            User.countDocuments(),
            Company.countDocuments(),
            Job.countDocuments({ visible: true })
        ]);

        res.json({
            success: true,
            stats: {
                jobseekers,
                companies,
                jobs
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
