import express from 'express'
import { createUser, getUser } from '../Controller/usercontroller.js';
import { registerDoctor } from '../Controller/doctorRegisterController.js';



const router = express.Router()

router.get("/",getUser);
router.post("/createuser",createUser);
router.post("/doctor", registerDoctor);


export default router;