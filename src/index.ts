import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { createHash } from "crypto";
import { blake3 } from "hash-wasm";
import { fetchPackage, fetchAllPackages, prisma } from "./registry";
import authRouter from "./auth";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRouter);

interface QuartzJWT {
  githubId: number;
  username: string;
  avatarUrl: string;
  accountAgeOk: boolean;
  role: "ADMIN" | "TRUSTED_DEV" | "CONTRIBUTOR";
}

function requireUser(req: express.Request): QuartzJWT | null {
  const token = req.cookies?.quartz_session;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as QuartzJWT;
  } catch {
    return null;
  }
}

function canPublishToTier(role: string, tier: string): boolean {
  if (role === "ADMIN") return true;
  if (role === "TRUSTED_DEV") return tier !== "CORE";
  return false;
}

app.get("/packages", async (req, res) => {
  try {
    const packages = await fetchAllPackages();
    res.json({ packages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch package list" });
  }
});

app.get("/packages/:name", async (req, res) => {
  try {
    const pkg = await fetchPackage(req.params.name);
    if (!pkg) {
      res.status(404).json({ error: `Package '${req.params.name}' not found` });
      return;
    }
    res.json({ package: pkg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch package" });
  }
});

app.post("/packages", async (req, res) => {
  const session = requireUser(req);
  if (!session) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }

  const { name, version, description, maintainer, tier, rawToml } = req.body;

  if (!name || !version || !description || !maintainer || !tier || !rawToml) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  if (!canPublishToTier(session.role, tier)) {
    res.status(403).json({ error: "You don't have permission to publish to this tier" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { githubId: session.githubId } });
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const buf = Buffer.from(rawToml, "utf-8");
    const sha256 = createHash("sha256").update(buf).digest("hex");
    const blake3sum = await blake3(buf);

    const pkg = await prisma.package.upsert({
      where: { name },
      update: { version, description, maintainer, tier, rawToml, sha256, blake3: blake3sum },
      create: {
        name, version, description, maintainer, tier, rawToml,
        sha256, blake3: blake3sum, ownerId: user.id,
      },
    });

    res.json({ package: pkg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to publish package" });
  }
});

app.listen(PORT, () => {
  console.log(`Quartz registry running on port ${PORT}`);
});