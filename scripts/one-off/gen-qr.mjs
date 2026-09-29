import QRCode from "qrcode";
await QRCode.toFile(
  "C:\\Users\\johnm\\AppData\\Local\\Temp\\claude\\C--Users-johnm-Documents-Ask-larder\\4cbe4986-dce6-460f-84de-ef42a82304b4\\scratchpad\\shots\\qr-contact.png",
  "https://asklarder.com.au/contact",
  { width: 500, margin: 1, color: { dark: "#F2E9D8", light: "#00000000" } },
);
console.log("qr saved");
