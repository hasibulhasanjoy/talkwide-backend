import { Document, Types } from "mongoose";

export type CommunityMemberRole = "member" | "moderator" | "admin" | "owner";

export interface ICommunityMember {
  user: Types.ObjectId;
  role: CommunityMemberRole;
  joinedAt: Date;
}

interface ICommunity extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  owner: Types.ObjectId;
  members: ICommunityMember[];
  bannedUsers: Types.ObjectId[];
  memberCount: number;
  postCount: number;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export default ICommunity;
