import express from "express";
import Notification from "../models/Notification.js";
import { resolveClerkUserId } from "../utils/authHelper.js";

const notificationRouter = express.Router();

// Get patient notifications
notificationRouter.get("/", async (req, res) => {
  try {
    const userId = resolveClerkUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication is required." });
    }

    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    return res.json({ success: true, notifications });
  } catch (err) {
    console.error("Fetch notifications error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Mark notification as read
notificationRouter.put("/:id/read", async (req, res) => {
  try {
    const userId = resolveClerkUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication is required." });
    }

    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    return res.json({ success: true, notification });
  } catch (err) {
    console.error("Mark read notification error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default notificationRouter;
