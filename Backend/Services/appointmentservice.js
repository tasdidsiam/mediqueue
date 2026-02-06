import Appointment from "../Model/Appointment.js";
import User from "../Model/User.js";
import mongoose from "mongoose";

// Scheduled interval for checking expired appointments (in milliseconds)
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes


export const createAppointmentService = async (appointmentData) => {
    const user = await appointmentData.doctor? User.findById(appointmentData.doctor):null;
    if (!user) {
        throw new Error("Doctor not found");
    }

    const currentTime = new Date()

    if(!currentTime<appointmentData.startTime){
        throw new Error("Starting time must be after current time")
    }

    // Validate that start time is before end time
    const startTime = new Date(appointmentData.startTime);
    const endTime = new Date(appointmentData.endTime);
    
    if (startTime >= endTime) {
        throw new Error("Start time must be before end time");
    }

    // Check for time collision only with non-completed appointments on the same date
    const appointmentDate = new Date(appointmentData.appointmentDate);
    const startOfDay = new Date(appointmentDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(appointmentDate.setHours(23, 59, 59, 999));

    const existingAppointment = await Appointment.findOne({
        doctor: appointmentData.doctor,
        appointmentDate: { 
            $gte: startOfDay, 
            $lte: endOfDay 
        },
        status: { $ne: 'completed' }, // Exclude completed appointments
        $or:[
            {
                startTime : { $lt :appointmentData.endTime},
                endTime : { $gt: appointmentData.startTime }
            }
        ]
    })

    if (existingAppointment) {
        throw new Error("This time slot is already booked.");
    }

    const appointment = new Appointment();
    appointment.doctor = appointmentData.doctor;
    appointment.title = appointmentData.title;
    appointment.maxpatients = appointmentData.maxpatients;
    appointment.appointmentDate = appointmentData.appointmentDate;
    appointment.startTime = appointmentData.startTime;
    appointment.endTime = appointmentData.endTime;

    // Settingh token rules 
    const intervalTimeMinutes = appointmentData.intervalTimeMinutes || 5;
    const tokenPenaltyAmount = appointmentData.tokenPenaltyAmount || 1;
    const gracePeriodMinutes = appointmentData.gracePeriodMinutes || 5;
    const autoMarkLateEnabled = appointmentData.autoMarkLateEnabled !== undefined ? appointmentData.autoMarkLateEnabled : true;

    // Validate token penalty amount
    if (tokenPenaltyAmount < 1) {
        throw new Error('Token penalty amount must be at least 1');
    }

    // Validate that interval time allows for all patients
    const totalTimeRequired = intervalTimeMinutes * appointmentData.maxpatients;
    const totalTimeAvailable = (endTime - startTime) / (60 * 1000); // Convert to minutes
    
    if (totalTimeRequired > totalTimeAvailable) {
        throw new Error(`Interval time too large: ${intervalTimeMinutes} minutes per patient × ${appointmentData.maxpatients} patients = ${totalTimeRequired} minutes, but appointment is only ${totalTimeAvailable} minutes long`);
    }

    appointment.tokenRules = {
        intervalTimeMinutes,
        tokenPenaltyAmount,
        gracePeriodMinutes,
        autoMarkLateEnabled
    };

    await appointment.save();
    return appointment;

}

// Book appointment for patient (join queue)
export const bookAppointmentForPatientService = async (appointmentId, patientId) => {
    try {
        const appointment = await Appointment.findById(appointmentId);
        
        if (!appointment) {
            throw new Error('Appointment not found');
        }

        // Check if appointment is still accepting patients
        if (appointment.status === 'completed' || appointment.status === 'cancelled') {
            throw new Error('This appointment is no longer accepting patients');
        }

        // Check if appointment is full
        if (appointment.queueTokens.length >= appointment.maxpatients) {
            throw new Error('Appointment is full');
        }

        // Check if patient already has a token for this appointment
        const existingToken = appointment.queueTokens.find(
            token => token.patient.toString() === patientId
        );
        
        if (existingToken) {
            throw new Error('You already have a token for this appointment');
        }

        // Calculate token number (next available)
        const tokenNumber = appointment.queueTokens.length + 1;

        // Use interval time from token rules (default 15 minutes if not set)
        const intervalTimeMs = (appointment.tokenRules?.intervalTimeMinutes || 15) * 60 * 1000;
        
        // Calculate schedule times based on CURRENT TIME vs IDEAL SLOT TIME
        const now = new Date();
        const appointmentStart = new Date(appointment.startTime);
        
        // Calculate the ideal slot start time based on token position
        const idealSlotStart = new Date(appointmentStart.getTime() + (intervalTimeMs * (tokenNumber - 1)));
        
        // If the ideal slot is in the past, schedule them at current time + 1 minute
        // Otherwise, use the ideal slot time
        let scheduleStartTime, scheduleEndTime;
        
        if (idealSlotStart < now) {
            // Appointment has already started, schedule based on current time
            if (appointment.status === 'ongoing') {
                // Find the last queued token's end time
                const lastQueuedToken = appointment.queueTokens
                    .filter(t => t.status === 'queued')
                    .sort((a, b) => b.scheduleEndTime - a.scheduleEndTime)[0];
                
                if (lastQueuedToken) {
                    // Schedule after the last queued patient
                    scheduleStartTime = new Date(Math.max(
                        lastQueuedToken.scheduleEndTime.getTime(),
                        now.getTime()
                    ));
                } else {
                    // No queued tokens, schedule immediately
                    scheduleStartTime = now;
                }
            } else {
                // Appointment hasn't started yet but slot is in past (shouldn't happen)
                scheduleStartTime = new Date(idealSlotStart);
            }
        } else {
            // Ideal slot is in the future, use it
            scheduleStartTime = new Date(idealSlotStart);
        }
        
        scheduleEndTime = new Date(scheduleStartTime.getTime() + intervalTimeMs);

        // Add patient to queue
        appointment.queueTokens.push({
            patient: patientId,
            tokenNumber: tokenNumber,
            scheduleStartTime: scheduleStartTime,
            scheduleEndTime: scheduleEndTime,
            status: 'queued'
        });

        await appointment.save();

        // Return appointment with populated patient data
        const updatedAppointment = await Appointment.findById(appointmentId)
            .populate('doctor', 'name specialization')
            .populate('queueTokens.patient', 'name email phone');

        return updatedAppointment;
    } catch (error) {
        throw new Error(`Error booking appointment: ${error.message}`);
    }
};

// Get doctor's available appointments (public for patients)
// Check and apply late penalties for patients who didn't show up on time
export const checkAndApplyLatePenalties = async () => {
    try {
        const now = new Date();
        
        // Find all ongoing appointments
        const ongoingAppointments = await Appointment.find({
            status: 'ongoing'
        });

        for (const appointment of ongoingAppointments) {
            if (!appointment.tokenRules?.autoMarkLateEnabled) {
                continue; // Skip if auto-penalty is disabled
            }

            const gracePeriodMs = (appointment.tokenRules.gracePeriodMinutes || 5) * 60 * 1000;
            const tokenPenaltyAmount = appointment.tokenRules.tokenPenaltyAmount || 1;
            const intervalTimeMs = (appointment.tokenRules?.intervalTimeMinutes || 15) * 60 * 1000;
            
            let modified = false;
            const queuedTokens = appointment.queueTokens.filter(token => token.status === 'queued');

            for (const token of queuedTokens) {
                const scheduleEndWithGrace = new Date(token.scheduleEndTime.getTime() + gracePeriodMs);
                
                // Also check token creation time - don't penalize tokens created less than grace period ago
                const tokenCreationTime = new Date(token.createdAt || token.scheduleStartTime);
                const timeSinceCreation = now - tokenCreationTime;
                const minTimeBeforePenalty = gracePeriodMs; // At least grace period must pass
                
                // If current time is past schedule end time + grace period, 
                // AND token was created long enough ago, mark as late
                if (now > scheduleEndWithGrace && timeSinceCreation > minTimeBeforePenalty) {
                    token.status = 'late_penalty';
                    token.tokenPenaltyCount = tokenPenaltyAmount;
                    
                    // Find the position to insert the penalized patient
                    // They should go after N tokens (tokenPenaltyAmount) in the remaining queued tokens
                    const currentIndex = queuedTokens.indexOf(token);
                    const remainingQueued = queuedTokens.slice(currentIndex + 1);
                    
                    if (remainingQueued.length > 0) {
                        const targetPosition = Math.min(tokenPenaltyAmount - 1, remainingQueued.length - 1);
                        const targetToken = remainingQueued[targetPosition];
                        
                        // Calculate new schedule times
                        // New start = target token's end time + 1 minute
                        const newStartTime = new Date(targetToken.scheduleEndTime.getTime() + (1 * 60 * 1000));
                        const newEndTime = new Date(newStartTime.getTime() + intervalTimeMs);
                        
                        token.scheduleStartTime = newStartTime;
                        token.scheduleEndTime = newEndTime;
                        
                        console.log(`Auto-penalty: Token #${token.tokenNumber} in appointment ${appointment._id} moved after Token #${targetToken.tokenNumber}`);
                    } else {
                        // No remaining tokens, move to end
                        const lastToken = appointment.queueTokens[appointment.queueTokens.length - 1];
                        token.scheduleStartTime = new Date(lastToken.scheduleEndTime.getTime());
                        token.scheduleEndTime = new Date(token.scheduleStartTime.getTime() + intervalTimeMs);
                        
                        console.log(`Auto-penalty: Token #${token.tokenNumber} in appointment ${appointment._id} moved to end of queue`);
                    }
                    
                    modified = true;
                }
            }

            if (modified) {
                await appointment.save();
            }
        }
    } catch (error) {
        console.error('Error checking late penalties:', error);
    }
};

export const getDoctorAvailableAppointmentsService = async (doctorId) => {
    try {
        const now = new Date();
        // Set to start of today to include all appointments from today onwards
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const appointments = await Appointment.find({
            doctor: doctorId,
            appointmentDate: { $gte: today },
            status: { $in: ['scheduled', 'ongoing'] }
        })
        .populate('doctor', 'name specialization')
        .select('title appointmentDate startTime endTime maxpatients queueTokens status')
        .sort({ appointmentDate: 1, startTime: 1 });

        // Add available slots info
        const appointmentsWithSlots = appointments.map(apt => ({
            _id: apt._id,
            title: apt.title,
            appointmentDate: apt.appointmentDate,
            startTime: apt.startTime,
            endTime: apt.endTime,
            maxpatients: apt.maxpatients,
            bookedSlots: apt.queueTokens.length,
            availableSlots: apt.maxpatients - apt.queueTokens.length,
            status: apt.status,
            doctor: apt.doctor
        }));

        return appointmentsWithSlots;
    } catch (error) {
        throw new Error(`Error fetching doctor appointments: ${error.message}`);
    }
};

export const getallappoinmentsservice= async(doctorId)=>{
    
    const appointment = await Appointment.find({
        doctor : doctorId
    })
    

    return appointment;

}

export const getAppointmentNumberService= async(doctorid)=>{
  try {
        // 1. Define "Today"
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // 2. Run the Aggregation Pipeline
        const stats = await Appointment.aggregate([
            {
                // Stage 1: Filter documents for this doctor & today only
                $match: {
                    doctor: new mongoose.Types.ObjectId(doctorid), 
                    appointmentDate: { 
                        $gte: startOfDay, 
                        $lte: endOfDay 
                    }
                }
            },
            {
                // Stage 2: Calculate all metrics
                $group: {
                    _id: null,
                    
                    // Total appointments today
                    appointmentsCount: { $sum: 1 },
                    
                    // Completed appointments today
                    completedAppointments: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
                        }
                    },
                    
                    // Total patients/tokens today
                    totalPatients: { $sum: { $size: "$queueTokens" } },
                    
                    // All tokens for further processing
                    allTokens: { $push: "$queueTokens" }
                }
            },
            {
                // Stage 3: Calculate completed and emergency counts
                $project: {
                    appointmentsCount: 1,
                    completedAppointments: 1,
                    totalPatients: 1,
                    completedTokens: {
                        $size: {
                            $filter: {
                                input: { $reduce: {
                                    input: "$allTokens",
                                    initialValue: [],
                                    in: { $concatArrays: ["$$value", "$$this"] }
                                }},
                                as: "token",
                                cond: { $eq: ["$$token.status", "completed"] }
                            }
                        }
                    },
                    emergencyTokens: {
                        $size: {
                            $filter: {
                                input: { $reduce: {
                                    input: "$allTokens",
                                    initialValue: [],
                                    in: { $concatArrays: ["$$value", "$$this"] }
                                }},
                                as: "token",
                                cond: { $eq: ["$$token.status", "emergency"] }
                            }
                        }
                    }
                }
            }
        ]);

        console.log(stats)
        // 3. Handle the result (Aggregation returns an array)
        if (stats.length > 0) {
            return stats[0];
        } else {
            return { 
                appointmentsCount: 0,
                completedAppointments: 0,
                totalPatients: 0,
                completedTokens: 0,
                emergencyTokens: 0
            };
        }

    } catch (error) {
        throw new Error(`Error fetching stats: ${error.message}`);
    }
}

