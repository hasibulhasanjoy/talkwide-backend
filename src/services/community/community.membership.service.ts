import { Types } from "mongoose";

import ICommunity, {
  CommunityMemberRole,
  ICommunityMember,
} from "../../interfaces/community.interface.js";
import Community from "../../models/community.model.js";
import AppError from "../../utils/appError.class.js";
import { findCommunityOrFail } from "./community.helpers.js";

export const joinCommunity = async (
  communityId: string,
  userId: Types.ObjectId
): Promise<ICommunity> => {
  const community = await findCommunityOrFail(communityId);

  if (community.bannedUsers.some((id) => id.equals(userId))) {
    throw new AppError("You are banned from this community", 403);
  }

  const existingMember = community.members.find((m) => m.user.equals(userId));
  if (existingMember) {
    throw new AppError("You are already a member of this community", 400);
  }

  community.members.push({ user: userId, role: "member", joinedAt: new Date() });
  community.memberCount += 1;
  await community.save();

  return community;
};

export const leaveCommunity = async (
  communityId: string,
  userId: Types.ObjectId
): Promise<void> => {
  const community = await findCommunityOrFail(communityId);

  if (community.owner.equals(userId)) {
    throw new AppError("The community owner cannot leave. Transfer ownership first", 400);
  }

  const memberIndex = community.members.findIndex((m) => m.user.equals(userId));
  if (memberIndex === -1) {
    throw new AppError("You are not a member of this community", 400);
  }

  community.members.splice(memberIndex, 1);
  community.memberCount -= 1;
  await community.save();
};

interface CommunityMembersQuery {
  page: number;
  limit: number;
  role?: CommunityMemberRole;
}

export const getCommunityMembers = async (
  communityId: string,
  query: CommunityMembersQuery
): Promise<{
  members: ICommunity["members"];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  const community = await findCommunityOrFail(communityId);

  let filtered = community.members;
  if (query.role) {
    filtered = filtered.filter((m) => m.role === query.role);
  }

  const total = filtered.length;
  const skip = (query.page - 1) * query.limit;
  const paginated = filtered.slice(skip, skip + query.limit);

  // Populate user references for the paginated slice.
  const populated = (await Community.populate(paginated, {
    path: "user",
    select: "username displayName avatarUrl",
  })) as unknown as ICommunityMember[];

  return {
    members: populated,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};
