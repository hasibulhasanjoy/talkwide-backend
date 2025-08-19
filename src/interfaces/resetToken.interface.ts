import { Document, Types } from "mongoose";

interface IResetToken extends Document {
  userId: Types.ObjectId;
  tokenHashed: string;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export default IResetToken;
