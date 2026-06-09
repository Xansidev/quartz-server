import express from "express";
import cors from "cors";
import { fetchPackage, fetchAllPackages } from "./registry";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// GET /packages — list all available packages
app.get("/packages", async (req, res) => {
  try {
    const packages = await fetchAllPackages();
    res.json({ packages });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch package list" });
  }
});

// GET /packages/:name — get a single package's QZMAKE
app.get("/packages/:name", async (req, res) => {
  try {
    const pkg = await fetchPackage(req.params.name);
    if (!pkg) {
      res.status(404).json({ error: `Package '${req.params.name}' not found` });
      return;
    }
    res.json(pkg);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch package" });
  }
});

app.listen(PORT, () => {
  console.log(`Quartz registry running on port ${PORT}`);
});
