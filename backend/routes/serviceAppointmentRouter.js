import express from 'express'

import { clerkMiddleware, requireAuth } from '@clerk/express'

import { cancelServiceAppointment, confirmServicePayment, createServiceAppointment, getServiceAppointment, getServiceAppointmentById, getServiceAppointmentByPatient, getServiceAppointmentStats, updateServiceAppointment } from '../controllers/serviceAppointmentController.js'

const serviceAppointmentRouter =express.Router();


serviceAppointmentRouter.get("/",getServiceAppointment)
serviceAppointmentRouter.get("/confirm", confirmServicePayment)
serviceAppointmentRouter.get("/stats/summary",getServiceAppointmentStats);

serviceAppointmentRouter.post("/", createServiceAppointment);

serviceAppointmentRouter.get("/me",  getServiceAppointmentByPatient );

serviceAppointmentRouter.get("/:id", getServiceAppointmentById);
serviceAppointmentRouter.put("/:id",updateServiceAppointment)
serviceAppointmentRouter.post("/:id/cancel",cancelServiceAppointment);

export default serviceAppointmentRouter;

