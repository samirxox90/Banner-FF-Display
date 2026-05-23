import { Router } from "express";

const router = Router();

router.get("/banners", async (req, res) => {
  const region = req.query["server"] as string;
  if (!region) {
    res.status(400).json({ error: "Missing server query param" });
    return;
  }

  const allowed = ["SG","BD","IND","CIS","EU","NA","PK","ID","TH","MEA","BR","LATAM","VN","TW"];
  if (!allowed.includes(region.toUpperCase())) {
    res.status(400).json({ error: "Invalid region" });
    return;
  }

  try {
    const upstream = await fetch(`https://api-links1.vercel.app/api?server=${region.toUpperCase()}`);
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: "Upstream API error" });
      return;
    }
    const data = await upstream.json();
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch banners");
    res.status(502).json({ error: "Failed to reach upstream API" });
  }
});

export default router;
