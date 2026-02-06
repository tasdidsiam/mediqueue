import jwt from 'jsonwebtoken'

export const jwtAuthenticationFilter = (req,res,next)=>{
  
    try {
        
           const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith('Bearer ')){
        return res.status(401).json({message:"Authorization header missing"});
    }

    const token = authHeader.split(' ')[1];

    if(!token){
        return res.status(401).json({
            message:"Token missing"
        })
    }
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decodedToken;
    next();

    } catch (error) {
        res.status(401).json({message:"Invalid or expired token"});
    }
 
};

export const authorizeRoles = (...roles)=>{
    return (req,res,next)=>{
        if(!roles.includes(req.user.role)){
            return res.status(403).json({message:"Forbidden: You do not have the required role"});
        }
        next();
    }}
export default jwtAuthenticationFilter;
