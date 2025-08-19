import { model, Schema } from "mongoose";

import IResetToken from "../interfaces/resetToken.interface.js";

const ResetTokenSchema = new Schema<IResetToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHashed: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

ResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

ResetTokenSchema.index({ userId: 1, tokenHashed: 1 }, { unique: true });

const ResetToken = model<IResetToken>("ResetToken", ResetTokenSchema);
export default ResetToken;
