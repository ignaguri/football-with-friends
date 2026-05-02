const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "../public");
const distDir = path.join(__dirname, "../dist");

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`Source directory ${src} does not exist, skipping...`);
    return;
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${entry.name}`);
    }
  }
}

console.log("Copying public files to dist...");
copyRecursive(publicDir, distDir);
console.log("Public files copied successfully!");
