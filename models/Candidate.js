import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema(
{
  name: String,
  email: String,
  phone: String
},
{ timestamps: true }
);

const Candidate = mongoose.model("Candidate", candidateSchema);

export default Candidate;