import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires an explicit driver adapter — it no longer reads the
// connection string off the schema's datasource block on its own.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

export const prisma = new PrismaClient({ adapter });

export type PackageCategory = "core" | "extra";

export interface PackageListEntry {
  name: string;
  category: PackageCategory;
}

// CORE tier packages are surfaced as "core" in the UI, everything else as "extra".
function categoryFromTier(tier: string): PackageCategory {
  return tier === "CORE" ? "core" : "extra";
}

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