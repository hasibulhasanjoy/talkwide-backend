import { Document, Types, Schema, model } from "mongoose";

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
    emailVerifiedAt: { type: Date, default: null },
    password: { type: String, required: true },
    avatarUrl: { type: String, default: null },
    bio: { type: String, default: null },
    role: { type: String, enum: ["user", "admin", "moderator"], default: "user" },
    isBanned: { type: Boolean, default: false },
    lastLogin: { type: Date, default: null },
    karma: { type: Number, default: 0 },

    posts: [{ type: Types.ObjectId, ref: "Post" }],
    comments: [{ type: Types.ObjectId, ref: "Comment" }],
    savedPosts: [{ type: Types.ObjectId, ref: "Post" }],
    upvotedPosts: [{ type: Types.ObjectId, ref: "Post" }],
    downVotedPosts: [{ type: Types.ObjectId, ref: "Post" }],
    upvotedComments: [{ type: Types.ObjectId, ref: "Comment" }],
    downVotedComments: [{ type: Types.ObjectId, ref: "Comment" }],
  },
  { timestamps: true }
);

const User = model<IUser>("User", UserSchema);
export default User;
