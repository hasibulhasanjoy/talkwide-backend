import { Types } from "mongoose";

import ICommunity from "../../interfaces/community.interface.js";
import Post from "../../models/post.model.js";
import User from "../../models/user.model.js";
import AppError from "../../utils/appError.class.js";
import { assertRole, findCommunityOrFail, getMemberRole } from "./community.helpers.js";

export const banUser = async (
  communityId: string,
  actorId: Types.ObjectId,
  targetUserId: string
): Promise<ICommunity> => {
  const community = await findCommunityOrFail(communityId);
  assertRole(community, actorId, ["owner", "admin", "moderator"]);

  const targetObjId = new Types.ObjectId(targetUserId);

  if (community.owner.equals(targetObjId)) {
    throw new AppError("Cannot ban the community owner", 400);
  }

  // Admins/mods cannot ban each other — only the owner can ban admins, and
  // admins+ can ban mods.
  const targetRole = getMemberRole(community, targetObjId);
  const actorRole = getMemberRole(community, actorId)!;

  if (targetRole === "admin" && actorRole !== "owner") {
    throw new AppError("Only the owner can ban an admin", 403);
  }
  if (targetRole === "moderator" && !["owner", "admin"].includes(actorRole)) {
    throw new AppError("Only admins and the owner can ban a moderator", 403);
  }

  if (community.bannedUsers.some((id) => id.equals(targetObjId))) {
    throw new AppError("User is already banned", 400);
  }

  // Remove from members if they're a member.
  const memberIndex = community.members.findIndex((m) => m.user.equals(targetObjId));
  if (memberIndex !== -1) {
    community.members.splice(memberIndex, 1);
    community.memberCount -= 1;
  }

  community.bannedUsers.push(targetObjId);
  await community.save();

  return community;
};

export const unbanUser = async (
  communityId: string,
  actorId: Types.ObjectId,
  targetUserId: string
): Promise<ICommunity> => {
  const community = await findCommunityOrFail(communityId);
  assertRole(community, actorId, ["owner", "admin", "moderator"]);

  const targetObjId = new Types.ObjectId(targetUserId);

  const banIndex = community.bannedUsers.findIndex((id) => id.equals(targetObjId));
  if (banIndex === -1) {
    throw new AppError("User is not banned", 400);
  }

  community.bannedUsers.splice(banIndex, 1);
  await community.save();

  return community;
};

export const deletePostFromCommunity = async (
  communityId: string,
  postId: string,
  actorId: Types.ObjectId
): Promise<void> => {
  const community = await findCommunityOrFail(communityId);
  assertRole(community, actorId, ["owner", "admin", "moderator"]);

  const post = await Post.findOne({
    _id: postId,
    community: community._id,
    isDeleted: false,
  });

  if (!post) {
    throw new AppError("Post not found in this community", 404);
  }

  post.isDeleted = true;
  post.deletedAt = new Date();
  await post.save();

  await User.findByIdAndUpdate(post.author, { $pull: { posts: post._id } });

  community.postCount = Math.max(0, community.postCount - 1);
  await community.save();
};
