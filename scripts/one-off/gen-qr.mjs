// Same canonical address rule as src/lib/site.ts (NEXT_PUBLIC_SITE_URL, fallback https://asklarder.com.au), never a request host.
import QRCode from "qrcode";
await QRCode.toFile(
  "C:\\Users\\johnm\\AppData\\Local\\Temp\\claude\\C--Users-johnm-Documents-Ask-larder\\4cbe4986-dce6-460f-84de-ef42a82304b4\\scratchpad\\shots\\qr-contact.png",
  `${(process.env.NEXT_PUBLIC_SITE_URL || "https://asklarder.com.au").replace(/\/+$/, "")}/contact`,
  { width: 500, margin: 1, color: { dark: "#F2E9D8", light: "#00000000" } },
);
console.log("qr saved");
