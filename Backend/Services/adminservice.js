import Admin from "../Model/Admin.js"
import mongoose from "mongoose"
import User from "../Model/User.js";
import bcrypt from 'bcrypt'

export const createAdminService = async(admindata)=>{
   try {
      if (await User.findOne({ email: admindata.email })) {
              throw new Error("Email already registered");
          }

     const saltRounds = 10;
     const hashedPassword = await bcrypt.hash(admindata.password,saltRounds);
     
     const newAdmin = await Admin.create({
        ...admindata,
        password:hashedPassword,
        isActive:false
     })

     const admintdto = newAdmin.toObject();
     delete admintdto.password;
     return admintdto;
    
   } catch (error) {
     throw new Error(`Error : ${error.message}`)
   }
}