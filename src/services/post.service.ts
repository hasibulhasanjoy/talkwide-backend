import { Types } from "mongoose";

import IPost from "../interfaces/post.interface.js";
import IUser from "../interfaces/user.interface.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import { PostQueryData } from "../schemas/post.schema.js";
import AppError from "../utils/appError.class.js";

interface PaginationResult {
  posts: IPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const calculateHotScore = (post: IPost): number => {
  const ageInSeconds = (Date.now() - post.createdAt.getTime()) / 1000;
  return post.score + ageInSeconds / 45000;
};

export const getFeedPosts = async (
  query: PostQueryData,
  userId?: Types.ObjectId
): Promise<PaginationResult> => {
  const { sort, time, community, page, limit } = query;

  const filter: Record<string, unknown> = { isDeleted: false };

  if (community) {
    filter.community = new Types.ObjectId(community);
  }

  if (sort === "top" && time !== "all") {
    const timeMap: Record<string, number> = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000,
    };
    const timeRange = timeMap[time];
    if (timeRange) {
      filter.createdAt = { $gte: new Date(Date.now() - timeRange) };
    }
  }

  const skip = (page - 1) * limit;

  let posts: IPost[];
  const total = await Post.countDocuments(filter);

  if (sort === "new") {
    posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "username displayName avatarUrl")
      .lean();
  } else if (sort === "top") {
    posts = await Post.find(filter)
      .sort({ score: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "username displayName avatarUrl")
      .lean();
  } else {
    const allPosts = await Post.find(filter)
      .populate("author", "username displayName avatarUrl")
      .lean();

    const postsWithHotScore = allPosts
      .map((post) => ({
        ...post,
        hotScore: calculateHotScore(post as unknown as IPost),
      }))
      .sort((a, b) => b.hotScore - a.hotScore)
      .slice(skip, skip + limit);

    posts = postsWithHotScore.map(({ hotScore: _hotScore, ...post }) => post) as unknown as IPost[];
  }

  if (userId) {
    const user = await User.findById(userId).select("upvotedPosts downVotedPosts savedPosts");
    if (user) {
      posts = posts.map((post) => {
        const postObj = post as IPost & {
          userVote?: "upvote" | "downvote" | null;
          isSaved?: boolean;
        };

        if (user.upvotedPosts.some((id) => id.equals(post._id))) {
          postObj.userVote = "upvote";
        } else if (user.downVotedPosts.some((id) => id.equals(post._id))) {
          postObj.userVote = "downvote";
        } else {
          postObj.userVote = null;
        }

        postObj.isSaved = user.savedPosts.some((id) => id.equals(post._id));

        return postObj;
      });
    }
  }

  return {
    posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const handleVote = async (
  postId: Types.ObjectId,
  userId: Types.ObjectId,
  voteType: "upvote" | "downvote" | "remove"
): Promise<IPost> => {
  const post = await Post.findOne({ _id: postId, isDeleted: false });

  if (!post) {
    throw new AppError("Post not found", 404);
  }

  if (post.author.equals(userId)) {
    throw new AppError("You cannot vote on your own post", 403);
  }

  const hasUpvoted = post.upvotedBy.some((id) => id.equals(userId));
  const hasDownvoted = post.downvotedBy.some((id) => id.equals(userId));

  let upvoteDelta = 0;
  let downvoteDelta = 0;
  let karmaDelta: number;

  let userUpvoteUpdate: Record<string, unknown> = {};
  let userDownvoteUpdate: Record<string, unknown> = {};

  if (voteType === "upvote") {
    if (hasUpvoted) {
      return post;
    }

    if (hasDownvoted) {
      downvoteDelta = -1;
      upvoteDelta = 1;
      karmaDelta = 2;
      post.downvotedBy = post.downvotedBy.filter((id) => !id.equals(userId));
      post.upvotedBy.push(userId);
      userDownvoteUpdate = { $pull: { downVotedPosts: postId } };
      userUpvoteUpdate = { $addToSet: { upvotedPosts: postId } };
    } else {
      upvoteDelta = 1;
      karmaDelta = 1;
      post.upvotedBy.push(userId);
      userUpvoteUpdate = { $addToSet: { upvotedPosts: postId } };
    }
  } else if (voteType === "downvote") {
    if (hasDownvoted) {
      return post;
    }

    if (hasUpvoted) {
      upvoteDelta = -1;
      downvoteDelta = 1;
      karmaDelta = -2;
      post.upvotedBy = post.upvotedBy.filter((id) => !id.equals(userId));
      post.downvotedBy.push(userId);
      userUpvoteUpdate = { $pull: { upvotedPosts: postId } };
      userDownvoteUpdate = { $addToSet: { downVotedPosts: postId } };
    } else {
      downvoteDelta = 1;
      karmaDelta = -1;
      post.downvotedBy.push(userId);
      userDownvoteUpdate = { $addToSet: { downVotedPosts: postId } };
    }
  } else {
    if (hasUpvoted) {
      upvoteDelta = -1;
      karmaDelta = -1;
      post.upvotedBy = post.upvotedBy.filter((id) => !id.equals(userId));
      userUpvoteUpdate = { $pull: { upvotedPosts: postId } };
    } else if (hasDownvoted) {
      downvoteDelta = -1;
      karmaDelta = 1;
      post.downvotedBy = post.downvotedBy.filter((id) => !id.equals(userId));
      userDownvoteUpdate = { $pull: { downVotedPosts: postId } };
    } else {
      return post;
    }
  }

  post.upvotes += upvoteDelta;
  post.downvotes += downvoteDelta;
  post.score = post.upvotes - post.downvotes;

  await post.save();

  if (Object.keys(userUpvoteUpdate).length > 0) {
    await User.findByIdAndUpdate(userId, userUpvoteUpdate);
  }
  if (Object.keys(userDownvoteUpdate).length > 0) {
    await User.findByIdAndUpdate(userId, userDownvoteUpdate);
  }

  if (karmaDelta !== 0) {
    await User.findByIdAndUpdate(post.author, { $inc: { karma: karmaDelta } });
  }

  return post;
};

export const updateAuthorKarma = async (
  authorId: Types.ObjectId,
  change: number
): Promise<void> => {
  await User.findByIdAndUpdate(authorId, { $inc: { karma: change } });
};

export const getUserVoteStatus = (post: IPost, user: IUser): "upvote" | "downvote" | null => {
  if (user.upvotedPosts.some((id) => id.equals(post._id))) {
    return "upvote";
  }
  if (user.downVotedPosts.some((id) => id.equals(post._id))) {
    return "downvote";
  }
  return null;
};