// Get today's active appointments for live session
export const getTodayAppointmentsService = async (doctorId) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const appointments = await Appointment.find({
            doctor: doctorId,
            appointmentDate: { 
                $gte: startOfDay, 
                $lte: endOfDay 
            }
        }).populate({
            path: 'queueTokens.patient',
            select: 'name email phone'
        }).sort({ startTime: 1 });

        console.log(`Found ${appointments.length} appointments for doctor ${doctorId}`);
        appointments.forEach(apt => {
            console.log(`Appointment ${apt._id}: ${apt.title}, Tokens: ${apt.queueTokens?.length || 0}`);
            if (apt.queueTokens && apt.queueTokens.length > 0) {
                apt.queueTokens.forEach(token => {
                    console.log(`  Token #${token.tokenNumber}: Patient ${token.patient?.name || 'UNPOPULATED'}, Status: ${token.status}`);
                });
            }
        });

        return appointments;
    } catch (error) {
        throw new Error(`Error fetching today's appointments: ${error.message}`);
    }
};

// Get appointment queue details
export const getAppointmentQueueService = async (appointmentId, doctorId) => {
    try {
        const appointment = await Appointment.findOne({
            _id: appointmentId,
            doctor: doctorId
        }).populate({
            path: 'queueTokens.patient',
            select: 'name email phone'
        });

        if (!appointment) {
            throw new Error('Appointment not found or unauthorized');
        }

        // Check and apply late penalties if auto-marking is enabled
        if (appointment.status === 'ongoing' && appointment.tokenRules?.autoMarkLateEnabled) {
            const now = new Date();
            const gracePeriodMs = (appointment.tokenRules.gracePeriodMinutes || 5) * 60 * 1000;
            const tokenPenaltyAmount = appointment.tokenRules.tokenPenaltyAmount || 1;
            
            let modified = false;

            for (const token of appointment.queueTokens) {
                if (token.status !== 'queued') continue;

                const scheduleEndWithGrace = new Date(token.scheduleEndTime.getTime() + gracePeriodMs);
                
                if (now > scheduleEndWithGrace) {
                    token.status = 'late_penalty';
                    token.tokenPenaltyCount = tokenPenaltyAmount;
                    modified = true;
                    console.log(`Applied late penalty to token #${token.tokenNumber}`);
                }
            }

            if (modified) {
                await appointment.save();
            }
        }

        console.log(`Queue for appointment ${appointmentId}: ${appointment.queueTokens?.length || 0} tokens`);
        if (appointment.queueTokens && appointment.queueTokens.length > 0) {
            appointment.queueTokens.forEach(token => {
                console.log(`  Token #${token.tokenNumber}: Patient ${token.patient?.name || 'NULL'}, Status: ${token.status}`);
            });
        }

        // Sort tokens: emergency first, then by token number
        if (appointment.queueTokens && appointment.queueTokens.length > 0) {
            appointment.queueTokens.sort((a, b) => {
                // Emergency tokens always come first
                if (a.status === 'emergency' && b.status !== 'emergency') return -1;
                if (a.status !== 'emergency' && b.status === 'emergency') return 1;
                // Otherwise sort by token number
                return a.tokenNumber - b.tokenNumber;
            });
        }

        return appointment;
    } catch (error) {
        throw new Error(`Error fetching queue: ${error.message}`);
    }
};

