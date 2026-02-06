import mongoose from "mongoose";
import User from "./User.js";

const adminSchema = new mongoose.Schema({
    department: {
        type: String,
        enum: ['Operations', 'IT', 'Human Resources', 'Finance', 'Medical Administration', 'Super Admin'],
        default: 'Operations'
    },
    accessLevel: {
        type: Number,
        min: 1,
        max: 5,
        default: 1,
        // 1: Basic, 2: Moderate, 3: Advanced, 4: Senior, 5: Super Admin
    },
    employeeId: {
        type: String,
        unique: true,
        required: [true, 'Employee ID is required']
    },
    permissions: [{
        type: String,
        enum: ['manage_doctors', 'manage_patients', 'manage_appointments', 
               'view_reports', 'manage_users', 'system_settings'],
        default : "manage_doctors"       

    }]
});

const Admin = User.discriminator('admin', adminSchema);

export default Admin;
