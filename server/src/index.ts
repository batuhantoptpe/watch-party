import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import express from "express";
import { Server } from "socket.io";
import { CORS_ORIGIN, PORT } from "./config.js";
import { inviteRoute } from "./http/inviteRoute.js";
import { RoomStore } from "./rooms/RoomStore.js";
import { registerSocketHandlers } from "./socket/registerSocketHandlers.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN },
});

const publicDir = fileURLToPath(new URL("../public", import.meta.url));
app.use(express.static(publicDir));
app.get("/invite/:code", inviteRoute);

const roomStore = new RoomStore();
registerSocketHandlers(io, roomStore);

httpServer.listen(PORT, () => {
  console.log(`Cinemate relay sunucusu http://localhost:${PORT} adresinde çalışıyor`);
  console.log(`Test sayfası: http://localhost:${PORT}/test.html`);
});
