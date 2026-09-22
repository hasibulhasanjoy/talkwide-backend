import { Document } from "mongoose";

interface IPendingUser extends Document {
  username: string;
  displayName: string;
  email: string;
  password: string; // already bcrypt-hashed before storage
  tokenHashed: string;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export default IPendingUser;
