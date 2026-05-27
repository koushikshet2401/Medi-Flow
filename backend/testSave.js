import mongoose from "mongoose";
import ServiceAppointment from "./models/serviceAppointment.js";

const run = async () => {
    try {
        await mongoose.connect("mongodb+srv://medicareproject77_db_user:aGBoCeL6g6tsytu8@cluster0.vhyogee.mongodb.net/MediCare");
        console.log("DB connected");
        
        // Find an appointment to test
        const appt = await ServiceAppointment.findOne().sort({createdAt: -1});
        if (!appt) {
            console.log("Appt not found");
            return process.exit(0);
        }
        
        console.log("Found appt:", appt.patientName);
        appt.visitConfirmation = "Coming";
        appt.status = "Confirmed";
        
        await appt.save();
        console.log("Saved successfully!");
    } catch (err) {
        console.error("Save error:", err);
    }
    process.exit(0);
};

run();
