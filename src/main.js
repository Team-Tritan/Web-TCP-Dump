"use strict";

const express = require("express");
const { spawn } = require("child_process");
const { port, token } = require("../config");

const app = express();
const activeConnections = new Map();

app.use(express.json());

app.get("/start", (req, res) => {
  const tokenParam = req.query.token;

  if (!isValidToken(tokenParam)) {
    return res.status(401).send("Unauthorized");
  }

  const tcpdumpProcess = startTcpdumpProcess();

  const connectionId = Date.now().toString();
  activeConnections.set(connectionId, tcpdumpProcess);

  req.on("close", () => {
    stopTcpdumpProcess(connectionId);
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

function isValidToken(tokenParam) {
  return tokenParam === token;
}

function startTcpdumpProcess() {
  return spawn("sudo", ["tcpdump", "-l", "-i", "any", "-v"]);
}

function stopTcpdumpProcess(connectionId) {
  const process = activeConnections.get(connectionId);
  if (process) {
    process.kill();
    activeConnections.delete(connectionId);
  }
}
