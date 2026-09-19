import { model, Schema } from "mongoose";

import IPost from "../interfaces/post.interface.js";

const { ObjectId } = Schema.Types;

const PostSchema = new Schema<IPost>(
  {
    author: { type: ObjectId, ref: "User", required: true, index: true },
    community: { type: ObjectId, ref: "Community", default: null, index: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 300 },
    content: { type: String, maxlength: 40000, default: null },
    type: { type: String, enum: ["text", "link", "image"], required: true },
    linkUrl: { type: String, default: null },
    image: {
      url: { type: String },
      publicId: { type: String },
    },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    score: { type: Number, default: 0, index: true },
    commentCount: { type: Number, default: 0 },
    upvotedBy: [{ type: ObjectId, ref: "User" }],
    downvotedBy: [{ type: ObjectId, ref: "User" }],
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    isPinned: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PostSchema.pre("save", function () {
  if (this.isModified("upvotes") || this.isModified("downvotes")) {
    this.score = this.upvotes - this.downvotes;
  }
});

PostSchema.index({ isDeleted: 1, createdAt: -1 });
PostSchema.index({ isDeleted: 1, score: -1, createdAt: -1 });

const Post = model<IPost>("Post", PostSchema);
export default Post;
