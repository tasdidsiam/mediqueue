import { getPatientTokensService, getPatientTokenCountService, bookAppointmentForPatientService } from "../Services/appointmentservice.js";

// Book appointment (join queue)
export const bookAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.body;
        
        if (!appointmentId) {
            return res.status(400).json({
                success: false,
                message: 'Appointment ID is required'
            });
        }

        const appointment = await bookAppointmentForPatientService(appointmentId, req.user.id);
        
        res.status(200).json({
            success: true,
            message: 'Appointment booked successfully',
            data: appointment
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get all tokens for logged-in patient
export const getMyTokens = async (req, res) => {
    try {
        const tokens = await getPatientTokensService(req.user.id);
        res.status(200).json({
            success: true,
            count: tokens.length,
            data: tokens
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get token count/stats for logged-in patient
export const getMyTokenCount = async (req, res) => {
    try {
        const count = await getPatientTokenCountService(req.user.id);
        res.status(200).json({
            success: true,
            data: count
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
