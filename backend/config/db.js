import mongoose from "mongoose";

export const connectDB = async () => {
    await mongoose.connect("mongodb+srv://medicareproject77_db_user:aGBoCeL6g6tsytu8@cluster0.vhyogee.mongodb.net/MediCare")
    .then(() => {
        console.log("DB Connected");
    });
}