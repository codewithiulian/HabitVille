const fs = require("fs");
const path = require("path");
const { parse } = require("yaml");

const ymlPath = path.join(__dirname, "..", "config.yml");
const outPath = path.join(__dirname, "..", "src", "config", "game-config.gen.json");

const yml = fs.readFileSync(ymlPath, "utf8");
const data = parse(yml);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(data, null, 2));

console.log("Generated", outPath);
