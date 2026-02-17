import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { clerkMiddleware } from '@clerk/express'
import { connect } from 'mongoose';
import { connectDB } from './config/db.js';

const app = express();
const port = 4000;



// Middlewwares
app.use(cors());
app.use(clerkMiddleware());
app.use(express.json({limit: "20mb"}));
app.use(express.urlencoded({limit: "20mb", extended: true}))


// DB
connectDB();



// Routes
app.get('/', (req, res) => {
    res.send('api working!');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});