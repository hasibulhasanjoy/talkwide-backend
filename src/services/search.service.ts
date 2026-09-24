import { PipelineStage, Types } from "mongoose";

import Community from "../models/community.model.js";
import User from "../models/user.model.js";

const LIMIT_PER_TYPE = 20;

export interface SearchResult {
  _id: Types.ObjectId;
  searchType: "user" | "community";
  matchScore: number;
  [key: string]: unknown;
}

interface PipelineOptions {
  fields: { main: string; secondary: string };
  query: string; // already trimmed + lowercased
  searchType: "user" | "community";
  baseMatch: Record<string, unknown>;
  tieBreaker: Record<string, 1 | -1>;
  project: Record<string, 1>;
}

// Escape regex metacharacters so user input is always treated as plain text.
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildPipeline = ({
  fields,
  query,
  searchType,
  baseMatch,
  tieBreaker,
  project,
}: PipelineOptions): PipelineStage[] => {
  const { main, secondary } = fields;

  // $literal stops Mongo from treating a query like "$username" as a field path.
  const literalQuery = { $literal: query };
  const lower = (field: string) => ({ $toLower: { $ifNull: [`$${field}`, ""] } });

  const isExact = (field: string) => ({ $eq: [lower(field), literalQuery] });
  const isPrefix = (field: string) => ({
    $eq: [{ $indexOfCP: [lower(field), literalQuery] }, 0],
  });
  const isContained = (field: string) => ({
    $gt: [{ $indexOfCP: [lower(field), literalQuery] }, -1],
  });
  const points = (condition: object, value: number) => ({ $cond: [condition, value, 0] });

  const pattern = { $regex: escapeRegex(query), $options: "i" };

  return [
    {
      $match: {
        ...baseMatch,
        $or: [{ [main]: pattern }, { [secondary]: pattern }],
      },
    },
    {
      $addFields: {
        searchType,
        matchScore: {
          $add: [
            points(isExact(main), 100),
            points(isExact(secondary), 80),
            points(isPrefix(main), 50),
            points(isPrefix(secondary), 40),
            points(isContained(main), 20),
            points(isContained(secondary), 10),
          ],
        },
      },
    },
    // Sort BEFORE limiting so the best matches are the ones kept.
    { $sort: { matchScore: -1, ...tieBreaker } },
    { $limit: LIMIT_PER_TYPE },
    // Whitelist projection: only public fields are ever returned.
    { $project: { ...project, searchType: 1, matchScore: 1 } },
  ];
};

export const performSearch = async (
  q: string,
  type: "user" | "community" | "all"
): Promise<SearchResult[]> => {
  const query = q.trim().toLowerCase();
  const tasks: Promise<SearchResult[]>[] = [];

  if (type === "user" || type === "all") {
    const pipeline = buildPipeline({
      fields: { main: "username", secondary: "displayName" },
      query,
      searchType: "user",
      baseMatch: { isBanned: { $ne: true } },
      tieBreaker: { karma: -1, username: 1 },
      project: { username: 1, displayName: 1, avatarUrl: 1, bio: 1, karma: 1 },
    });
    tasks.push(User.aggregate<SearchResult>(pipeline).exec());
  }

  if (type === "community" || type === "all") {
    const pipeline = buildPipeline({
      fields: { main: "slug", secondary: "name" },
      query,
      searchType: "community",
      baseMatch: { isDeleted: { $ne: true } },
      tieBreaker: { memberCount: -1, slug: 1 },
      project: {
        name: 1,
        slug: 1,
        description: 1,
        avatarUrl: 1,
        memberCount: 1,
        postCount: 1,
      },
    });
    tasks.push(Community.aggregate<SearchResult>(pipeline).exec());
  }

  const results = (await Promise.all(tasks)).flat();

  // Merge users + communities into one list, best match first.
  return results.sort((a, b) => b.matchScore - a.matchScore);
};
