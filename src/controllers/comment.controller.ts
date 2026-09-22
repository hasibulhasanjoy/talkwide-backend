import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";

import IUser from "../interfaces/user.interface.js";
import Comment from "../models/comment.model.js";
import Post from "../models/post.model.js";
import { CreateCommentData, UpdateCommentData } from "../schemas/comment.schema.js";
import { VoteData } from "../schemas/post.schema.js";
import {
  CommentVoteType,
  createCommentDoc,
  deleteCommentCascade,
  getPostCommentTree,
  handleCommentVote,
} from "../services/comment.service.js";
import AppError from "../utils/appError.class.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.utils.js";

// Create a top-level comment on a post. POST /api/posts/:postId/comments
export const createComment = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const postId = req.params.postId as string;
    const { content } = req.body as CreateCommentData;
    const authorId = req.user!._id;

    if (!Types.ObjectId.isValid(postId)) {
      throw new AppError("Invalid post ID", 400);
    }

    const comment = await createCommentDoc({ authorId, content, postId });

    res.status(201).json({
      status: "success",
      data: { comment },
    });
  }
);

// Reply to an existing comment. POST /api/comments/:id/replies
export const replyToComment = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const parentId = req.params.id as string;
    const { content } = req.body as CreateCommentData;
    const authorId = req.user!._id;

    if (!Types.ObjectId.isValid(parentId)) {
      throw new AppError("Invalid comment ID", 400);
    }

    const comment = await createCommentDoc({ authorId, content, parentId });

    res.status(201).json({
      status: "success",
      data: { comment },
    });
  }
);

// List a post's comments as a sorted, nested tree. GET /api/posts/:postId/comments
export const getPostComments = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const postId = req.params.postId as string;

    if (!Types.ObjectId.isValid(postId)) {
      throw new AppError("Invalid post ID", 400);
    }

    const post = await Post.findOne({ _id: postId, isDeleted: false }).select("_id");
    if (!post) {
      throw new AppError("Post not found", 404);
    }

    const sort = req.query.sort === "new" ? "new" : "popular";
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const userId = req.user?._id;

    const result = await getPostCommentTree({ postId, sort, page, limit, userId });

    res.status(200).json({
      status: "success",
      data: result,
    });
  }
);

// Update the current user's own comment. PATCH /api/comments/:id
export const updateComment = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const id = req.params.id as string;
    const { content } = req.body as UpdateCommentData;
    const userId = req.user!._id;

    if (!Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid comment ID", 400);
    }

    const comment = await Comment.findOne({ _id: id, isDeleted: false });
    if (!comment) {
      throw new AppError("Comment not found", 404);
    }

    if (!comment.author.equals(userId)) {
      throw new AppError("You are not authorized to update this comment", 403);
    }

    comment.content = content;
    comment.isEdited = true;
    await comment.save();

    const populatedComment = await Comment.findById(comment._id).populate(
      "author",
      "username displayName avatarUrl"
    );

    res.status(200).json({
      status: "success",
      data: { comment: populatedComment },
    });
  }
);

// Delete a comment (and cascade to all replies). DELETE /api/comments/:id
export const deleteComment = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const id = req.params.id as string;
    const user = req.user as IUser;

    if (!Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid comment ID", 400);
    }

    const comment = await Comment.findOne({ _id: id, isDeleted: false });
    if (!comment) {
      throw new AppError("Comment not found", 404);
    }

    const isAuthor = comment.author.equals(user._id);
    const isModerator = ["admin", "moderator"].includes(user.role);

    if (!isAuthor && !isModerator) {
      throw new AppError("You are not authorized to delete this comment", 403);
    }

    const deletedCount = await deleteCommentCascade(comment);

    res.status(200).json({
      status: "success",
      message: "Comment deleted successfully",
      data: { deletedCount },
    });
  }
);

// Upvote / downvote / remove a vote on a comment. POST /api/comments/:id/vote
export const voteComment = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const id = req.params.id as string;
    const { voteType } = req.body as VoteData;
    const userId = req.user!._id;

    if (!Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid comment ID", 400);
    }

    const commentId = new Types.ObjectId(id);
    const updatedComment = await handleCommentVote(commentId, userId, voteType);

    let userVote: CommentVoteType | null = null;
    if (voteType === "upvote") {
      userVote = "upvote";
    } else if (voteType === "downvote") {
      userVote = "downvote";
    }

    res.status(200).json({
      status: "success",
      data: {
        score: updatedComment.score,
        upvotes: updatedComment.upvotes,
        downvotes: updatedComment.downvotes,
        userVote,
      },
    });
  }
);

// Pin / unpin a comment. Only the post's author may do this. PATCH /api/comments/:id/pin
export const pinComment = asyncErrorHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void | Response> => {
    const id = req.params.id as string;
    const userId = req.user!._id;

    if (!Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid comment ID", 400);
    }

    const comment = await Comment.findOne({ _id: id, isDeleted: false });
    if (!comment) {
      throw new AppError("Comment not found", 404);
    }

    const post = await Post.findById(comment.post).select("author");
    if (!post) {
      throw new AppError("Post not found", 404);
    }

    if (!post.author.equals(userId)) {
      throw new AppError("Only the post author can pin comments", 403);
    }

    comment.isPinned = !comment.isPinned;
    await comment.save();

    res.status(200).json({
      status: "success",
      data: { isPinned: comment.isPinned },
    });
  }
);
