import express from 'express';
import {
  getAllDoctors,
  getDoctorById,
  addDoctor,
  createAppointment,
  getApprovedDoctors,
  getDoctorAppointments
} from '../Controller/doctorController.js';

import { registerDoctor } from '../Controller/doctorRegisterController.js';

import {
  jwtAuthenticationFilter,
  authorizeRoles
} from '../Middleware/jwtauthenticationfilter.js';

import {
  getallappointments,
  getAppointmentNumberOfDoctor,
  getTodayAppointments,
  getAppointmentQueue,
  markTokenCompleted,
  callNextPatient,
  markTokenEmergency,
  skipToken,
  getCurrentToken,
  updateGlobalDelay,
  checkLatePenalties
} from '../Controller/appointmentController.js';

import adminAuth from '../Middleware/jwtauthenticationfilter.js';
import TokenRule from '../Model/TokenRule.js';

const router = express.Router();

/* =========================
   DOCTOR REGISTER (FIX)
========================= */
router.post('/register', registerDoctor);

/* =========================
   PUBLIC DOCTOR ROUTES
========================= */
router.get('/', getApprovedDoctors);
router.get('/:doctorId/appointments', getDoctorAppointments);

/* =========================
   ADMIN DOCTOR ROUTES
========================= */
router.get(
  '/getalldoctors',
  jwtAuthenticationFilter,
  authorizeRoles('admin'),
  getAllDoctors
);

/* =========================
   DOCTOR APPOINTMENTS
========================= */
router.get(
  '/getappointmentnumberandpatienttoday',
  jwtAuthenticationFilter,
  authorizeRoles('doctor'),
  getAppointmentNumberOfDoctor
);

router.post(
  '/create-appointment',
  jwtAuthenticationFilter,
  authorizeRoles('doctor'),
  createAppointment
);

router.get(
  '/getalldoctorsappointment',
  jwtAuthenticationFilter,
  authorizeRoles('doctor'),
  getallappointments
);

/* =========================
   LIVE SESSION
========================= */
router.get(
  '/appointments/today-live',
  jwtAuthenticationFilter,
  authorizeRoles('doctor'),
  getTodayAppointments
);

router.get(
  '/appointments/:appointmentId/queue',
  jwtAuthenticationFilter,
  authorizeRoles('doctor'),
  getAppointmentQueue
);

router.get(
  '/appointments/:appointmentId/current-token',
  jwtAuthenticationFilter,
  authorizeRoles('doctor'),
  getCurrentToken
);

router.patch(
  '/appointments/:appointmentId/tokens/:tokenId/complete',
  jwtAuthenticationFilter,
  authorizeRoles('doctor'),
  markTokenCompleted
);

router.patch(
  '/appointments/:appointmentId/call-next',
  jwtAuthenticationFilter,
  authorizeRoles('doctor'),
  callNextPatient
);

router.patch(
  '/appointments/:appointmentId/tokens/:tokenId/emergency',
  jwtAuthenticationFilter,
  authorizeRoles('doctor'),
  markTokenEmergency
);

router.patch(
  '/appointments/:appointmentId/tokens/:tokenId/skip',
  jwtAuthenticationFilter,
  authorizeRoles('doctor'),
  skipToken
);

router.patch(
  '/appointments/:appointmentId/delay',
  jwtAuthenticationFilter,
  authorizeRoles('doctor'),
  updateGlobalDelay
);

router.post(
  '/appointments/check-penalties',
  jwtAuthenticationFilter,
  authorizeRoles('doctor'),
  checkLatePenalties
);

/* =========================
   TOKEN RULES
========================= */
router.get('/token-rules', adminAuth, async (req, res) => {
  const rules = await TokenRule.find();
  res.json({ data: rules });
});

/* =========================
   ADMIN ACTIONS (LAST)
========================= */
router.get('/:id',
  jwtAuthenticationFilter,
  authorizeRoles('admin'),
  getDoctorById
);

router.patch('/:id/add',
  jwtAuthenticationFilter,
  authorizeRoles('admin'),
  addDoctor
);

export default router;
