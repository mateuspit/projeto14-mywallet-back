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

    if (!token) return res.status(401).send("Sessão expirada, faça login");

    try {
        const tokenExists = await db.collection("sessions").findOne({ token });

        if (!tokenExists) return res.status(401).send("Você não tem autorização");

        const date = new Date();
        const day = date.getDay();
        const month = date.getMonth();
        const dateDDMM = `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}`;
        await db.collection(`${tokenExists.userID}History`).insertOne({ amount: value.amount, type: value.type, date: dateDDMM })

        const allHistoryUser = await db.collection(`${tokenExists.userID}History`).find().toArray();

        let balance = 0;
        allHistoryUser.forEach(ahu => {
            if (ahu.type.toLowerCase() === "saida") {
                balance -= ahu.amount
            }
            else {
                balance += ahu.amount;
            }
        });
        balance = (Math.floor(balance * 100) / 100);


        return res.send({ ...value, balance, date: dateDDMM });
    }
    catch (error) {
        return console.log(error.message);
    }
});

server.get("/transacoes", async (req, res) => {
    const { authorization } = req.headers;
    const token = authorization?.replace("Bearer ", "");

    if (!token) return res.status(401).send("Sessão expirada, faça login");

    try {
        const tokenExists = await db.collection("sessions").findOne({ token });
        if (!tokenExists) return res.status(401).send("Sessão expirada, faça login");

        // console.log(tokenExists.userID);
        const userID = tokenExists.userID;
        // const username = await db.collection("users").findOne(_id: userID);
        const username = await db.collection("users").findOne({ _id: new ObjectId(userID) });
        const cashFlow = await db.collection(`${tokenExists.userID}History`).find().toArray();
        // console.log(cashFlow);
        let balance = 0;
        cashFlow.forEach(cf => {
            if (cf.type.toLowerCase() === "saida") {
                balance -= cf.amount
            }
            else {
                balance += cf.amount;
            }
            // console.log(`operação de ${cf.type.toLowerCase()}: ${cf.amount}`)
        });
        balance = (Math.floor(balance * 100) / 100);
        const cashFlowWithBalance = cashFlow.map(cf => ({ _id: cf._id, username: username.username, amount: cf.amount, type: cf.type, balance: balance, date: cf.date }))

        // console.log(cashFlowWithOutID.length);
        // console.log(cashFlowWithOutID[0]);
        return res.send(cashFlowWithBalance.reverse());
    }
    catch (error) {
        return console.log(error.message);
    }
});

server.put("/logout", async (req, res) => {
    const { authorization } = req.headers;
    const token = authorization?.replace("Bearer ", "");

    if (!token) return res.status(401).send("Sessão expirada, faça login");

    try {
        const tokenExists = await db.collection("sessions").findOne({ token });
        if (!tokenExists) return res.status(401).send("Sessão expirada, faça login");

        await db.collection("sessions").updateOne({ token }, { $set: { token: uuid() } })

        res.send("Logout realizado com sucesso");
    }
    catch (error) {
        return console.log(error.message);
    }
});

server.delete("/delete", async (req, res) => {
    const { authorization } = req.headers;
    const { operationID } = req.body;
    const token = authorization?.replace("Bearer ", "");

    if (!token) return res.status(401).send("Sessão expirada, faça login!");

    try {
        const tokenExists = await db.collection("sessions").findOne({ token });
        if (!tokenExists) return res.status(401).send("Sessão expirada, faça login!");

        // const { deletedCount } = await db.collection(`${tokenExists.userID}History`).deleteOne({ operationID });
        const { deletedCount } = await db.collection(`${tokenExists.userID}History`).deleteOne({ _id: new ObjectId(operationID) });

        if (deletedCount) return res.status(201).send("Operação deletada com sucesso!");

        return res.status(200).send("Nada foi deletado");
    }
    catch (error) {
        return console.log("catch: ", error.message);
    }
});

server.listen(apiPort, () => console.log(`API running in port ${apiPort}`));

// function giveBalance(allHistory) {
//     let balance = 0;
//     allHistory.forEach(ah => {
//         if (ah.type.toLowerCase() === "saida") {
//             balance -= ah.amount
//         }
//         else {
//             balance += ah.amount;
//         }
//     });
//     console.log(`operação de ${ah.type.toLowerCase()}: ${ah.amount}`)
//     return (Math.floor(balance * 100) / 100);
// }