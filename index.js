"use strict";

const express = require("express");
const { spawn } = require("child_process");
const { port, token } = require("./config");

const app = express();

app.use(express.json());

const activeConnections = new Map();

app.get("/start", (req, res) => {
  let tokenParam = req.query.token;

  if (!tokenParam || tokenParam !== token)
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
  console.log(`Server is running at :${port}`);
});