// Mark token as completed/consulted
export const markTokenCompletedService = async (appointmentId, tokenId, doctorId) => {
    try {
        const appointment = await Appointment.findOne({
            _id: appointmentId,
            doctor: doctorId
        });

        if (!appointment) {
            throw new Error('Appointment not found or unauthorized');
        }

        // Validate appointment is currently active
        if (appointment.status !== 'ongoing') {
            throw new Error('Cannot mark token as complete - appointment is not currently active');
        }

        const token = appointment.queueTokens.id(tokenId);
        if (!token) {
            throw new Error('Token not found');
        }

        // Check if patient's scheduled time has arrived
        const now = new Date();
        const scheduleStart = new Date(token.scheduleStartTime);
        
        if (now < scheduleStart) {
            const scheduledTime = scheduleStart.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
            throw new Error(`Cannot mark as consulted - Patient's scheduled time is ${scheduledTime}. Please wait until their time slot.`);
        }

        // Set consultation start time if not already set
        if (!token.consultationStartTime) {
            token.consultationStartTime = new Date();
        }

        token.status = 'completed';
        token.consultationEndTime = new Date();
        await appointment.save();

        return appointment;
    } catch (error) {
        throw new Error(`Error marking token as completed: ${error.message}`);
    }
};

// Call next patient in queue
export const callNextPatientService = async (appointmentId, doctorId) => {
    try {
        const appointment = await Appointment.findOne({
            _id: appointmentId,
            doctor: doctorId
        }).populate({
            path: 'queueTokens.patient',
            select: 'name email phone'
        });

        if (!appointment) {
            throw new Error('Appointment not found or unauthorized');
        }

        // Validate appointment is currently active
        if (appointment.status !== 'ongoing') {
            throw new Error('Cannot call next patient - appointment is not currently active');
        }

        const now = new Date();
        const gracePeriodMs = (appointment.tokenRules?.gracePeriodMinutes || 5) * 60 * 1000;
        const tokenPenaltyAmount = appointment.tokenRules?.tokenPenaltyAmount || 1;
        const intervalTimeMs = (appointment.tokenRules?.intervalTimeMinutes || 15) * 60 * 1000;
        let penaltiesApplied = [];
        let skippedToken = null;

        // Get all queued tokens (excluding completed, skipped, etc.)
        const queuedTokens = appointment.queueTokens.filter(token => token.status === 'queued');
        
        if (queuedTokens.length === 0) {
            throw new Error('No more patients in queue');
        }

        // Find the first queued patient
        const currentFirstToken = queuedTokens[0];

        // Check if the first patient's time has expired
        const scheduleEndWithGrace = new Date(currentFirstToken.scheduleEndTime.getTime() + gracePeriodMs);
        
        if (now > scheduleEndWithGrace) {
            // Skip the first patient and penalize them
            currentFirstToken.status = 'late_penalty';
            currentFirstToken.tokenPenaltyCount = tokenPenaltyAmount;
            
            // Find the position to insert the skipped patient
            // They should go after N tokens (tokenPenaltyAmount) in the remaining queue
            const targetPosition = Math.min(tokenPenaltyAmount, queuedTokens.length - 1);
            const targetToken = queuedTokens[targetPosition];
            
            // Calculate new schedule times
            // New start = target token's end time + 1 minute
            const newStartTime = new Date(targetToken.scheduleEndTime.getTime() + (1 * 60 * 1000));
            const newEndTime = new Date(newStartTime.getTime() + intervalTimeMs);
            
            currentFirstToken.scheduleStartTime = newStartTime;
            currentFirstToken.scheduleEndTime = newEndTime;
            
            skippedToken = {
                tokenNumber: currentFirstToken.tokenNumber,
                patientName: currentFirstToken.patient?.name || 'Unknown',
                tokensSkipped: tokenPenaltyAmount,
                afterTokenNumber: targetToken.tokenNumber,
                newScheduleTime: newStartTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                })
            };
            
            penaltiesApplied.push(skippedToken);
            console.log(`Skipped Token #${currentFirstToken.tokenNumber} - moved after Token #${targetToken.tokenNumber}`);
            
            await appointment.save();
        }

        // Find the next queued patient (after skipping)
        const nextToken = appointment.queueTokens.find(token => token.status === 'queued');
        
        if (!nextToken) {
            throw new Error('No more patients in queue');
        }

        // Set consultation start time for the next patient
        nextToken.consultationStartTime = new Date();
        await appointment.save();

        return { appointment, nextToken, penaltiesApplied, skippedToken };
    } catch (error) {
        throw new Error(`Error calling next patient: ${error.message}`);
    }
};

