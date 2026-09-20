import passport from "passport";
import { Profile, Strategy as GoogleStrategy, VerifyCallback } from "passport-google-oauth20";

import IUser from "../interfaces/user.interface.js";
import User from "../models/user.model.js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET as string;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL as string;

// Ensure environment variables are loaded
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
  console.warn("⚠️ Google OAuth environment variables are not properly set. Google authentication will not work.");
}

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID || "dummy-client-id",
      clientSecret: GOOGLE_CLIENT_SECRET || "dummy-client-secret",
      callbackURL: GOOGLE_CALLBACK_URL || "http://localhost:5500/api/auth/google/callback",
      scope: ["profile", "email"],
    },
    (_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback): void => {
      (async (): Promise<void> => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            done(new Error("No email found in Google profile"), undefined);
            return;
          }

          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            user.lastLogin = new Date();
            await user.save();
            done(null, user);
            return;
          }

          user = await User.findOne({ email });

          if (user) {
            if (user.authProvider === "local") {
              done(
                new Error(
                  "An account with this email already exists. Please login with email/password."
                ),
                undefined
              );
              return;
            }
            user.googleId = profile.id;
            user.lastLogin = new Date();
            await user.save();
            done(null, user);
            return;
          }

          const displayName = profile.displayName || profile.name?.givenName || "User";
          const username = `user_${profile.id.slice(0, 10)}`;
          const avatarUrl = profile.photos?.[0]?.value;

          const newUser: IUser = await User.create({
            username,
            displayName,
            email,
            authProvider: "google",
            googleId: profile.id,
            avatarUrl,
            emailVerifiedAt: new Date(),
            lastLogin: new Date(),
          });

          done(null, newUser);
        } catch (error) {
          done(error instanceof Error ? error : new Error(String(error)), undefined);
        }
      })().catch((error: unknown) => {
        done(error instanceof Error ? error : new Error(String(error)), undefined);
      });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

passport.deserializeUser((id: string, done) => {
  User.findById(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error: unknown) => {
      done(error instanceof Error ? error : new Error(String(error)), null);
    });
});

export default passport;
