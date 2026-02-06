import express from 'express';
import { getMyTokens, getMyTokenCount, bookAppointment } from '../Controller/patientController.js';
import { jwtAuthenticationFilter, authorizeRoles } from '../Middleware/jwtauthenticationfilter.js';

const router = express.Router();

// Book appointment (join queue)
router.post('/book-appointment', jwtAuthenticationFilter, authorizeRoles('patient'), bookAppointment);

// Get all my tokens
router.get('/my-tokens', jwtAuthenticationFilter, authorizeRoles('patient'), getMyTokens);

// Get my token count/stats
router.get('/my-tokens/count', jwtAuthenticationFilter, authorizeRoles('patient'), getMyTokenCount);

export default router;
