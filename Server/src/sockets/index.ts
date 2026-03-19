import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { verifyAccessToken } from "../utils/jwt.utils";
import { registerAuctionHandlers } from "./auction.socket";

export let io: SocketServer;

/**
 * Initialize Socket.io server and register socket handlers.
 */
export const initSocket = (httpServer: HttpServer) => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        socket.data.userId = decoded.sub;
        socket.data.role = decoded.role;
      } catch {
        // Allow anonymous socket clients for read-only auction viewing.
      }
    }

    return next();
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string | undefined;

    if (userId) {
      socket.join(`user:${userId}`);
    }

    registerAuctionHandlers(io, socket);
  });

  return io;
};
