import { getUserservice ,createUserService} from "../Services/userservices.js";


export const getUser = async(req,res) =>{
    try{
        const user = await getUserservice();
        res.status(200).json(user);
    }catch(error){
        res.status(500).json({message: error.message})
    }
}

export const createUser= async(req,res)=>{
    try {
         const user = await createUserService(req.body);
         res.status(201).json({
             message: 'Patient registered successfully',
             user: user
         });
        
    } catch (error) {
         res.status(400).json({message: error.message})
    }
}