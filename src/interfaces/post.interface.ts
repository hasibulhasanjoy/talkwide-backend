import { Document, Types } from "mongoose";

export type PostType = "text" | "link" | "image";

export interface IPostImage {
  url: string;
  publicId?: string;
}

interface IPost extends Document {
  _id: Types.ObjectId;
  author: Types.ObjectId;
  community?: Types.ObjectId | null;
  title: string;
  content?: string | null;
  type: PostType;
  linkUrl?: string | null;
  image?: IPostImage | null;
  upvotes: number;
  downvotes: number;
  score: number;
  commentCount: number;
  upvotedBy: Types.ObjectId[];
  downvotedBy: Types.ObjectId[];
  isDeleted: boolean;
  deletedAt?: Date | null;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default IPost;
