import mongoose from "mongoose";

const serviceAppointmentSchema = new mongoose.Schema({
    createdBy:{
        type : String,
        default : null,
        index : true
    },
    
  patientName: {
    type: String,
      required: true,
        trim: true,
    },

  mobile: {
    type: String,
      required: true,
        trim: true,
    },

  age: {
    type: Number,
      min: 0,
    },

  gender: {
    type: String,
      enum: ["Male", "Female", "Other", ""],
      default: "",
    },

  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
        required: true,
    },

  serviceName: {
    type: String,
      required: true,
    },

  serviceImage: {
    url: { type: String, default: "" },
    publicId: { type: String, default: "" },
  },

  fees: {
    type: Number,
      required: true,
        min: 0,
    },

  date: {
    type: String,
      required: true,
        index: true,
    },

  hour: {
    type: Number,
      required: true,
    },

  minute: {
    type: Number,
      required: true,
    },

  ampm: {
    type: String,
      enum: ["AM", "PM"],
      required: true,
    },

  status: {
    type: String,
      enum: ["Pending", "Confirmed", "Rescheduled", "Completed", "Canceled", "Missed"],
      default: "Pending",
      index: true,
    },

  visitConfirmation: {
    type: String,
    enum: ["Pending", "Coming", "Not Coming"],
    default: "Pending",
  },

  refundStatus: {
    type: String,
    enum: ["None", "Pending", "Processing", "Approved", "Rejected"],
    default: "None",
  },

  rescheduledTo: {
    date: { type: String },
    hour: { type: Number },
    minute: { type: Number },
    ampm: { type: String, enum: ["AM", "PM"] },
  },

  originalSlotHistory: [
    {
      date: { type: String },
      hour: { type: Number },
      minute: { type: Number },
      ampm: { type: String, enum: ["AM", "PM"] },
      reason: { type: String },
      updatedAt: { type: Date, default: Date.now },
    }
  ],
  rescheduledSlotHistory: [
    {
      date: { type: String },
      hour: { type: Number },
      minute: { type: Number },
      ampm: { type: String, enum: ["AM", "PM"] },
    }
  ],
  bookingStatus: {
    type: String,
    enum: ["Booked", "Rescheduled by Doctor", "Doctor Unavailable", "Auto-Reassigned", "Awaiting Patient Confirmation"],
    default: "Booked",
  },

  payment: {
    method: {
      type: String,
        enum: ["Cash", "Online"],
        default: "Cash",
      },

    status: {
      type: String,
     enum: ["Pending", "Paid", "Failed", "Refunded", "Confirmed"],
        default: "Pending",
      },

    amount: {
      type: Number,
        required: true,
      },

    providerId: {
      type: String,
        default: "",
      },

    paidAt: {
      type: Date,
        default: null,
      },

    sessionId: {
      type: String,
        default: "",
        // index: true,
      },

    meta: {
      type: mongoose.Schema.Types.Mixed,
        default: { },
    },
  },

},{timestamps:true})




serviceAppointmentSchema.index({ date : 1, status :1});
serviceAppointmentSchema.index({ serviceId: 1});
serviceAppointmentSchema.index({"payment.sessionId" : 1});

serviceAppointmentSchema.index(
  { serviceId: 1, date: 1, hour: 1, minute: 1, ampm: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["Pending", "Confirmed", "Rescheduled"] },
    },
  }
);

const ServiceAppointment = mongoose.model.ServiceAppointment || 
mongoose.model("ServiceAppointment", serviceAppointmentSchema)

export default ServiceAppointment;