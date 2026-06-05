import mongoose from "mongoose";
import Doctor from "./models/Doctor.js";
import { getSlotsForSettings, getAvailableSlots } from "./utils/slotHelper.js";
import dotenv from "dotenv";

dotenv.config();

async function test() {
  await mongoose.connect("mongodb+srv://medicareproject77_db_user:aGBoCeL6g6tsytu8@cluster0.vhyogee.mongodb.net/MediCare");
  console.log("DB connected");

  // get a doctor (any doctor)
  const doc = await Doctor.findOne();
  if (!doc) return console.log("no doctor");
  
  console.log(`Doctor: ${doc.name}`);

  const dates = [];
  const slotsMap = {};
  const today = new Date();
  const isPastClosingTime = today.getHours() > 19 || (today.getHours() === 19 && today.getMinutes() >= 30);
  
  console.log("Today is:", today);
  console.log("isPastClosingTime:", isPastClosingTime);

  for (let i = 0; i < 14; i++) {
    if (i === 0 && isPastClosingTime) continue;

    const dt = new Date(today);
    dt.setDate(today.getDate() + i);
    const dateStr = dt.toISOString().split("T")[0];

    const allSlots = getSlotsForSettings(dateStr, doc.availabilitySettings);
    if (allSlots.length === 0) continue; 

    const info = await getAvailableSlots(doc._id, "doctor", dateStr);
    dates.push(dateStr);
    slotsMap[dateStr] = {
      allSlots: info.allSlots,
      availableSlots: info.availableSlots,
      bookedSlots: info.bookedSlots,
    };
  }

  console.log("Dates:", dates.slice(0, 3));
  console.log("SlotsMap for today:", slotsMap[dates[0]]);
  
  process.exit(0);
}
test();
