#!/usr/bin/env node
// Runs as eas-build-post-install, after `expo prebuild` has regenerated
// android/gradle.properties. Bumps org.gradle.jvmargs so Kotlin KSP
// (expo-updates, expo-modules-core) has enough Metaspace to finish.
// Default template value (Xmx=2g, Metaspace=512m) reliably OOMs with
// Expo SDK 55 + react-native 0.83 + Kotlin 2.x KSP.

const fs = require("node:fs");
const path = require("node:path");

const propsPath = path.resolve(__dirname, "..", "android", "gradle.properties");
const JVMARGS = "-Xmx4g -XX:MaxMetaspaceSize=2g";

if (!fs.existsSync(propsPath)) {
  console.log(`[patch-gradle-jvmargs] ${propsPath} not found, skipping.`);
  process.exit(0);
}

const original = fs.readFileSync(propsPath, "utf8");
const line = `org.gradle.jvmargs=${JVMARGS}`;

let next;
if (/^org\.gradle\.jvmargs=.*$/m.test(original)) {
  next = original.replace(/^org\.gradle\.jvmargs=.*$/m, line);
} else {
  next = `${original.trimEnd()}\n${line}\n`;
}

if (next === original) {
  console.log(`[patch-gradle-jvmargs] Already patched: ${line}`);
} else {
  fs.writeFileSync(propsPath, next);
  console.log(`[patch-gradle-jvmargs] Patched: ${line}`);
}
