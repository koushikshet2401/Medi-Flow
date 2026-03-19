import express from 'express'
import { clerkMiddleware, requireAuth } from '@clerk/express'

import {
  cancelAppointment,
  confirmPayment,
  createAppointment,
  getAppointementsByDoctor,
  getAppointmentByPatient,   // ✅ was missing from import
  getAppointments,
  getRegisteredUserCount,
  getStats,
  updateAppointment
} from '../controllers/appointmentController.js';

const appointmentRouter = express.Router();

appointmentRouter.get("/", getAppointments)
appointmentRouter.get("/confirm", confirmPayment)
appointmentRouter.get("/stats/summary", getStats);

appointmentRouter.post('/',  createAppointment)
appointmentRouter.get('/me',  getAppointmentByPatient)
appointmentRouter.get('/doctor/:doctorId', getAppointementsByDoctor)

appointmentRouter.post("/:id/cancel", cancelAppointment)
appointmentRouter.get('/patients/count', getRegisteredUserCount)
appointmentRouter.put('/:id', updateAppointment);

export default appointmentRouter;