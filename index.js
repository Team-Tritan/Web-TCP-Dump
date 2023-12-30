"use strict";

const express = require("express");
const { spawn } = require("child_process");

const app = express();
const port = 3069;

app.use(express.json());

const activeConnections = new Map();

app.get("/start", (req, res) => {
  let token = req.query.token;

  if (!token || token !== "hushthisistemporary")
    return res.status(401).send("Unauthorized");

  const tcpdumpProcess = spawn("sudo", ["tcpdump", "-l", "-i", "any", "-v"]);

  const connectionId = Date.now().toString();
  activeConnections.set(connectionId, tcpdumpProcess);

  req.on("close", () => {
    const process = activeConnections.get(connectionId);
    if (process) {
      process.kill();
      activeConnections.delete(connectionId);
    }
  });

  tcpdumpProcess.stdout.on("data", (data) => {
    res.write(data);
  });

  tcpdumpProcess.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  tcpdumpProcess.on("close", (code) => {
    console.log(`child process exited with code ${code}`);
    res.end();
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
