import jwt from "jsonwebtoken";

import DecodedToken from "../interfaces/token.interface.js";

export const verifyToken = (token: string, secret: string): Promise<DecodedToken> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        return reject(err);
      }

      resolve(decoded as DecodedToken);
    });
  });
};
