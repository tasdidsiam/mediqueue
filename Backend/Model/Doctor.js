import mongoose from "mongoose";
import { SPECIALIZATIONS } from "../constants/specializations.js";

const doctorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    specialization: {
        type: String,
        required: true,
        enum: SPECIALIZATIONS
    },

    licenseNumber: {
        type: String,
        required: true,
        unique: true
    },

    experience: {
        type: Number,
        default: 0
    },

    availability: [{
        day: String,
        startTime: String,
        endTime: String
    }],

    consultationFee: Number,

    rating: {
        type: Number,
        default: 0
    },

    approvalstatus: {
        type: String,
        enum: ["Approved","Rejected","Pending"],
        default: "Pending"
    },

    isActive: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

export default mongoose.model("Doctor", doctorSchema);