// Mark token as emergency
export const markTokenEmergencyService = async (appointmentId, tokenId, doctorId) => {
    try {
        const appointment = await Appointment.findOne({
            _id: appointmentId,
            doctor: doctorId
        });
// Validate appointment is currently active
        if (appointment.status !== 'ongoing') {
            throw new Error('Cannot mark as emergency - appointment is not currently active');
        }

        
        if (!appointment) {
            throw new Error('Appointment not found or unauthorized');
        }

        const token = appointment.queueTokens.id(tokenId);
        if (!token) {
            throw new Error('Token not found');
        }

        token.status = 'emergency';
        await appointment.save();

        return appointment;
    } catch (error) {
        throw new Error(`Error marking token as emergency: ${error.message}`);
    }
};

// Skip patient (no-show)
export const skipTokenService = async (appointmentId, tokenId, doctorId) => {
    try {
        const appointment = await Appointment.findOne({
            _id: appointmentId,
            doctor: doctorId
        });
// Validate appointment is currently active
        if (appointment.status !== 'ongoing') {
            throw new Error('Cannot skip patient - appointment is not currently active');
        }

        
        if (!appointment) {
            throw new Error('Appointment not found or unauthorized');
        }

        const token = appointment.queueTokens.id(tokenId);
        if (!token) {
            throw new Error('Token not found');
        }

        token.status = 'skipped';
        // Record the time when patient was skipped to freeze wait time
        token.consultationEndTime = new Date();
        await appointment.save();

        return appointment;
    } catch (error) {
        throw new Error(`Error skipping token: ${error.message}`);
    }
};

