#!/usr/bin/env tsx
// Script to generate VAPID keys for Web Push notifications

import { writeFile } from "fs/promises";
import { join } from "path";
import webpush from "web-push";

async function generateVapidKeys() {
  console.log("🔑 Generating VAPID keys for Web Push notifications...\n");

  const vapidKeys = webpush.generateVAPIDKeys();

  console.log("✅ VAPID keys generated successfully!\n");
  console.log("📋 Add these to your .env file:\n");
  console.log("VAPID_PUBLIC_KEY=" + vapidKeys.publicKey);
  console.log("VAPID_PRIVATE_KEY=" + vapidKeys.privateKey);
  console.log("VAPID_SUBJECT=mailto:your-email@example.com\n");

  // Optionally save to a file
  const envContent = `
# Web Push Notification VAPID Keys
# Generated on ${new Date().toISOString()}
VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_SUBJECT=mailto:admin@football-with-friends.com
`;

  const outputPath = join(process.cwd(), ".env.vapid");
  await writeFile(outputPath, envContent.trim());

  console.log(`💾 Keys also saved to: ${outputPath}`);
  console.log("\n⚠️  IMPORTANT SECURITY NOTES:");
  console.log("1. Keep your VAPID_PRIVATE_KEY secret - never commit it to git");
  console.log("2. Add .env.vapid to your .gitignore");
  console.log("3. Copy these values to your .env file");
  console.log("4. Update VAPID_SUBJECT with your actual contact email\n");
}

generateVapidKeys().catch((error) => {
  console.error("❌ Error generating VAPID keys:", error);
  process.exit(1);
});
