import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import { validateSignUp } from "../schemas/signUp.schemas.js";
import { validateLogin } from "../schemas/login.schemas.js";
import { db } from "../database/database.connection.js"

export async function signUp(req, res) {
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
        return res.status(500).send(error.message);
    }
}

export async function signIn(req, res) {
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

        // console.log(`${emailExists._id}History`);
        const userHistory = await db.collection(`${emailExists._id}History`).find().toArray();

        // console.log({ userHistory });

        const sendableObjectToHomePage = {
            token,
            username: emailExists.username,
            userHistory
        }

        // await db.collection("sessions").insertOne({userID: emailExists._id, token});
        await db.collection("sessions").updateOne(
            { userID: emailExists._id },
            { $set: { token } },
            { upsert: true }
        );

        return res.send(sendableObjectToHomePage).status(201);
    }
    catch (error) {
        return res.status(500).send(error.message);
    }


}

export async function logout(req, res) {
    const { authorization } = req.headers;
    const token = authorization?.replace("Bearer ", "");

    if (!token) return res.status(401).send("Sessão expirada, faça login");

    try {
        const tokenExists = await db.collection("sessions").findOne({ token });
        if (!tokenExists) return res.status(401).send("Sessão expirada, faça login");

        await db.collection("sessions").deleteOne({ token })

        res.send("Logout realizado com sucesso");
    }
    catch (error) {
        return res.status(500).send(error.message);
    }
}