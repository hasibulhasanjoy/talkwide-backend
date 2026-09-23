import { Types } from "mongoose";

import ICommunity from "../../interfaces/community.interface.js";
import Community from "../../models/community.model.js";
import AppError from "../../utils/appError.class.js";
import { assertRole, findCommunityOrFail } from "./community.helpers.js";

/**
 * Appoint or update a member's role.
 *
 * - Only the **owner** can appoint or remove **admins**.
 * - Only an **admin** (or the owner) can appoint or remove **moderators**.
 * - You cannot change the owner's role via this function.
 */
export const updateMemberRole = async (
  communityId: string,
  actorId: Types.ObjectId,
  targetUserId: string,
  newRole: "moderator" | "admin"
): Promise<ICommunity> => {
  const community = await findCommunityOrFail(communityId);
  const actorRole = assertRole(community, actorId, ["owner", "admin"]);

  const targetObjId = new Types.ObjectId(targetUserId);

  if (community.owner.equals(targetObjId)) {
    throw new AppError("Cannot change the owner's role", 400);
  }

  // Only the owner can appoint/remove admins.
  if (newRole === "admin" && actorRole !== "owner") {
    throw new AppError("Only the community owner can appoint admins", 403);
  }

  const member = community.members.find((m) => m.user.equals(targetObjId));
  if (!member) {
    throw new AppError("User is not a member of this community", 400);
  }

  member.role = newRole;
  await community.save();

  return Community.findById(community._id)
    .populate("owner", "username displayName avatarUrl")
    .populate("members.user", "username displayName avatarUrl") as Promise<ICommunity>;
};

/**
 * Demote a moderator or admin back to a regular member.
 *
 * - Only the **owner** can demote **admins**.
 * - Admins and the owner can demote **moderators**.
 */
export const removeMemberRole = async (
  communityId: string,
  actorId: Types.ObjectId,
  targetUserId: string
): Promise<ICommunity> => {
  const community = await findCommunityOrFail(communityId);
  const actorRole = assertRole(community, actorId, ["owner", "admin"]);

  const targetObjId = new Types.ObjectId(targetUserId);

  if (community.owner.equals(targetObjId)) {
    throw new AppError("Cannot demote the owner", 400);
  }

  const member = community.members.find((m) => m.user.equals(targetObjId));
  if (!member) {
    throw new AppError("User is not a member of this community", 400);
  }

  if (member.role === "admin" && actorRole !== "owner") {
    throw new AppError("Only the community owner can demote admins", 403);
  }

  if (member.role === "member") {
    throw new AppError("User is already a regular member", 400);
  }

  member.role = "member";
  await community.save();

  return Community.findById(community._id)
    .populate("owner", "username displayName avatarUrl")
    .populate("members.user", "username displayName avatarUrl") as Promise<ICommunity>;
};
