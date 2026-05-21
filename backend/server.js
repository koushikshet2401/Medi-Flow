import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { clerkMiddleware } from '@clerk/express';
import { connectDB } from './config/db.js';
import doctorRouter from './routes/doctorRouter.js';
import serviceRouter from './routes/serviceRouter.js';
import appointmentRouter from './routes/appointmentRouter.js';
import serviceAppointmentRouter from './routes/serviceAppointmentRouter.js';

const app = express();
const port = 4000;


// --- CORS CONFIG ---
// Allowed exact production origins
const ALLOWED_ORIGINS = [
    "https://medi-flow-frontend.onrender.com",
    "https://medi-flow-admin.onrender.com",
];

// Check if an origin is allowed
function isOriginAllowed(origin) {
    if (!origin) return true; // allow server-to-server / curl / health checks
    if (ALLOWED_ORIGINS.includes(origin)) return true;
    // Allow ANY localhost origin regardless of port number
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
    // Allow ANY 127.0.0.1 origin regardless of port number
    if (/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
    return false;
}

// Middlewares
app.use(cors({
    origin: function (origin, callback) {
        if (isOriginAllowed(origin)) {
            return callback(null, true);
        }
        console.warn(`CORS blocked origin: ${origin}`);
        return callback(new Error(`CORS policy: origin '${origin}' not allowed`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));
app.use(clerkMiddleware());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Handle preflight OPTIONS requests explicitly for all routes
app.options(/(.*)/, cors({
    origin: function (origin, callback) {
        if (isOriginAllowed(origin)) return callback(null, true);
        return callback(new Error(`CORS: origin '${origin}' not allowed`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}))



// DB
connectDB();

// Routes
app.use("/api/doctors", doctorRouter);
app.use("/api/services", serviceRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/service-appointments", serviceAppointmentRouter);

app.get('/', (req, res) => {
    res.send('api working!');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});