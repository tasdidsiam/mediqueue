import User from "../Model/User.js"
import Patient from "../Model/Patient.js"
import bcrypt from 'bcrypt'

export const getUserservice= async ()=> {
    const user = await User.find();
    return user;
}

export const createUserService = async(userData)=>{
    // Check if user already exists
    if(await User.findOne({email:userData.email})){
        throw new Error("User already exists");
    }

    // Validate required fields
    if (!userData.name || !userData.email || !userData.password) {
        throw new Error("Name, email, and password are required");
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword= await bcrypt.hash(userData.password,saltRounds);
    
    // Create patient user (role will be automatically set to 'patient' by discriminator)
    const newUser = await Patient.create({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        phone: userData.phone || null
    });
    
    const userDTO=newUser.toObject();
    delete userDTO.password;
    return userDTO;
}