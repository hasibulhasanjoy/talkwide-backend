import { Types } from "mongoose";

import ICommunity, { CommunityMemberRole } from "../../interfaces/community.interface.js";
import Community from "../../models/community.model.js";
import AppError from "../../utils/appError.class.js";

export const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove special characters
    .replace(/\s+/g, "-") // spaces → -
    .replace(/-+/g, "-"); // multiple - → single -
};

export const findCommunityOrFail = async (
  communityId: string,
  includeDeleted = false
): Promise<ICommunity> => {
  const filter: Record<string, unknown> = { _id: communityId };
  if (!includeDeleted) filter.isDeleted = false;

  const community = await Community.findOne(filter);
  if (!community) {
    throw new AppError("Community not found", 404);
  }
  return community;
};

export const getMemberRole = (
  community: ICommunity,
  userId: Types.ObjectId
): CommunityMemberRole | null => {
  const member = community.members.find((m) => m.user.equals(userId));
  return member ? member.role : null;
};

export const assertRole = (
  community: ICommunity,
  userId: Types.ObjectId,
  requiredRoles: CommunityMemberRole[]
): CommunityMemberRole => {
  const role = getMemberRole(community, userId);
  if (!role || !requiredRoles.includes(role)) {
    throw new AppError("You are not authorized to perform this action", 403);
  }
  return role;
};
