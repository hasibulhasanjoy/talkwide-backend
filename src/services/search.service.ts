import { Document, Types } from "mongoose";

import Community from "../models/community.model.js";
import User from "../models/user.model.js";

const buildPipeline = (
  matchFields: { main: string; secondary: string },
  searchQuery: string,
  modelType: "user" | "community"
) => {
  const query = searchQuery.toLowerCase();

  return [
    {
      $match: {
        $or: [
          { [matchFields.main]: { $regex: query, $options: "i" } },
          { [matchFields.secondary]: { $regex: query, $options: "i" } },
        ],
      },
    },
    {
      $addFields: {
        searchType: modelType,
        matchScore: {
          $add: [
            {
              $cond: [
                { $eq: [{ $toLower: { $ifNull: [`$${matchFields.main}`, ""] } }, query] },
                100,
                0,
              ],
            },
            {
              $cond: [
                { $eq: [{ $toLower: { $ifNull: [`$${matchFields.secondary}`, ""] } }, query] },
                80,
                0,
              ],
            },
            {
              $cond: [
                {
                  $eq: [
                    {
                      $indexOfCP: [
                        { $toLower: { $ifNull: [`$${matchFields.main}`, ""] } },
                        query,
                      ],
                    },
                    0,
                  ],
                },
                50,
                0,
              ],
            },
            {
              $cond: [
                {
                  $eq: [
                    {
                      $indexOfCP: [
                        { $toLower: { $ifNull: [`$${matchFields.secondary}`, ""] } },
                        query,
                      ],
                    },
                    0,
                  ],
                },
                40,
                0,
              ],
            },
            {
              $cond: [
                {
                  $gt: [
                    {
                      $indexOfCP: [
                        { $toLower: { $ifNull: [`$${matchFields.main}`, ""] } },
                        query,
                      ],
                    },
                    -1,
                  ],
                },
                20,
                0,
              ],
            },
            {
              $cond: [
                {
                  $gt: [
                    {
                      $indexOfCP: [
                        { $toLower: { $ifNull: [`$${matchFields.secondary}`, ""] } },
                        query,
                      ],
                    },
                    -1,
                  ],
                },
                10,
                0,
              ],
            },
          ],
        },
      },
    },
  ];
};

export interface SearchResult {
  _id: Types.ObjectId;
  searchType: "user" | "community";
  matchScore: number;
  [key: string]: unknown;
}

export const performSearch = async (q: string, type: "user" | "community" | "all") => {
  const usersPipeline = buildPipeline({ main: "username", secondary: "displayName" }, q, "user");
  const communitiesPipeline = buildPipeline({ main: "slug", secondary: "name" }, q, "community");

  let results: SearchResult[] = [];

  if (type === "user" || type === "all") {
    const users = await User.aggregate<SearchResult>([
      { $match: { isBanned: { $ne: true } } },
      ...usersPipeline,
      {
        $project: {
          password: 0,
          email: 0,
          __v: 0,
          googleId: 0,
        },
      },
      { $limit: 20 },
    ]);
     
    results = [...results, ...users];
  }

  if (type === "community" || type === "all") {
    const communities = await Community.aggregate<SearchResult>([
      { $match: { isDeleted: { $ne: true } } },
      ...communitiesPipeline,
      {
        $project: {
          __v: 0,
        },
      },
      { $limit: 20 },
    ]);
     
    results = [...results, ...communities];
  }

  // Sort by match score in descending order
  results.sort((a, b) => b.matchScore - a.matchScore);

  return results;
};
