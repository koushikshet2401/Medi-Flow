import mongoose from "mongoose";

import validator from "validator";

const { isLowercase } = validator;


const doctorSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        index: true,

    },
    password:{
        type: String,
        required: true,
        select:false
    },
    name:{type: String,required: true,trime: true},
    specialization:{ type: String, default: ""},

    imageUrl: { type: String, default: null},
    imagePublicId: { type: String, default: null},

    experience:{type:String, default: ""},
    qualification:{type:String, default: ""},
    location:{type:String, default: ""},
    about:{type:String, default: ""},

    fee:{type:Number, default: 0},
    availability:{
        type:String,
        enum: ["Available", "Unavailable"],
        default: "Available"
    },

    availabilitySettings: {
        sessions: {
            type: String,
            enum: ["Morning", "Afternoon", "Both"],
            default: "Both",
        },
        weeklyDays: {
            type: [String],
            default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        },
        blockedDates: {
            type: [String],
            default: [],
        },
        partialDayAvailability: {
            type: Map,
            of: String,
            default: {},
        },
    },

    schedule: {type:Map, of:[String], default:{}},
    success: {type:String,default:""},
    patients:{type:String,default:""},
    rating:{type:Number,default:0},

},{
    timestamps: true
}
);

doctorSchema.index({ name: "text" , specialization: "text"});
const Doctor =  mongoose.model.Doctor || mongoose.model("Doctor", doctorSchema);

export default Doctor;