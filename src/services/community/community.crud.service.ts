import { Types } from "mongoose";

import ICommunity from "../../interfaces/community.interface.js";
import Community from "../../models/community.model.js";
import Post from "../../models/post.model.js";
import AppError from "../../utils/appError.class.js";
import { assertRole, createSlug, findCommunityOrFail } from "./community.helpers.js";

export const createCommunity = async (
  name: string,
  description: string | undefined,
  ownerId: Types.ObjectId
): Promise<ICommunity> => {
  const slug = createSlug(name);

  const existing = await Community.findOne({ slug, isDeleted: false });
  if (existing) {
    throw new AppError("A community with this name already exists", 409);
  }

  const community = await Community.create({
    name,
    slug,
    description: description || null,
    owner: ownerId,
    members: [{ user: ownerId, role: "owner" as const, joinedAt: new Date() }],
    memberCount: 1,
  });

  return community;
};

export const getCommunityBySlug = async (slug: string): Promise<ICommunity> => {
  const community = await Community.findOne({ slug: slug.toLowerCase(), isDeleted: false })
    .populate("owner", "username displayName avatarUrl")
    .populate("members.user", "username displayName avatarUrl");

  if (!community) {
    throw new AppError("Community not found", 404);
  }

  return community;
};

export const getCommunityById = async (id: string): Promise<ICommunity> => {
  const community = await Community.findOne({ _id: id, isDeleted: false })
    .populate("owner", "username displayName avatarUrl")
    .populate("members.user", "username displayName avatarUrl");

  if (!community) {
    throw new AppError("Community not found", 404);
  }

  return community;
};

export const updateCommunity = async (
  communityId: string,
  userId: Types.ObjectId,
  updates: { name?: string; description?: string }
): Promise<ICommunity> => {
  const community = await findCommunityOrFail(communityId);
  assertRole(community, userId, ["owner", "admin"]);

  if (updates.name !== undefined) {
    const newSlug = createSlug(updates.name);
    const existing = await Community.findOne({
      slug: newSlug,
      isDeleted: false,
      _id: { $ne: community._id },
    });

    if (existing) {
      throw new AppError("A community with this name already exists", 409);
    }
    community.name = updates.name;
    community.slug = newSlug;
  }

  if (updates.description !== undefined) {
    community.description = updates.description;
  }

  await community.save();

  return Community.findById(community._id)
    .populate("owner", "username displayName avatarUrl")
    .populate("members.user", "username displayName avatarUrl") as Promise<ICommunity>;
};

/**
 * Owner-only soft delete.
 */
export const deleteCommunity = async (
  communityId: string,
  userId: Types.ObjectId
): Promise<void> => {
  const community = await findCommunityOrFail(communityId);

  if (!community.owner.equals(userId)) {
    throw new AppError("Only the community owner can delete the community", 403);
  }

  const currentTimestamp = new Date();

  community.isDeleted = true;
  community.deletedAt = currentTimestamp;
  await community.save();

  await Post.updateMany(
    {
      community: community._id,
      isDeleted: false,
    },
    {
      $set: {
        isDeleted: true,
        deletedAt: currentTimestamp,
      },
    }
  );
};
