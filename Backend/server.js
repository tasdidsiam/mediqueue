import express from 'express'
import dotenv from 'dotenv'
import register from "./Routes/register.js";
import connectdb from './Config/dbconfig.js';
import authroutes from './Routes/authroutes.js';
import doctorRoutes from './Routes/doctorRoutes.js';
import adminroutes from './Routes/adminroutes.js'
import patientRoutes from './Routes/patientRoutes.js';
import morgan from 'morgan';
import cors from 'cors';
import { startAppointmentStatusScheduler } from './Services/appointmentservice.js';

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());           
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).send("MediQueue API is running 🚀");
});

const startServer = async () => {
  try {
    await connectdb(); // wait for DB
    console.log("Database ready");

    startAppointmentStatusScheduler();
    console.log('Appointment status scheduler started - checking every 30 seconds');

    app.use("/register", register);
    app.use("/auth", authroutes);
    app.use("/doctors", doctorRoutes);
    app.use("/admin", adminroutes);
    app.use("/patients", patientRoutes);

    app.get("/", (req, res) => {
  res.send("MediQueue API is running");
});

    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
