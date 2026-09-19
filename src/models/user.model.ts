import bcrypt from "bcrypt";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { model, Schema } from "mongoose";

import IUser from "../interfaces/user.interface.js";

const { ObjectId } = Schema.Types;

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    emailVerifiedAt: { type: Date },
    password: {
      type: String,
      required: function (this: IUser) {
        return this.authProvider === "local" || !this.authProvider;
      },
      select: false,
    },
    avatarUrl: { type: String },
    bio: { type: String },
    role: { type: String, enum: ["user", "admin", "moderator"], default: "user" },
    isBanned: { type: Boolean, default: false },
    lastLogin: { type: Date },
    karma: { type: Number, default: 0 },
    authProvider: { type: String, enum: ["local", "google"], default: "local" },
    googleId: { type: String, unique: true, sparse: true },

    posts: [{ type: ObjectId, ref: "Post" }],
    comments: [{ type: ObjectId, ref: "Comment" }],
    savedPosts: [{ type: ObjectId, ref: "Post" }],
    upvotedPosts: [{ type: ObjectId, ref: "Post" }],
    downVotedPosts: [{ type: ObjectId, ref: "Post" }],
    upvotedComments: [{ type: ObjectId, ref: "Comment" }],
    downVotedComments: [{ type: ObjectId, ref: "Comment" }],
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (this: IUser) {
  if (!this.isModified("password") || !this.password) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

UserSchema.methods.comparePassword = async function (
  this: IUser,
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.generateAuthToken = function (this: IUser): string {
  const secret = process.env.JWT_SECRET_KEY as string;
  const expiresIn = process.env.JWT_EXPIRES_IN as `${number}${"d" | "h" | "m"}`;
  const payload: JwtPayload = { id: this._id.toString() };
  const option: SignOptions = {
    expiresIn,
  };

  const token = jwt.sign(payload, secret, option);

  return token;
};

const User = model<IUser>("User", UserSchema);
export default User;
