import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiPort from "../constants/apiPort.js";
import { MongoClient, ObjectId } from 'mongodb';
import { validateSignUp } from "../schemas/signUpSchema.js"
import { validateLogin } from "../schemas/loginSchema.js"

// console.log(apiPort);
const server = express();
server.use(cors());
server.use(express.json())
dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);
const db = mongoClient.db();

try {
    await mongoClient.connect();
    console.log("MongoDB online");
}
catch (error) {
    console.log(error.message);
}

server.post("/cadastro", async (req, res) => {
    const { error, value } = validateSignUp(req.body);
    // console.log(value);

    if (error) return (res.status(422).send(error.details.map(ed => ed.message)));

    try {
        const allUsers = await db.collection("users").find().toArray();
        const userExists = allUsers.find(au => au.username === value.username);
        if (userExists) return res.status(409).send("Usuario ja cadastrado! Tente outro nome!");

        await db.collection("users").insertOne(value);

        return res.status(201).send("Novo usuario cadastrado no banco de dados!");
    }
    catch (error) {
        console.log(error.message);
    }
});

server.post("login", (req, res) => {
    const { error, value } = validateLogin(req.body);

    if (error) return (res.status(422).send(error.details.map(ed => ed.message));


});

server.listen(apiPort, () => console.log(`API running in port ${apiPort}`));