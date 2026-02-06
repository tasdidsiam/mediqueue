import express from "express";
import User from "../Model/User.js";
import Doctor from "../Model/Doctor.js";
import adminAuth from "../Middleware/jwtauthenticationfilter.js";
import TokenRule from "../Model/TokenRule.js";

const router = express.Router();

/* =========================
   GET ALL DOCTORS
========================= */
router.get("/doctors", adminAuth, async (req, res) => {
  try {
    const users = await User.find({
      role: { $regex: /^doctor$/i }
    }).sort({ createdAt: -1 });

    const doctors = await Promise.all(
      users.map(async (user) => {
        const profile = await Doctor.findOne({ userId: user._id });

        return {
          ...user.toObject(),
          specialization: profile?.specialization || "N/A",
          licenseNumber: profile?.licenseNumber || "N/A"
        };
      })
    );

    res.json({ data: doctors });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   APPROVE DOCTOR
========================= */
router.patch("/doctors/:id/approve", adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { approved: true, isActive: true },
      { new: true }
    );

    if (user) {
      await Doctor.findOneAndUpdate(
        { userId: user._id },
        { isActive: true }
      );
    }

    res.json({ message: "Doctor approved" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   TOKEN RULES
========================= */

// get rules
router.get("/token-rules", adminAuth, async (req, res) => {
  try {
    const rules = await TokenRule.find();
    res.json({ data: rules });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// create rule
router.post("/token-rules", adminAuth, async (req, res) => {
  try {
    const rule = await TokenRule.create(req.body);
    res.json({ data: rule });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// delete rule
router.delete("/token-rules/:id", adminAuth, async (req, res) => {
  try {
    await TokenRule.findByIdAndDelete(req.params.id);
    res.json({ message: "Rule deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// update rule
router.patch("/token-rules/:id", adminAuth, async (req, res) => {
  try {
    const updated = await TokenRule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
