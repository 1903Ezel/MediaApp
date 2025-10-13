const fs = require("fs");

// Raw VAPID private key (base64url formatında)
const base64urlKey = "AQA_1OGzVQ7EoF_LX1cMXgAuyZl3WQrf4_kDGSZFBEc";

// base64url → base64 → binary
function base64urlToBase64(base64url) {
  return base64url.replace(/-/g, "+").replace(/_/g, "/");
}

const base64Key = base64urlToBase64(base64urlKey);
const rawKey = Buffer.from(base64Key, "base64");

// Şimdi raw 32-byte key'i PKCS#8 (DER) yapısına sarıyoruz.
// Bu sabit header, P-256 ECDSA özel anahtarı için ASN.1 DER prefixidir.
const pkcs8Header = Buffer.from("302E0201010420", "hex");
const pkcs8Footer = Buffer.from("A00706052B8104000A", "hex");

const derKey = Buffer.concat([pkcs8Header, rawKey, pkcs8Footer]);

// PEM formatına dönüştür
const pemKey =
  "-----BEGIN PRIVATE KEY-----\n" +
  derKey.toString("base64").match(/.{1,64}/g).join("\n") +
  "\n-----END PRIVATE KEY-----\n";

// Dosyaya yaz
fs.writeFileSync("vapid_private.pem", pemKey);

console.log("✅ PKCS#8 VAPID Private Key oluşturuldu:");
console.log("📄 vapid_private.pem dosyası kaydedildi!");
