import Doctor from "../Model/Doctor.js";
import User from "../Model/User.js";
import bcrypt from "bcrypt";

export const registerDoctorService = async (doctorData) => {

  const email = doctorData.email.toLowerCase().trim();

  // email check
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("Email already registered");
  }

  // license check
  const existingLicense = await Doctor.findOne({
    licenseNumber: doctorData.licenseNumber
  });

  if (existingLicense) {
    throw new Error("License already registered");
  }

  const hashedPassword = await bcrypt.hash(doctorData.password, 10);

  let user;

  try {
    // create login user
    user = await User.create({
      name: doctorData.name,
      email,
      password: hashedPassword,
      role: "doctor",
      approved: false,
      isActive: false,
      licenseNumber: doctorData.licenseNumber
    });

    // create doctor profile
  const doctor = await Doctor.create({
  name: doctorData.name,
  email,
  userId: user._id,
  specialization: doctorData.specialization || "General",
  licenseNumber: doctorData.licenseNumber,
  experience: doctorData.experience || 0,
  isActive: false
});

    return doctor;

  } catch (err) {
    console.log("Doctor create error:", err);

    if (user) {
      await User.findByIdAndDelete(user._id);
    }

    throw err;
  }
};
