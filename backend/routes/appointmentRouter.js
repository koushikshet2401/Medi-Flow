import express from 'express'
import { clerkMiddleware, requireAuth } from '@clerk/express'

import { cancelAppointment, confirmPayment, createAppointment, getAppointementsByDoctor, getAppointments, getRegisteredUserCount, getStats, updateAppointment } from '../controllers/appointmentController.js';

const appointmentRouter= express.Router();

appointmentRouter.get("/",getAppointments)
appointmentRouter.get("/confirm", confirmPayment)
appointmentRouter.get("/stats/summary",getStats);


//auth routes
appointmentRouter.post('/', clerkMiddleware(),requireAuth(),createAppointment)

appointmentRouter.get('/me',clerkMiddleware(), requireAuth(), getAppointementsByDoctor)

appointmentRouter.get('/doctor/:doctorId', getAppointementsByDoctor)

appointmentRouter.post("/:id/cancel", cancelAppointment)
appointmentRouter.get('/paitents/count', getRegisteredUserCount)
appointmentRouter.put('/:id', updateAppointment);

export default appointmentRouter;

