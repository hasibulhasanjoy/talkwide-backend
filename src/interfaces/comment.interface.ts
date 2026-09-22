import { Document, Types } from "mongoose";

interface IComment extends Document {
  _id: Types.ObjectId;
  post: Types.ObjectId;
  author: Types.ObjectId;
  // Direct parent comment. `null` for a top-level comment on the post.
  parent: Types.ObjectId | null;
  // Full root -> parent chain. Lets us load or cascade over an entire subtree
  // in a single query (`{ ancestors: <commentId> }`).
  ancestors: Types.ObjectId[];
  // Nesting level: 0 for top-level comments, parent.depth + 1 for replies.
  depth: number;
  content: string;
  upvotes: number;
  downvotes: number;
  score: number;
  upvotedBy: Types.ObjectId[];
  downvotedBy: Types.ObjectId[];
  // Number of direct replies (immediate children).
  replyCount: number;
  isPinned: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export default IComment;
