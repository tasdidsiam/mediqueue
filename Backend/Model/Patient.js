import mongoose from "mongoose";
import User from "./User.js";

const patientSchema = new mongoose.Schema({
    age: {
        type: Number,
        min: [0, 'Age must be positive'],
        max: [150, 'Age must be valid']
    },
    bloodGroup: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    medicalHistory: [{
        condition: String,
        diagnosedDate: Date,
        notes: String
    }],
    emergencyContact: {
        name: String,
        relationship: String,
        phone: String
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String
    }
});

const Patient = User.discriminator('patient', patientSchema);

export default Patient;
