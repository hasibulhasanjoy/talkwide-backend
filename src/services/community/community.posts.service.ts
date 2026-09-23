import { Types } from "mongoose";

import IPost from "../../interfaces/post.interface.js";
import Post from "../../models/post.model.js";
import User from "../../models/user.model.js";
import { findCommunityOrFail } from "./community.helpers.js";

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
