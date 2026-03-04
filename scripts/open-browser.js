const { exec } = require("child_process");

const url = "https://dev.habitville.co.uk";

setTimeout(() => {
  const cmd =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd);
}, 5000);
