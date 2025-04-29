import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../model/userModel.js";
import dotenv from "dotenv";
dotenv.config();

const generateUserId = async () => {
    const count = await User.countDocuments();
    return `ID${1000 + count + 1}`;
};

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/auth/google/callback",
            passReqToCallback: true,
        },
        async (req, accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails[0].value;

                let user = await User.findOne({ email });

                if (user) {
                    if (user.isBlocked) {
                        return done(null, false, { message: "Account is blocked. Please contact support" });
                    }

                    if (!user.googleId) {
                        return done(null, false, { message: "Email already registered. Please login with password." });
                    }

                    return done(null, user);
                }

                // Create new user
                const userId = await generateUserId();
                const referalCode = `FIT${userId}`;

                const newUser = new User({
                    name: profile.displayName,
                    email,
                    googleId: profile.id,
                    userId,
                    referalCode,
                });

                await newUser.save();
                return done(null, newUser);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

export default passport;
