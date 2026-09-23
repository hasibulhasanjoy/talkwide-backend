import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";

import IPost from "../interfaces/post.interface.js";
import IUser from "../interfaces/user.interface.js";
import Community from "../models/community.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import { CreatePostData, PostQueryData, UpdatePostData, VoteData } from "../schemas/post.schema.js";
import {
  deleteImageFromCloudinary,
  uploadImageToCloudinary,
} from "../services/cloudinary.service.js";
import { getFeedPosts, getUserVoteStatus, handleVote } from "../services/post.service.js";
import AppError from "../utils/appError.class.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.utils.js";

export const createPost = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const { title, type, content, linkUrl, community } = req.body as CreatePostData;
    const author = req.user!._id;

    const postData: Partial<IPost> = {
      title,
      type,
      author,
      content: content || null,
      linkUrl: linkUrl || null,
      community: community ? new Types.ObjectId(community) : null,
    };

    // Validate community membership when posting to a community.
    if (community) {
      const communityDoc = await Community.findOne({
        _id: community,
        isDeleted: false,
      });

      if (!communityDoc) {
        throw new AppError("Community not found", 404);
      }

      if (communityDoc.bannedUsers.some((id) => id.equals(author))) {
        throw new AppError("You are banned from this community", 403);
      }

      const isMember = communityDoc.members.some((m) => m.user.equals(author));
      if (!isMember) {
        throw new AppError("You must be a member of this community to post", 403);
      }
    }

    if (type === "image") {
      if (!req.file) {
        throw new AppError("Image file is required for image posts", 400);
      }

      const uploadResult = await uploadImageToCloudinary(req.file.buffer);
      postData.image = {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
      };
    }

    const post = await Post.create(postData);

    await User.findByIdAndUpdate(author, { $push: { posts: post._id } });

    if (community) {
      await Community.findByIdAndUpdate(community, { $inc: { postCount: 1 } });
    }

    const populatedPost = await Post.findById(post._id).populate(
      "author",
      "username displayName avatarUrl"
    );

    res.status(201).json({
      status: "success",
      data: {
        post: populatedPost,
      },
    });
  }
);

export const getAllPosts = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const queryData = req.query as unknown as PostQueryData;
    const userId = req.user?._id;

    const result = await getFeedPosts(queryData, userId);

    res.status(200).json({
      status: "success",
      data: result,
    });
  }
);

export const getPostById = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const id = req.params.id as string;

    const post = await Post.findOne({ _id: id, isDeleted: false }).populate(
      "author",
      "username displayName avatarUrl"
    );

    if (!post) {
      throw new AppError("Post not found", 404);
    }

    const responsePost = post.toObject() as IPost & {
      userVote?: "upvote" | "downvote" | null;
      isSaved?: boolean;
    };

    if (req.user) {
      responsePost.userVote = getUserVoteStatus(post, req.user);
      responsePost.isSaved = req.user.savedPosts.some((savedId) => savedId.equals(post._id));
    }

    res.status(200).json({
      status: "success",
      data: {
        post: responsePost,
      },
    });
  }
);

export const updatePost = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const id = req.params.id as string;
    const { title, content } = req.body as UpdatePostData;
    const userId = req.user!._id;

    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      throw new AppError("Post not found", 404);
    }

    if (!post.author.equals(userId)) {
      throw new AppError("You are not authorized to update this post", 403);
    }

    if (title !== undefined) {
      post.title = title;
    }
    if (content !== undefined) {
      post.content = content;
    }

    await post.save();

    const populatedPost = await Post.findById(post._id).populate(
      "author",
      "username displayName avatarUrl"
    );

    res.status(200).json({
      status: "success",
      data: {
        post: populatedPost,
      },
    });
  }
);

export const deletePost = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const id = req.params.id as string;
    const user = req.user as IUser;

    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      throw new AppError("Post not found", 404);
    }

    const isAuthor = post.author.equals(user._id);
    const isSiteRole = ["admin", "moderator"].includes(user.role);

    // Community posts can also be deleted by community admins/moderators.
    let isCommunityMod = false;
    if (post.community) {
      const communityDoc = await Community.findOne({
        _id: post.community,
        isDeleted: false,
      });
      if (communityDoc) {
        const member = communityDoc.members.find((m) => m.user.equals(user._id));
        if (member && ["owner", "admin", "moderator"].includes(member.role)) {
          isCommunityMod = true;
        }
      }
    }

    if (!isAuthor && !isSiteRole && !isCommunityMod) {
      throw new AppError("You are not authorized to delete this post", 403);
    }

    post.isDeleted = true;
    post.deletedAt = new Date();
    await post.save();

    await User.findByIdAndUpdate(post.author, { $pull: { posts: post._id } });
    if (post.community) {
      await Community.findByIdAndUpdate(post.community, { $inc: { postCount: -1 } });
    }

    if (post.image?.publicId) {
      await deleteImageFromCloudinary(post.image.publicId);
    }

    res.status(200).json({
      status: "success",
      message: "Post deleted successfully",
    });
  }
);

