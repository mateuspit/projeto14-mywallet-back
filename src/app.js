import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiPort from "../constants/apiPort.js";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import { MongoClient, ObjectId } from 'mongodb';
import { validateSignUp } from "../schemas/signUpSchema.js";
import { validateLogin } from "../schemas/loginSchema.js";
import { validateCashFlow } from "../schemas/cashFlowSchema.js";

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
    const { username, email, password } = value;
    const cryptPassword = bcrypt.hashSync(password, 10)

    if (error) return (res.status(422).send(error.details.map(ed => ed.message)));

    try {
        const userExists = await db.collection("users").findOne({ email });
        if (userExists) return res.status(409).send("Usuario ja cadastrado! Tente outro nome!");

        await db.collection("users").insertOne({ username, email, password: cryptPassword });

        return res.status(201).send("Novo usuario cadastrado no banco de dados!");
    }
    catch (error) {
        return console.log(error.message);
    }
});

server.post("/signIn", async (req, res) => {
    const { error, value } = validateLogin(req.body);
    const { email, password } = value;
    // console.log(value);

    if (error) return (res.status(422).send(error.details.map(ed => ed.message)));
    try {
        const emailExists = await db.collection("users").findOne({ email });
        // console.log(emailExists);
        if (!emailExists) return (res.status(404).send("Email não cadastrado, confira o email digitado"));

        if (!bcrypt.compareSync(password, emailExists.password)) return (res.status(401).send("Senha invalida"));

        const token = uuid();

        // await db.collection("sessions").insertOne({userID: emailExists._id, token});
        await db.collection("sessions").updateOne(
            { userID: emailExists._id },
            { $set: { token } },
            { upsert: true }
        );

        return res.send(token).status(201);
    }
    catch (error) {
        console.log(error.message);
    }


});

server.post("/nova-transacao/:tipo", async (req, res) => {
    const type = req.params.tipo;
    const { authorization } = req.headers;
    const token = authorization?.replace('Bearer ', '');

    const { error, value } = validateCashFlow({ ...req.body, type, token });

    if (error) return res.status(422).send(error.details.map(ed => ed.message));
    // if (error) return (res.status(422).send(error.details.map(ed => ed.message)));

    if (!token) return res.status(401).send("Sessão inspirada, faça login");

    try {
        const tokenExists = await db.collection("sessions").findOne({ token });

        if (!tokenExists) return res.status(401).send("Você não tem autorização");

        await db.collection(`${tokenExists.userID}History`).insertOne({ amount: value.amount, type: value.type })

        const allHistoryUser = await db.collection(`${tokenExists.userID}History`).find().toArray();

        let balance = 0;
        allHistoryUser.forEach(ahu => {
            if (ahu.type.toLowerCase() === "saida") {
                balance -= ahu.amount
            }
            else {
                balance += ahu.amount;
            }
            console.log(`operação de ${ahu.type.toLowerCase()}: ${ahu.amount}`)
        });
        balance = (Math.floor(balance * 100) / 100);

        return res.send({ ...value, balance });
    }
    catch (error) {
        console.log(error.message);
    }
});

server.listen(apiPort, () => console.log(`API running in port ${apiPort}`));