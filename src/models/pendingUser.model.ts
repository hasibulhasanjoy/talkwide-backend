import { model, Schema } from "mongoose";

import IPendingUser from "../interfaces/pendingUser.interface.js";

const PendingUserSchema = new Schema<IPendingUser>(
  {
    username: { type: String, required: true },
    displayName: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true, select: false },
    tokenHashed: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Auto-expire unverified signups so their username/email frees up
PendingUserSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// One pending signup per email at a time — a fresh signup attempt replaces the old one
PendingUserSchema.index({ email: 1 }, { unique: true });

const PendingUser = model<IPendingUser>("PendingUser", PendingUserSchema);
export default PendingUser;