export const votePost = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const id = req.params.id as string;
    const { voteType } = req.body as VoteData;
    const userId = req.user!._id;

    if (!Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid post ID", 400);
    }

    const postId = new Types.ObjectId(id);
    const updatedPost = await handleVote(postId, userId, voteType);

    let userVote: "upvote" | "downvote" | null = null;
    if (voteType === "upvote") {
      userVote = "upvote";
    } else if (voteType === "downvote") {
      userVote = "downvote";
    }

    res.status(200).json({
      status: "success",
      data: {
        score: updatedPost.score,
        upvotes: updatedPost.upvotes,
        downvotes: updatedPost.downvotes,
        userVote,
      },
    });
  }
);

export const savePost = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const id = req.params.id as string;
    const userId = req.user!._id;

    if (!Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid post ID", 400);
    }

    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      throw new AppError("Post not found", 404);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const isSaved = user.savedPosts.some((savedId) => savedId.equals(post._id));

    if (isSaved) {
      await User.findByIdAndUpdate(userId, { $pull: { savedPosts: post._id } });
    } else {
      await User.findByIdAndUpdate(userId, { $addToSet: { savedPosts: post._id } });
    }

    res.status(200).json({
      status: "success",
      data: {
        isSaved: !isSaved,
      },
    });
  }
);

export const getUserPosts = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const username = req.params.username as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const user = await User.findOne({ username });
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const filter = { author: user._id, isDeleted: false };
    const total = await Post.countDocuments(filter);

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "username displayName avatarUrl")
      .lean();

    res.status(200).json({
      status: "success",
      data: {
        posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  }
);

export const getSavedPosts = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const userId = req.user!._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).select("savedPosts");
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const totalSaved = user.savedPosts.length;
    const savedPostIds = user.savedPosts.slice(skip, skip + limit);

    const posts = await Post.find({ _id: { $in: savedPostIds }, isDeleted: false })
      .populate("author", "username displayName avatarUrl")
      .lean();

    res.status(200).json({
      status: "success",
      data: {
        posts,
        pagination: {
          page,
          limit,
          total: totalSaved,
          totalPages: Math.ceil(totalSaved / limit),
        },
      },
    });
  }
);

export const getUpvotedPosts = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const userId = req.user!._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).select("upvotedPosts");
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const totalUpvoted = user.upvotedPosts.length;
    const upvotedPostIds = user.upvotedPosts.slice(skip, skip + limit);

    const posts = await Post.find({ _id: { $in: upvotedPostIds }, isDeleted: false })
      .populate("author", "username displayName avatarUrl")
      .lean();

    res.status(200).json({
      status: "success",
      data: {
        posts,
        pagination: {
          page,
          limit,
          total: totalUpvoted,
          totalPages: Math.ceil(totalUpvoted / limit),
        },
      },
    });
  }
);

export const getDownvotedPosts = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const userId = req.user!._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).select("downVotedPosts");
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const totalDownvoted = user.downVotedPosts.length;
    const downvotedPostIds = user.downVotedPosts.slice(skip, skip + limit);

    const posts = await Post.find({ _id: { $in: downvotedPostIds }, isDeleted: false })
      .populate("author", "username displayName avatarUrl")
      .lean();

    res.status(200).json({
      status: "success",
      data: {
        posts,
        pagination: {
          page,
          limit,
          total: totalDownvoted,
          totalPages: Math.ceil(totalDownvoted / limit),
        },
      },
    });
  }
);

// Toggle whether comments are turned off for a post. Only the post author may do
// this; while locked, creating comments or replies is rejected with a 403.
export const lockPostComments = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const id = req.params.id as string;
    const userId = req.user!._id;

    if (!Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid post ID", 400);
    }

    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      throw new AppError("Post not found", 404);
    }

    if (!post.author.equals(userId)) {
      throw new AppError("You are not authorized to change comment settings for this post", 403);
    }

    post.isLocked = !post.isLocked;
    await post.save();

    res.status(200).json({
      status: "success",
      data: {
        isLocked: post.isLocked,
      },
    });
  }
);
