import { getAllDoctorsService, getDoctorByIdService, addDoctorService, getApprovedDoctorsService } from "../Services/doctorService.js";
import { createAppointmentService, getDoctorAvailableAppointmentsService } from "../Services/appointmentservice.js";

export const getAllDoctors = async (req, res) => {
    try {
        const doctors = await getAllDoctorsService();
        res.status(200).json({
            success: true,
            data: doctors
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get approved doctors (public for patients)
export const getApprovedDoctors = async (req, res) => {
    try {
        const doctors = await getApprovedDoctorsService();
        res.status(200).json({
            success: true,
            data: doctors
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
// Get doctor's available appointments (public for patients)
export const getDoctorAppointments = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const appointments = await getDoctorAvailableAppointmentsService(doctorId);
        res.status(200).json({
            success: true,
            data: appointments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getDoctorById = async (req, res) => {
    try {
        const doctor = await getDoctorByIdService(req.params.id);
        res.status(200).json({
            success: true,
            data: doctor
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

export const addDoctor = async (req, res) => {
    try {
        const doctor = await addDoctorService(req.params.id);
        res.status(200).json({
            success: true,
            message: "Doctor added successfully",
            data: doctor
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const createAppointment = async (req, res) => {
    try {
        // Add doctor ID from JWT token to appointment data
        const appointmentData = {
            ...req.body,
            doctor: req.user.id
        };
        const appointment = await createAppointmentService(appointmentData);
        res.status(201).json({
            success: true,
            message: "Appointment created successfully",
            data: appointment
        });
        
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}
