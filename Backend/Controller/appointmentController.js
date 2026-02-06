import { 
    getallappoinmentsservice,
    getAppointmentNumberService,
    getTodayAppointmentsService,
    getAppointmentQueueService,
    markTokenCompletedService,
    callNextPatientService,
    markTokenEmergencyService,
    skipTokenService,
    getCurrentTokenService,
    updateGlobalDelayService,
    checkAndApplyLatePenalties
} from "../Services/appointmentservice.js";

export const getallappointments = async (req,res)=>{
   
    try {
         const appointment = await getallappoinmentsservice(req.user.id);
         res.status(200).json(
            {
                success:true,
                data:appointment
            }
         )
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

}

export const getAppointmentNumberOfDoctor = async(req,res)=>{

    try{
        const appointment = await getAppointmentNumberService(req.user.id);
        res.status(200).json(
            {
                success:true,
                data:appointment
            }
         )
    }
     catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// Get today's active appointments for live session
export const getTodayAppointments = async (req, res) => {
    try {
        const appointments = await getTodayAppointmentsService(req.user.id);
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

// Get appointment queue details
export const getAppointmentQueue = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const appointment = await getAppointmentQueueService(appointmentId, req.user.id);
        res.status(200).json({
            success: true,
            data: appointment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Mark token as completed/consulted
export const markTokenCompleted = async (req, res) => {
    try {
        const { appointmentId, tokenId } = req.params;
        const appointment = await markTokenCompletedService(appointmentId, tokenId, req.user.id);
        res.status(200).json({
            success: true,
            message: 'Patient marked as consulted',
            data: appointment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Call next patient
export const callNextPatient = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const result = await callNextPatientService(appointmentId, req.user.id);
        res.status(200).json({
            success: true,
            message: 'Next patient called',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Mark token as emergency
export const markTokenEmergency = async (req, res) => {
    try {
        const { appointmentId, tokenId } = req.params;
        const appointment = await markTokenEmergencyService(appointmentId, tokenId, req.user.id);
        res.status(200).json({
            success: true,
            message: 'Token marked as emergency',
            data: appointment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Skip patient
export const skipToken = async (req, res) => {
    try {
        const { appointmentId, tokenId } = req.params;
        const appointment = await skipTokenService(appointmentId, tokenId, req.user.id);
        res.status(200).json({
            success: true,
            message: 'Patient skipped',
            data: appointment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get current active token
export const getCurrentToken = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const token = await getCurrentTokenService(appointmentId, req.user.id);
        res.status(200).json({
            success: true,
            data: token
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update global delay
export const updateGlobalDelay = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { delayMinutes } = req.body;
        
        if (delayMinutes === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Delay minutes is required'
            });
        }

        const appointment = await updateGlobalDelayService(appointmentId, delayMinutes, req.user.id);
        res.status(200).json({
            success: true,
            message: 'Delay updated successfully',
            data: appointment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Check and apply late penalties to all ongoing appointments
export const checkLatePenalties = async (req, res) => {
    try {
        await checkAndApplyLatePenalties();
        res.status(200).json({
            success: true,
            message: 'Late penalties checked and applied'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};