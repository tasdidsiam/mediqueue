import mongoose from "mongoose";

const connectdb = async() => {
    try{
      
        await mongoose.connect(process.env.MONGO_URI)
        console.log("DB connected Succesfully");

    }catch(error){
        console.log(error)
    }
}

export default connectdb;