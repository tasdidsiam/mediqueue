import mongoose from "mongoose";

const tokenRuleSchema = new mongoose.Schema({
  ruleName: String,
  speciality: String,
  maxTokens: Number,
  clinics: [{ type: mongoose.Schema.Types.ObjectId, ref: "Clinic" }]
}, { timestamps: true });

export default mongoose.model("TokenRule", tokenRuleSchema);
