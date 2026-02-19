import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js"
import dotenv from 'dotenv';
import Stripe from "stripe";
import {getAuth} from "@clerk/express"
import { clerkClient } from "@clerk/express";
dotenv.config();