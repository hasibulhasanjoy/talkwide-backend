import { model, Schema } from "mongoose";

import IComment from "../interfaces/comment.interface.js";

const { ObjectId } = Schema.Types;

const CommentSchema = new Schema<IComment>(
  {
    post: { type: ObjectId, ref: "Post", required: true, index: true },
    author: { type: ObjectId, ref: "User", required: true, index: true },
    parent: { type: ObjectId, ref: "Comment", default: null, index: true },
    ancestors: [{ type: ObjectId, ref: "Comment" }],
    depth: { type: Number, default: 0 },
    content: { type: String, required: true, trim: true, minlength: 1, maxlength: 10000 },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    score: { type: Number, default: 0, index: true },
    upvotedBy: [{ type: ObjectId, ref: "User" }],
    downvotedBy: [{ type: ObjectId, ref: "User" }],
    replyCount: { type: Number, default: 0 },
    isPinned: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Keep the denormalized score in sync whenever vote counts change.
CommentSchema.pre("save", function () {
  if (this.isModified("upvotes") || this.isModified("downvotes")) {
    this.score = this.upvotes - this.downvotes;
  }
});

// Supports the two listing orders (popularity / newest) scoped to a single post.
CommentSchema.index({ post: 1, isDeleted: 1, score: -1, createdAt: -1 });
CommentSchema.index({ post: 1, isDeleted: 1, createdAt: -1 });
// Fetch or cascade-delete an entire reply subtree in one query.
CommentSchema.index({ ancestors: 1 });
// Fast lookup of a comment's direct children.
CommentSchema.index({ post: 1, parent: 1 });

const Comment = model<IComment>("Comment", CommentSchema);
export default Comment;
