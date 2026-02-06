import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import User from '../Model/User.js'

export const loginService = async (email,password)=>{

    const user = await User.findOne({email}).select('+password');

    console.log('User lookup for email:', email, '- Found:', !!user);
    
    if(!user){
        throw new Error("Invalid credentials");
    }

    console.log('User role:', user.role);
    
    const isMatch = await bcrypt.compare(password,user.password);
    console.log('Password match:', isMatch);
    
    if(!isMatch){
        throw new Error("Invalid Credentials");
    }

    const token = jwt.sign(
        {id: user._id, email:user.email,role: user.role},
        process.env.JWT_SECRET,
        {expiresIn:process.env.JWT_EXPIRE || "7d"}
    );

    console.log('Token generated successfully');

    return {
        token,
        user:{
            id:user._id,
            name:user.name,
            email:user.email,
            role:user.role
        }
    }
}