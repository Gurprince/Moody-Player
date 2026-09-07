const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const songRoutes = require("./routes/song.route");
const authRoutes = require("./routes/auth.route");
const { attachUser } = require("./middleware/auth");

const app = express();

/* Sessions travel in an httpOnly cookie, so the origin has to be named
   explicitly — a wildcard can't carry credentials. */
const ORIGINS = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, done) {
      // same-origin requests and curl send no Origin header
      if (!origin || ORIGINS.includes(origin)) return done(null, true);
      return done(new Error(`Origin ${origin} is not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(attachUser);

app.use("/", authRoutes);
app.use("/", songRoutes);

module.exports = app;