// Get current active token
export const getCurrentTokenService = async (appointmentId, doctorId) => {
    try {
        const appointment = await Appointment.findOne({
            _id: appointmentId,
            doctor: doctorId
        }).populate({
            path: 'queueTokens.patient',
            select: 'name email phone'
        });

        if (!appointment) {
            throw new Error('Appointment not found or unauthorized');
        }

        // Find the first queued token (current active patient)
        const currentToken = appointment.queueTokens.find(token => token.status === 'queued');
        
        return currentToken || null;
    } catch (error) {
        throw new Error(`Error fetching current token: ${error.message}`);
    }
};

// Update global delay
export const updateGlobalDelayService = async (appointmentId, delayMinutes, doctorId) => {
    try {
        const appointment = await Appointment.findOne({
            _id: appointmentId,
            doctor: doctorId
        });

        if (!appointment) {
            throw new Error('Appointment not found or unauthorized');
        }

        appointment.globalDelay = delayMinutes;
        await appointment.save();

        return appointment;
    } catch (error) {
        throw new Error(`Error updating delay: ${error.message}`);
    }
};

/**
 * Updates appointment statuses based on current time
 * - Sets to 'completed' if end time has passed and status is 'scheduled' or 'ongoing'
 * - Sets to 'ongoing' if start time has passed and status is 'scheduled'
 */
