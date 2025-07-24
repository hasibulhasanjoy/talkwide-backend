import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { Document, model, Schema, Types } from "mongoose";

export interface IUser extends Document {
  username: string;
  displayName: string;
  email: string;
  emailVerifiedAt?: Date | null;
  password: string;
  avatarUrl?: string | null;
  bio?: string | null;
  role: "user" | "admin" | "moderator";
  isBanned: boolean;
  lastLogin?: Date | null;
  karma: number;
  generateAuthToken: () => string;

  posts: Types.ObjectId[];
  comments: Types.ObjectId[];
  savedPosts: Types.ObjectId[];
  upvotedPosts: Types.ObjectId[];
  downVotedPosts: Types.ObjectId[];
  upvotedComments: Types.ObjectId[];
  downVotedComments: Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    emailVerifiedAt: { type: Date },
    password: { type: String, required: true, select: false },
    avatarUrl: { type: String },
    bio: { type: String },
    role: { type: String, enum: ["user", "admin", "moderator"], default: "user" },
    isBanned: { type: Boolean, default: false },
    lastLogin: { type: Date },
    karma: { type: Number, default: 0 },

    posts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    savedPosts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    upvotedPosts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    downVotedPosts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    upvotedComments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    downVotedComments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
  },
  { timestamps: true }
);

UserSchema.methods.generateAuthToken = function (this: IUser): string {
  const secret = process.env.JWT_SECRET_KEY as string;
  const expiresIn = process.env.JWT_EXPIRES_IN as `${number}${"d" | "h" | "m"}`;
  const payload: JwtPayload = { id: (this._id as Types.ObjectId).toString() };
  const option: SignOptions = {
    expiresIn,
  };

  const token = jwt.sign(payload, secret, option);

  return token;
};

const User = model<IUser>("User", UserSchema);
export default User;
