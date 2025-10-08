import express from "express";
import cors from "cors";
import os from "os";
import productRoutes from "./productRoutes.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use("/api/products", productRoutes);

// Hàm tìm IP LAN để test trên Postman / điện thoại
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(` Server chạy tại: http://${getLocalIp()}:${PORT}`);
});
