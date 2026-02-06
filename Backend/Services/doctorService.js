import Doctor from "../Model/Doctor.js";

// Get all registered doctors with pending approval status
export const getAllDoctorsService = async () => {
    const doctors = await Doctor.find({ approvalstatus: 'Pending' }).select('-password');
    return doctors;
};

// Get all approved and active doctors (public for patients)
export const getApprovedDoctorsService = async () => {
    const doctors = await Doctor.find({ 
        approvalstatus: 'Approved',
        isActive: true 
    }).select('-password');
    return doctors;
};

// Get single doctor by ID
export const getDoctorByIdService = async (id) => {
    const doctor = await Doctor.findById(id).select('-password');
    if (!doctor) {
        throw new Error("Doctor not found");
    }
    return doctor;
};

// Activate/Add doctor (update isActive status)
export const addDoctorService = async (doctorId) => {
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
        throw new Error("Doctor not found");
    }
    
    if (doctor.isActive) {
        throw new Error("Doctor is already active");
    }
    
    doctor.isActive = true;
    doctor.approvalstatus="Approved"
    await doctor.save();
    
    const doctorDTO = doctor.toObject();
    delete doctorDTO.password;
    return doctorDTO;
};
