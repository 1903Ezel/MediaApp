// convert-vapid-key.js
// Dönüştürme: Base64URL → PKCS#8 PEM (Web Push için)

import { writeFileSync } from "fs";
import { createPrivateKey } from "crypto";

function base64urlToBase64(base64url) {
  return base64url.replace(/-/g, '+').replace(/_/g, '/');
}

const base64urlKey = "AQA_1OGzVQ7EoF_LX1cMXgAuyZl3WQrf4_kDGSZFBEc"; // 🔑 senin anahtarını buraya yaz
const base64Key = base64urlToBase64(base64urlKey);
const rawKey = Buffer.from(base64Key, "base64");

// OpenSSL'in anlayacağı şekilde ECDSA P-256 formatına çevir
const privateKeyObj = createPrivateKey({
  key: Buffer.concat([
    Buffer.from("302E0201010420", "hex"), // EC private key header (P-256 için)
    rawKey,
    Buffer.from("A00706052B8104000A", "hex") // OID: prime256v1
  ]),
  format: "der",
  type: "pkcs8",
});

const pem = privateKeyObj.export({ format: "pem", type: "pkcs8" });

writeFileSync("vapid_private.pem", pem);

console.log("\n✅ PKCS#8 PEM formatına dönüştürüldü!");
console.log("📄 vapid_private.pem dosyasını .env içine ekleyebilirsin.\n");
