import { registerDoctorService } from "../Services/doctorRegisterService.js";

export const registerDoctor = async (req, res) => {
  try {
    const doctor = await registerDoctorService(req.body);

    res.status(201).json({
      message: "Doctor registered successfully. Awaiting admin approval.",
      doctor
    });

  } catch (error) {
    console.log(error);

    res.status(400).json({
      message: error.message || "Registration failed"
    });
  }
};
