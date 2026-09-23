import { Types } from "mongoose";

import ICommunity, {
  CommunityMemberRole,
  ICommunityMember,
} from "../interfaces/community.interface.js";
import IPost from "../interfaces/post.interface.js";
import Community from "../models/community.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import AppError from "../utils/appError.class.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const findCommunityOrFail = async (
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

const getMemberRole = (
  community: ICommunity,
  userId: Types.ObjectId
): CommunityMemberRole | null => {
  const member = community.members.find((m) => m.user.equals(userId));
  return member ? member.role : null;
};

const assertRole = (
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

// ---------------------------------------------------------------------------
// Create community
// ---------------------------------------------------------------------------

export const createCommunity = async (
  name: string,
  description: string | undefined,
  ownerId: Types.ObjectId
): Promise<ICommunity> => {
  const slug = name.toLowerCase();

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

// ---------------------------------------------------------------------------
// Get community
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Update community
// ---------------------------------------------------------------------------

export const updateCommunity = async (
  communityId: string,
  userId: Types.ObjectId,
  updates: { name?: string; description?: string }
): Promise<ICommunity> => {
  const community = await findCommunityOrFail(communityId);
  assertRole(community, userId, ["owner", "admin"]);

  if (updates.name !== undefined) {
    const newSlug = updates.name.toLowerCase();
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

// ---------------------------------------------------------------------------
// Delete community (owner only)
// ---------------------------------------------------------------------------

export const deleteCommunity = async (
  communityId: string,
  userId: Types.ObjectId
): Promise<void> => {
  const community = await findCommunityOrFail(communityId);

  if (!community.owner.equals(userId)) {
    throw new AppError("Only the community owner can delete the community", 403);
  }

  community.isDeleted = true;
  community.deletedAt = new Date();
  await community.save();
};

// ---------------------------------------------------------------------------
// Join / Leave
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Community posts
// ---------------------------------------------------------------------------

interface CommunityPostsQuery {
  page: number;
  limit: number;
  sort: "new" | "top" | "hot";
}

interface PaginatedPosts {
  posts: IPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getCommunityPosts = async (
  communityId: string,
  query: CommunityPostsQuery,
  userId?: Types.ObjectId
): Promise<PaginatedPosts> => {
  await findCommunityOrFail(communityId);

  const { page, limit, sort } = query;
  const skip = (page - 1) * limit;
  const filter = { community: new Types.ObjectId(communityId), isDeleted: false };

  const total = await Post.countDocuments(filter);

  const sortSpec: Record<string, 1 | -1> =
    sort === "new" ? { createdAt: -1 } : { score: -1, createdAt: -1 };

  const posts = await Post.find(filter)
    .sort(sortSpec)
    .skip(skip)
    .limit(limit)
    .populate("author", "username displayName avatarUrl")
    .lean();

  // Attach user vote status when authenticated.
  let enrichedPosts = posts as (IPost & { userVote?: string | null; isSaved?: boolean })[];
  if (userId) {
    const user = await User.findById(userId).select("upvotedPosts downVotedPosts savedPosts");
    if (user) {
      enrichedPosts = posts.map((post) => {
        const p = post as IPost & { userVote?: string | null; isSaved?: boolean };
        if (user.upvotedPosts.some((id) => id.equals(post._id))) {
          p.userVote = "upvote";
        } else if (user.downVotedPosts.some((id) => id.equals(post._id))) {
          p.userVote = "downvote";
        } else {
          p.userVote = null;
        }
        p.isSaved = user.savedPosts.some((id) => id.equals(post._id));
        return p;
      });
    }
  }

  return {
    posts: enrichedPosts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// ---------------------------------------------------------------------------
// Role management
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Moderation: ban / unban users, delete posts
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Members listing
// ---------------------------------------------------------------------------

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
