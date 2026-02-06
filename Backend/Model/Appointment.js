import mongoose from "mongoose";
import User from "./User.js";

const queueToken = new mongoose.Schema({
    patient:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Patient is required']
    },
    tokenNumber:{
        type: Number,
        required: [true, 'Token number is required']
    },
    scheduleStartTime:{
        type:Date,
        required: [true, 'Schedule start time is required']
    },
    scheduleEndTime:{
        type:Date,
        required: [true, 'Schedule end time is required']
    },
    status: {
    type: String,
    enum: ['queued', 'completed', 'skipped', 'late_penalty', 'emergency'],
    default: 'queued'
    },
    tokenPenaltyCount: { type: Number, default: 0 },
    consultationStartTime: { type: Date },
    consultationEndTime: { type: Date }


},{ timestamps: true}
)


const appointmentSchema = new mongoose.Schema({
    title:{
        type: String,
        required:[true, 'Title is required']
    },
    maxpatients:{
        type: Number,
        required:[true, 'Max patient is required']
    },
    
    doctor:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Doctor is required']
    },
    appointmentDate:{
        type: Date,
        required: [true, 'Appointment date is required']
    },
    startTime: {
        type: Date,  // Format: "10:00 AM"
        required: [true, 'Start time is required']
    },
    
    endTime: {
        type: Date,  // Format: "10:30 AM"
        required: [true, 'End time is required']
    },
    status: {
        type: String,
        enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    globalDelay: { type: Number, default: 0 },
    tokenRules: {
        intervalTimeMinutes: { 
            type: Number, 
            default: 5,
            required: true,
            min: [2, 'Interval time must be at least 2 minutes']
        },
        tokenPenaltyAmount: { 
            type: Number, 
            default: 1,
            min: [1, 'Token penalty must be at least 1']
        },
        gracePeriodMinutes: { 
            type: Number, 
            default: 5,
            min: [0, 'Grace period cannot be negative']
        },
        autoMarkLateEnabled: {
            type: Boolean,
            default: true
        }
    },
    queueTokens: [queueToken]
},{ timestamps: true })

export default mongoose.model('Appointment', appointmentSchema)