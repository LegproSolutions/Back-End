import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    category: { type: String, required: true },
    deadline: { type: Date, required: true },
    level: { type: String, required: true },
    experience: { type: Number, required: true },
    salary: { type: Number, required: true },
    openings: { type: Number, required: true },
    date: { type: Date, required: true },
    visible: { type: Boolean, default: true },
    requirements: [{ type: String }],
    employmentType:{type:String ,enum:["full-time", "part-time", "internship","unpaid"],required:true},
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },

    // Track which admin (primary or sub-admin) created this job
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    
    companyDetails: {
        name: { type: String, required: true },
        shortDescription: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        country: { type: String, required: true },
        hrName: { type: String }, // HR contact info
        hrEmail: { type: String },
        hrPhone: { type: String }
    },
    isVerified:{type:Boolean,default:false},
    isViewApplicant:{type:Boolean,default:false},
    objections: [
        {
            message: { type: String, required: true },
            timestamp: { type: Date, default: Date.now },
        },
    ],
    objectionsTrack: [
        {
            message: { type: String, required: true },
            isEditedTrack:{type: Boolean, default: false},
            timestamp: { type: Date, default: Date.now },
        },
    ],
    isEdited: { type: Boolean, default: false }, //  track if the job has been edited
});

const Job = mongoose.model("Job", jobSchema);

export default Job;
