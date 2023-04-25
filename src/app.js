import express from "express";
import cors from "cors";
import apiPort from "./constants/apiPort.js";
import router from "./routes/index.routes.js";

const server = express();
server.use(cors());
server.use(express.json())
server.use(router)

server.listen(process.env.PORT, () => {
    console.log("Server running on port " + process.env.PORT);
});