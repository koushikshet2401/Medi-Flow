import express from 'express';
import multer from 'multer';

import {
  createDoctor,
  deleteDoctor,
  DoctorLogin,
  getDoctorById,
  getDoctors,
  toggleAvailability,
  updateDoctor,
  adminUpdateDoctor,
  triggerDoctorAbsence,
  getDoctorAvailableSlots
} from '../controllers/doctorController.js';

import doctorAuth from '../middlewares/doctorAuth.js';

const upload = multer({ dest: "/tmp" });

const doctorRouter = express.Router();

doctorRouter.get("/", getDoctors);
doctorRouter.post("/login", DoctorLogin);

doctorRouter.get("/:id", getDoctorById);
doctorRouter.get("/:id/available-slots", getDoctorAvailableSlots);
doctorRouter.post("/", upload.single("image"), createDoctor);

// Admin-only route (uses Clerk token from admin panel – no doctor JWT needed)
doctorRouter.put("/:id/admin-update", adminUpdateDoctor);
doctorRouter.post("/:id/admin-absence", triggerDoctorAbsence);

// Doctor-authenticated routes
doctorRouter.put("/:id", doctorAuth, upload.single("image"), updateDoctor);
doctorRouter.post("/:id/toggle-availability", doctorAuth, toggleAvailability);
doctorRouter.post("/:id/absence", doctorAuth, triggerDoctorAbsence);

doctorRouter.delete("/:id", deleteDoctor);

export default doctorRouter;
