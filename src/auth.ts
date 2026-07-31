import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "./registry";

const router = Router();

const {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  JWT_SECRET,
  FRONTEND_URL = "http://localhost:5173",
  ADMIN_GITHUB_IDS = "",
} = process.env;

const adminIds = ADMIN_GITHUB_IDS.split(",").map((id) => id.trim()).filter(Boolean);

interface GithubUser {
  id: number;
  login: string;
  avatar_url: string;
  created_at: string;
}

interface QuartzJWT {
  githubId: number;
  username: string;
  avatarUrl: string;
  accountAgeOk: boolean;
  role: "ADMIN" | "TRUSTED_DEV" | "CONTRIBUTOR";
}

router.get("/github", (req, res) => {
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID!,
    redirect_uri: `${req.protocol}://${req.get("host")}/auth/github/callback`,
    scope: "read:user",
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

router.get("/github/callback", async (req, res) => {
  const code = req.query.code as string | undefined;
  if (!code) {
    res.status(400).send("Missing code");
    return;
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };

    if (!tokenData.access_token) {
      console.error("GitHub token exchange failed:", tokenData);
      res.status(400).send("GitHub token exchange failed");
      return;
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const ghUser = (await userRes.json()) as GithubUser;

    const accountCreated = new Date(ghUser.created_at);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const accountAgeOk = accountCreated <= sixMonthsAgo;

    const role: QuartzJWT["role"] = adminIds.includes(String(ghUser.id))
      ? "ADMIN"
      : "CONTRIBUTOR";

    // Create the user on first login, keep it in sync on every login after
    await prisma.user.upsert({
      where: { githubId: ghUser.id },
      update: {
        username: ghUser.login,
        avatarUrl: ghUser.avatar_url,
        role,
      },
      create: {
        githubId: ghUser.id,
        username: ghUser.login,
        avatarUrl: ghUser.avatar_url,
        githubCreatedAt: accountCreated,
        role,
      },
    });

    const payload: QuartzJWT = {
      githubId: ghUser.id,
      username: ghUser.login,
      avatarUrl: ghUser.avatar_url,
      accountAgeOk,
      role,
    };

    const token = jwt.sign(payload, JWT_SECRET!, { expiresIn: "7d" });

    res.cookie("quartz_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(FRONTEND_URL);
  } catch (err) {
    console.error(err);
    res.status(500).send("OAuth failed");
  }
});

router.get("/me", (req, res) => {
  const token = req.cookies?.quartz_session;
  if (!token) {
    res.status(401).json({ user: null });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET!) as QuartzJWT;
    res.json({ user: payload });
  } catch {
    res.status(401).json({ user: null });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("quartz_session");
  res.json({ ok: true });
});

export default router;
