import TOML from "@iarna/toml";

<<<<<<< HEAD
// Prisma 7 requires an explicit driver adapter it no longer reads the
// connection string off the schema's datasource block on its own apparently..
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
=======
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER || "yourusername";
const REPO_NAME = process.env.REPO_NAME || "quartz-packages";
>>>>>>> parent of 4530a79 (Massive database overhaul backend and frontend.)

const BASE_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

const headers: Record<string, string> = {
  Accept: "application/vnd.github.v3+json",
  ...(GITHUB_TOKEN && { Authorization: `Bearer ${GITHUB_TOKEN}` }),
};

// Fetch a single package by name — reads its QZMAKE file
export async function fetchPackage(name: string): Promise<object | null> {
  const url = `${BASE_URL}/contents/${name}/QZMAKE`;

  const res = await fetch(url, { headers });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const data = await res.json() as { content: string };

  // GitHub returns file content as base64
  const raw = Buffer.from(data.content, "base64").toString("utf-8");
  const parsed = TOML.parse(raw);

  return parsed;
}

// Fetch all packages — reads the top level folders in the repo
export async function fetchAllPackages(): Promise<string[]> {
  const url = `${BASE_URL}/contents`;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const data = await res.json() as Array<{ name: string; type: string }>;

  // Only return folders (each folder = one package)
  return data
    .filter((item) => item.type === "dir")
    .map((item) => item.name);
}
<<<<<<< HEAD

export async function fetchAllPackages(): Promise<PackageListEntry[]> {
  const packages = await prisma.package.findMany({
    select: { name: true, tier: true },
    orderBy: { name: "asc" },
  });

  return packages.map((p) => ({ name: p.name, category: categoryFromTier(p.tier) }));
}

export async function fetchPackage(name: string) {
  const pkg = await prisma.package.findUnique({ where: { name } });
  if (!pkg) return null;

  return { ...pkg, category: categoryFromTier(pkg.tier) };
}

=======
>>>>>>> parent of 4530a79 (Massive database overhaul backend and frontend.)
