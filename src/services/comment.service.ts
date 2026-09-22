import { Types } from "mongoose";

import IComment from "../interfaces/comment.interface.js";
import Comment from "../models/comment.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import AppError from "../utils/appError.class.js";

export type CommentSort = "popular" | "new";
export type CommentVoteType = "upvote" | "downvote" | "remove";

// A comment enriched for the client: its nested replies plus the requesting
// user's current vote (when authenticated).
export type CommentNode = IComment & {
  replies: CommentNode[];
  userVote?: CommentVoteType | null;
};

interface CreateCommentInput {
  authorId: Types.ObjectId;
  content: string;
  // Provide `postId` for a top-level comment, or `parentId` to reply to a comment.
  postId?: string;
  parentId?: string;
}

interface CommentTreeInput {
  postId: string;
  sort: CommentSort;
  page: number;
  limit: number;
  userId?: Types.ObjectId;
}

interface CommentTreeResult {
  comments: CommentNode[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Create a top-level comment (`postId`) or a reply (`parentId`).
 *
 * For a reply we derive the post and the ancestor chain from the parent, so a
 * reply always lives on the same post and one level deeper than its parent.
 * Rejects commenting when the post is missing/deleted or has comments locked.
 *
 * Side effects: increments `Post.commentCount`, the parent's `replyCount` (for
 * replies), and adds the comment to the author's `comments` array.
 *
 * @throws {AppError} 404 if the parent comment or post does not exist.
 * @throws {AppError} 403 if commenting is turned off for the post.
 */
export const createCommentDoc = async ({
  authorId,
  content,
  postId,
  parentId,
}: CreateCommentInput): Promise<IComment | null> => {
  let postObjectId: Types.ObjectId;
  let parent: Types.ObjectId | null = null;
  let ancestors: Types.ObjectId[] = [];
  let depth = 0;

  if (parentId) {
    const parentComment = await Comment.findOne({ _id: parentId, isDeleted: false });
    if (!parentComment) {
      throw new AppError("Parent comment not found", 404);
    }
    postObjectId = parentComment.post;
    parent = parentComment._id;
    ancestors = [...parentComment.ancestors, parentComment._id];
    depth = parentComment.depth + 1;
  } else {
    postObjectId = new Types.ObjectId(postId);
  }

  const post = await Post.findOne({ _id: postObjectId, isDeleted: false });
  if (!post) {
    throw new AppError("Post not found", 404);
  }
  if (post.isLocked) {
    throw new AppError("Comments are turned off for this post", 403);
  }

  const comment = await Comment.create({
    post: postObjectId,
    author: authorId,
    parent,
    ancestors,
    depth,
    content,
  });

  await Post.findByIdAndUpdate(postObjectId, { $inc: { commentCount: 1 } });
  if (parent) {
    await Comment.findByIdAndUpdate(parent, { $inc: { replyCount: 1 } });
  }
  await User.findByIdAndUpdate(authorId, { $addToSet: { comments: comment._id } });

  return Comment.findById(comment._id).populate("author", "username displayName avatarUrl");
};

/**
 * Apply an upvote / downvote / remove to a comment, mirroring post voting.
 *
 * Keeps `upvotedBy`/`downvotedBy` on the comment and the user's
 * `upvotedComments`/`downVotedComments` in sync, updates the score, and adjusts
 * the comment author's karma. Re-issuing the same vote is a no-op.
 *
 * @throws {AppError} 404 if the comment does not exist.
 * @throws {AppError} 403 if the user tries to vote on their own comment.
 */
export const handleCommentVote = async (
  commentId: Types.ObjectId,
  userId: Types.ObjectId,
  voteType: CommentVoteType
): Promise<IComment> => {
  const comment = await Comment.findOne({ _id: commentId, isDeleted: false });

  if (!comment) {
    throw new AppError("Comment not found", 404);
  }

  if (comment.author.equals(userId)) {
    throw new AppError("You cannot vote on your own comment", 403);
  }

  const hasUpvoted = comment.upvotedBy.some((id) => id.equals(userId));
  const hasDownvoted = comment.downvotedBy.some((id) => id.equals(userId));

  let upvoteDelta = 0;
  let downvoteDelta = 0;
  let karmaDelta: number;

  let userUpvoteUpdate: Record<string, unknown> = {};
  let userDownvoteUpdate: Record<string, unknown> = {};

  if (voteType === "upvote") {
    if (hasUpvoted) {
      return comment;
    }

    if (hasDownvoted) {
      downvoteDelta = -1;
      upvoteDelta = 1;
      karmaDelta = 2;
      comment.downvotedBy = comment.downvotedBy.filter((id) => !id.equals(userId));
      comment.upvotedBy.push(userId);
      userDownvoteUpdate = { $pull: { downVotedComments: commentId } };
      userUpvoteUpdate = { $addToSet: { upvotedComments: commentId } };
    } else {
      upvoteDelta = 1;
      karmaDelta = 1;
      comment.upvotedBy.push(userId);
      userUpvoteUpdate = { $addToSet: { upvotedComments: commentId } };
    }
  } else if (voteType === "downvote") {
    if (hasDownvoted) {
      return comment;
    }

    if (hasUpvoted) {
      upvoteDelta = -1;
      downvoteDelta = 1;
      karmaDelta = -2;
      comment.upvotedBy = comment.upvotedBy.filter((id) => !id.equals(userId));
      comment.downvotedBy.push(userId);
      userUpvoteUpdate = { $pull: { upvotedComments: commentId } };
      userDownvoteUpdate = { $addToSet: { downVotedComments: commentId } };
    } else {
      downvoteDelta = 1;
      karmaDelta = -1;
      comment.downvotedBy.push(userId);
      userDownvoteUpdate = { $addToSet: { downVotedComments: commentId } };
    }
  } else {
    if (hasUpvoted) {
      upvoteDelta = -1;
      karmaDelta = -1;
      comment.upvotedBy = comment.upvotedBy.filter((id) => !id.equals(userId));
      userUpvoteUpdate = { $pull: { upvotedComments: commentId } };
    } else if (hasDownvoted) {
      downvoteDelta = -1;
      karmaDelta = 1;
      comment.downvotedBy = comment.downvotedBy.filter((id) => !id.equals(userId));
      userDownvoteUpdate = { $pull: { downVotedComments: commentId } };
    } else {
      return comment;
    }
  }

  comment.upvotes += upvoteDelta;
  comment.downvotes += downvoteDelta;
  comment.score = comment.upvotes - comment.downvotes;

  await comment.save();

  if (Object.keys(userUpvoteUpdate).length > 0) {
    await User.findByIdAndUpdate(userId, userUpvoteUpdate);
  }
  if (Object.keys(userDownvoteUpdate).length > 0) {
    await User.findByIdAndUpdate(userId, userDownvoteUpdate);
  }

  if (karmaDelta !== 0) {
    await User.findByIdAndUpdate(comment.author, { $inc: { karma: karmaDelta } });
  }

  return comment;
};

/**
 * Assemble a flat list of comments into a nested tree.
 *
 * `topLevel` are the already-sorted roots (pinned first, then by the requested
 * order). Each descendant is attached to its parent's `replies`, and replies are
 * ordered by score, then oldest-first for a stable, readable thread.
 */
const buildCommentTree = (
  topLevel: IComment[],
  descendants: IComment[],
  userVotes?: { up: Set<string>; down: Set<string> }
): CommentNode[] => {
  const nodeById = new Map<string, CommentNode>();

  for (const doc of [...topLevel, ...descendants]) {
    const node = doc as CommentNode;
    node.replies = [];
    if (userVotes) {
      const id = node._id.toString();
      node.userVote = userVotes.up.has(id) ? "upvote" : userVotes.down.has(id) ? "downvote" : null;
    }
    nodeById.set(node._id.toString(), node);
  }

  // Attach every reply to its parent node.
  for (const doc of descendants) {
    const node = nodeById.get(doc._id.toString());
    const parent = node?.parent ? nodeById.get(node.parent.toString()) : undefined;
    if (node && parent) {
      parent.replies.push(node);
    }
  }

  const sortReplies = (node: CommentNode): void => {
    node.replies.sort((a, b) => b.score - a.score || a.createdAt.getTime() - b.createdAt.getTime());
    node.replies.forEach(sortReplies);
  };

  const roots = topLevel.map((doc) => nodeById.get(doc._id.toString()) as CommentNode);
  roots.forEach(sortReplies);

  return roots;
};

/**
 * Build the paginated comment tree for a post.
 *
 * Top-level comments are paginated and sorted (pinned first, then popularity or
 * newest); the full reply subtree for that page is loaded in a single follow-up
 * query via the `ancestors` index. When `userId` is provided, each node is tagged
 * with that user's current vote.
 */
export const getPostCommentTree = async ({
  postId,
  sort,
  page,
  limit,
  userId,
}: CommentTreeInput): Promise<CommentTreeResult> => {
  const postObjectId = new Types.ObjectId(postId);

  const sortSpec: Record<string, 1 | -1> =
    sort === "new" ? { isPinned: -1, createdAt: -1 } : { isPinned: -1, score: -1, createdAt: -1 };

  const skip = (page - 1) * limit;
  const topLevelFilter = { post: postObjectId, parent: null, isDeleted: false };

  const total = await Comment.countDocuments(topLevelFilter);

  const topLevel: IComment[] = await Comment.find(topLevelFilter)
    .sort(sortSpec)
    .skip(skip)
    .limit(limit)
    .populate("author", "username displayName avatarUrl")
    .lean();

  const topLevelIds = topLevel.map((comment) => comment._id);

  const descendants: IComment[] = topLevelIds.length
    ? await Comment.find({
        post: postObjectId,
        ancestors: { $in: topLevelIds },
        isDeleted: false,
      })
        .populate("author", "username displayName avatarUrl")
        .lean()
    : [];

  let userVotes: { up: Set<string>; down: Set<string> } | undefined;
  if (userId) {
    const user = await User.findById(userId).select("upvotedComments downVotedComments");
    if (user) {
      userVotes = {
        up: new Set(user.upvotedComments.map((id) => id.toString())),
        down: new Set(user.downVotedComments.map((id) => id.toString())),
      };
    }
  }

  const comments = buildCommentTree(topLevel, descendants, userVotes);

  return {
    comments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Soft-delete a comment and its entire reply subtree.
 *
 * All descendants are found in one query via the `ancestors` index, then the
 * comment and every descendant are marked deleted. `Post.commentCount` is
 * decremented by the number removed, the parent's `replyCount` is decremented,
 * and every affected comment id is pulled from all users' `comments` arrays.
 *
 * @returns the number of comments soft-deleted (self + descendants).
 */
export const deleteCommentCascade = async (comment: IComment): Promise<number> => {
  const descendants = await Comment.find({
    post: comment.post,
    ancestors: comment._id,
    isDeleted: false,
  }).select("_id");

  const allIds = [comment._id, ...descendants.map((descendant) => descendant._id)];
  const now = new Date();

  await Comment.updateMany({ _id: { $in: allIds } }, { isDeleted: true, deletedAt: now });

  await Post.findByIdAndUpdate(comment.post, { $inc: { commentCount: -allIds.length } });

  if (comment.parent) {
    await Comment.findByIdAndUpdate(comment.parent, { $inc: { replyCount: -1 } });
  }

  await User.updateMany({}, { $pull: { comments: { $in: allIds } } });

  return allIds.length;
};
