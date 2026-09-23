import { model, Schema } from "mongoose";

import ICommunity from "../interfaces/community.interface.js";

const { ObjectId } = Schema.Types;

const CommunityMemberSchema = new Schema(
  {
    user: { type: ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["member", "moderator", "admin", "owner"],
      default: "member",
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CommunitySchema = new Schema<ICommunity>(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 50 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, maxlength: 500, default: null },
    avatarUrl: { type: String, default: null },
    bannerUrl: { type: String, default: null },
    owner: { type: ObjectId, ref: "User", required: true, index: true },
    members: [CommunityMemberSchema],
    bannedUsers: [{ type: ObjectId, ref: "User" }],
    memberCount: { type: Number, default: 1 },
    postCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

CommunitySchema.index({ slug: 1, isDeleted: 1 });
CommunitySchema.index({ "members.user": 1 });

const Community = model<ICommunity>("Community", CommunitySchema);
export default Community;