export const updateExpiredAppointmentsService = async () => {
    try {
        const currentTime = new Date();

        // Update appointments that have ended to 'completed'
        const completedResult = await Appointment.updateMany(
            {
                endTime: { $lt: currentTime },
                status: { $in: ['scheduled', 'ongoing'] }
            },
            {
                $set: { status: 'completed' }
            }
        );

        // Update appointments that have started but not ended to 'ongoing'
        const ongoingResult = await Appointment.updateMany(
            {
                startTime: { $lte: currentTime },
                endTime: { $gt: currentTime },
                status: 'scheduled'
            },
            {
                $set: { status: 'ongoing' }
            }
        );

        return {
            completedCount: completedResult.modifiedCount,
            ongoingCount: ongoingResult.modifiedCount,
            timestamp: currentTime
        };
    } catch (error) {
        console.error('Error updating expired appointments:', error);
        throw error;
    }
};

/**
 * Starts automatic appointment status updates and penalty checks
 * Checks every 30 seconds for appointments that need status updates and applies late penalties
 */
export const startAppointmentStatusScheduler = () => {
    const CHECK_INTERVAL = 30 * 1000; // 30 seconds

    // Run immediately on start
    updateExpiredAppointmentsService()
        .then(result => {
            console.log('Initial appointment status update:', result);
        })
        .catch(error => {
            console.error('Error in initial appointment status update:', error);
        });
    
    // Also run penalty check immediately
    checkAndApplyLatePenalties()
        .then(() => {
            console.log('Initial late penalty check completed');
        })
        .catch(error => {
            console.error('Error in initial penalty check:', error);
        });

    // Then run at regular intervals
    const intervalId = setInterval(async () => {
        try {
            // Update appointment statuses
            const result = await updateExpiredAppointmentsService();
            if (result.completedCount > 0 || result.ongoingCount > 0) {
                console.log(`Appointment status update: ${result.completedCount} completed, ${result.ongoingCount} ongoing`);
            }
            
            // Check and apply late penalties
            await checkAndApplyLatePenalties();
        } catch (error) {
            console.error('Error in scheduled appointment status update:', error);
        }
    }, CHECK_INTERVAL);

    // Return the interval ID so it can be cleared if needed
    return intervalId;
};

