import { Document, Types } from "mongoose";

interface IUser extends Document {
  _id: Types.ObjectId;
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

  createdAt?: Date;
  updatedAt?: Date;
}

export default IUser;
