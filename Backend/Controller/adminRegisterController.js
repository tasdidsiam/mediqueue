
import { createAdminService } from "../Services/adminservice.js";

export const createAdmin= async(req,res)=>{
    try{
        const admin = await createAdminService(req.body);
         res.status(201).json({
             message: 'Admin Registered Successfully',
             user: admin
         });
    }catch(error){
        res.status(400).json({messsage:error.message})
    }
}