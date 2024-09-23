const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
// เปิด CORS สำหรับทุก origin
app.use(
  cors({
    origin: "*", // อนุญาตทุก origin
    methods: ["GET", "POST"],
    credentials: true, // รองรับการใช้งาน cookies และ credentials อื่นๆ
  })
);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // เปิดให้เชื่อมต่อจากทุก domain หรือระบุ domain ที่อนุญาต
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Storage for users and rooms
const users = {}; // เก็บ socket.id กับ username
const rooms = {}; // เก็บ room กับรายชื่อผู้ที่อยู่ในห้องนั้น

// WebSocket connection
io.on("connection", (socket) => {
  console.log("New client connected", socket.id);

  // เมื่อผู้ใช้เข้าห้องแชท
  socket.on("joinRoom", ({ username, room }) => {
    // บันทึกผู้ใช้และห้องที่พวกเขาเข้ามา
    users[socket.id] = username;
    socket.join(room);

    // เก็บห้องและผู้ใช้ในห้อง
    if (!rooms[room]) {
      rooms[room] = [];
    }
    rooms[room].push(username);

    console.log(`${username} joined room: ${room}`);

    // ส่งข้อความแจ้งว่าผู้ใช้เข้ามาในห้อง
    socket.to(room).emit("message", `${username} has joined the chat`);

    // ส่งรายชื่อผู้ใช้ในห้องให้ client
    io.to(room).emit("roomData", { room, users: rooms[room] });
  });

  // เมื่อมีการส่งข้อความในห้องแชท
  socket.on("chatMessage", ({ room, message }) => {
    const username = users[socket.id];
    io.to(room).emit("message", { username, message }); // ส่งข้อความไปยังทุกคนในห้อง
  });

  // เมื่อผู้ใช้ disconnect
  socket.on("disconnect", () => {
    const username = users[socket.id];
    const room = Object.keys(rooms).find((r) => rooms[r].includes(username));

    if (room) {
      // ลบผู้ใช้ออกจากห้อง
      rooms[room] = rooms[room].filter((user) => user !== username);
      io.to(room).emit("message", `${username} has left the chat`);
      io.to(room).emit("roomData", { room, users: rooms[room] });
    }

    delete users[socket.id];
    console.log("Client disconnected", socket.id);
  });
});

// เริ่มเซิร์ฟเวอร์
httpServer.listen(3001, () => {
  console.log("Socket.IO server running on port 3001");
});
