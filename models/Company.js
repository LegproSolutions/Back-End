import mongoose from "mongoose";

const companySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    image: { type: String, required: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    havePremiumAccess: { type: Boolean, default: false }
})

const Company = mongoose.model('Company', companySchema)

export default Company