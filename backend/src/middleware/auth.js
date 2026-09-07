const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");

const COOKIE = "mp_session";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) {
    throw new Error(
      "JWT_SECRET is not set. Generate one and put it in backend/.env — see .env.example."
    );
  }
  return value;
}

function issue(res, user) {
  const token = jwt.sign({ sub: user._id.toString() }, secret(), {
    expiresIn: "30d",
  });
  res.cookie(COOKIE, token, {
    httpOnly: true, // script on the page can never read it
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_MS,
    path: "/",
  });
}

function clear(res) {
  res.clearCookie(COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

/** Attaches req.user when a valid session cookie is present. Never rejects. */
async function attachUser(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return next();
  try {
    const { sub } = jwt.verify(token, secret());
    const user = await userModel.findById(sub);
    if (user) req.user = user;
  } catch {
    /* expired or tampered — treat as signed out */
  }
  return next();
}

/** Guards the routes that only make sense for a signed-in person. */
function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Sign in first." });
  return next();
}

/**
 * Who this request belongs to. Signed in, that's the account; signed out,
 * it's the anonymous browser id, so taste still works without one.
 */
const ownerOf = (req) =>
  req.user ? req.user._id.toString() : req.get("X-Client-Id") || null;

module.exports = { issue, clear, attachUser, requireUser, ownerOf, COOKIE };