// Get all tokens for a specific patient
export const getPatientTokensService = async (patientId) => {
    try {
        const appointments = await Appointment.find({
            'queueTokens.patient': patientId
        })
        .populate('doctor', 'name specialization')
        .populate('queueTokens.patient', 'name email phone')
        .select('title appointmentDate startTime endTime status queueTokens');

        // Extract only tokens belonging to this patient
        const patientTokens = [];
        appointments.forEach(appointment => {
            const tokens = appointment.queueTokens.filter(
                token => token.patient._id.toString() === patientId
            );
            
            tokens.forEach(token => {
                patientTokens.push({
                    appointmentId: appointment._id,
                    appointmentTitle: appointment.title,
                    appointmentDate: appointment.appointmentDate,
                    appointmentStartTime: appointment.startTime,
                    appointmentEndTime: appointment.endTime,
                    appointmentStatus: appointment.status,
                    doctor: appointment.doctor,
                    tokenNumber: token.tokenNumber,
                    tokenStatus: token.status,
                    scheduleStartTime: token.scheduleStartTime,
                    scheduleEndTime: token.scheduleEndTime,
                    penaltyDelayMinutes: token.penaltyDelayMinutes,
                    createdAt: token.createdAt
                });
            });
        });

        return patientTokens;
    } catch (error) {
        throw new Error(`Error fetching patient tokens: ${error.message}`);
    }
};

// Get token count for a patient
export const getPatientTokenCountService = async (patientId) => {
    try {
        const result = await Appointment.aggregate([
            { $unwind: '$queueTokens' },
            { $match: { 'queueTokens.patient': new mongoose.Types.ObjectId(patientId) } },
            { 
                $group: {
                    _id: null,
                    totalTokens: { $sum: 1 },
                    queuedTokens: {
                        $sum: { $cond: [{ $eq: ['$queueTokens.status', 'queued'] }, 1, 0] }
                    },
                    completedTokens: {
                        $sum: { $cond: [{ $eq: ['$queueTokens.status', 'completed'] }, 1, 0] }
                    },
                    skippedTokens: {
                        $sum: { $cond: [{ $eq: ['$queueTokens.status', 'skipped'] }, 1, 0] }
                    }
                }
            }
        ]);

        return result.length > 0 ? result[0] : {
            totalTokens: 0,
            queuedTokens: 0,
            completedTokens: 0,
            skippedTokens: 0
        };
    } catch (error) {
        throw new Error(`Error fetching token count: ${error.message}`);
    }
};