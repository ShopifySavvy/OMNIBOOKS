import express from "express";
import { createServer as createViteServer } from "vite";
import { Readable } from 'stream';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Proxy route for downloading files
  app.get("/api/proxy", async (req, res) => {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).send("Missing url parameter");
    }

    try {
      console.log(`Proxying request to: ${url}`);
      
      // Add a User-Agent to avoid being blocked by some servers
      const headers = new Headers();
      headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      const response = await fetch(url, {
        headers: headers,
        redirect: 'follow'
      });
      
      if (!response.ok) {
        console.error(`Upstream error: ${response.status} ${response.statusText} for ${url}`);
        return res.status(response.status).send(`Failed to fetch: ${response.statusText}`);
      }

      // Forward headers
      const contentType = response.headers.get("content-type");
      const contentDisposition = response.headers.get("content-disposition");
      
      if (contentType) res.setHeader("Content-Type", contentType);
      if (contentDisposition) res.setHeader("Content-Disposition", contentDisposition);
      
      // Do NOT forward Content-Length as the upstream response might be compressed (gzip)
      // and Node's fetch decompresses it, making the length mismatch.
      // Express will use chunked encoding automatically.
      
      // Stream the response
      // @ts-ignore - response.body is a ReadableStream
      const reader = response.body.getReader();
      
      const stream = new Readable({
        async read() {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null);
          } else {
            this.push(Buffer.from(value));
          }
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).send("Proxy error");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving would go here if needed
    // But for this environment, we focus on dev mode
    app.use(express.static('dist'));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
