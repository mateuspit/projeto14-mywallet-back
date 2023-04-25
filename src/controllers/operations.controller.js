import { validateCashFlow } from "../schemas/cashFlow.schemas.js";
import { db } from "../database/database.connection.js"
import { ObjectId } from "mongodb"

export async function operation(req, res) {
    const type = req.params.tipo;
    // const { authorization } = req.headers;
    // const token = authorization?.replace('Bearer ', '');
    // console.log(type);
    // console.log(authorization);
    // console.log(token);

    // console.log(req.body);
    const token = res.locals.token;
    const { error, value } = validateCashFlow({ ...req.body, type, token });
    if (error) return res.status(422).send(error.details.map(ed => ed.message));
    // if (error) return (res.status(422).send(error.details.map(ed => ed.message)));

    // if (!token) return res.status(401).send("Sessão expirada, faça login");

    try {
        const date = new Date();
        const day = date.getDay();
        const month = date.getMonth();
        const dateDDMM = `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}`;
        // await db.collection(`${tokenExists.userID}History`).insertOne({ amount: value.amount, type: value.type, date: dateDDMM })
        const tokenExists = await db.collection("sessions").findOne({ token })
        const allHistoryUser = await db.collection(`${tokenExists.userID}History`).find().toArray();

        let balance = 0;
        if (value.type.toLowerCase() === "saida") {
            balance -= value.amount;
        }
        else {
            balance += value.amount;
        }
        allHistoryUser.forEach(ahu => {
            if (ahu.type.toLowerCase() === "saida") {
                balance -= ahu.amount;
            }
            else {
                balance += ahu.amount;
            }
        });
        balance = (Math.floor(balance * 100) / 100);

        await db.collection(`${tokenExists.userID}History`).insertOne({ ...value, balance, date: dateDDMM })

        // console.log("chegou aqui");

        // console.log(tokenExists.userID);

        const { username } = await db.collection("users").findOne({ _id: tokenExists.userID });

        // console.log("chegou aqui 2");

        const userHistory = await db.collection(`${tokenExists.userID}History`).find().toArray();

        const sendableObjectToHomePage = {
            token: tokenExists.token,
            username,
            userHistory
        }

        console.log(sendableObjectToHomePage);

        return res.send(sendableObjectToHomePage);
    }
    catch (error) {
        return res.status(500).send(error.message);
    }
}

export async function getOperations(req, res) {
    // const { authorization } = req.headers;
    // const token = authorization?.replace("Bearer ", "");

    // if (!token) return res.status(401).send("Sessão expirada, faça login");

    try {
        // const tokenExists = await db.collection("sessions").findOne({ token });
        // if (!tokenExists) return res.status(401).send("Sessão expirada, faça login");

        // console.log(tokenExists.userID);
        const tokenExists = res.locals.tokenExists;
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
        // const cashFlowWithBalance = cashFlow.map(cf => ({ _id: cf._id, username: username.username, amount: cf.amount, type: cf.type, balance: balance, date: cf.date }))
        const cashFlowWithBalance = {
            token: tokenExists.token,
            username: username.username,
            userHistory: cashFlow.map(cf => ({
              _id: cf._id,
              type: cf.type,
              amount: cf.amount,
              description: cf.description,
              token: cf.token,
              balance: cf.balance,
              date: cf.date
            }))
          }

        // console.log(cashFlowWithOutID.length);
        // console.log(cashFlowWithOutID[0]);
        return res.send(cashFlowWithBalance);
    }
    catch (error) {
        return res.status(500).send(error.message);
    }
}

export async function deleteOperation(req, res) {
    // const { authorization } = req.headers;
    const { operationID } = req.body;
    // const token = authorization?.replace("Bearer ", "");

    // if (!token) return res.status(401).send("Sessão expirada, faça login!");

    try {
        // const tokenExists = await db.collection("sessions").findOne({ token });
        // if (!tokenExists) return res.status(401).send("Sessão expirada, faça login!");

        // const { deletedCount } = await db.collection(`${tokenExists.userID}History`).deleteOne({ operationID });
        const { deletedCount } = await db.collection(`${tokenExists.userID}History`).deleteOne({ _id: new ObjectId(operationID) });

        if (deletedCount) return res.status(201).send("Operação deletada com sucesso!");

        return res.status(200).send("Nada foi deletado");
    }
    catch (error) {
        return res.status(500).send(error.message);
    }
}

export async function chanceOperation(req, res) {
    // const { authorization } = req.headers;
    const type = req.params.tipo;
    // const token = authorization?.replace("Bearer ", "");
    const { operationID } = req.body;

    // console.log(type);
    const { error, value } = validateCashFlow({ ...req.body, type, token });
    if (error) return res.status(422).send(error.details.map(ed => ed.message));

    // if (!token) return res.status(401).send("Faça login!");

    try {
        // const tokenExists = await db.collection("sessions").findOne({ token });

        // if (!tokenExists) return res.status(401).send("Faça login!");



        // await db.collection(`${tokenExists.userID}History`)
        //     .updateOne({ _id: new ObjectId(operationID) }, { $set: { amount: value.amount, description: value.description } });


        const { balance: totalBalance, _id: idLastObject } = await db.collection(`${tokenExists.userID}History`).findOne({}, { sort: { _id: -1 } });
        // console.log("totalBalance: ", totalBalance);
        let newBalance = 0;
        const { amount: amountOperationChanged } = await db.collection(`${tokenExists.userID}History`).findOne({ _id: new ObjectId(operationID) });


        // console.log("value.amount: ", value.amount);
        // console.log("amountOperationChanged: ", amountOperationChanged);

        if (value.type.toLowerCase() === "saida") {
            newBalance = totalBalance - value.amount + amountOperationChanged;
        }
        else {
            // console.log("aqui?")
            newBalance = totalBalance + value.amount - amountOperationChanged;
        }
        // console.log("newBalance: ", newBalance);
        // console.log("idLastObject: ", idLastObject);
        // await db.collection(`${tokenExists.userID}History`).updateOne({ _id: latestDocument._id }, { $set: { balance: newBalance } });

        await db.collection(`${tokenExists.userID}History`)
            .updateOne({ _id: idLastObject }, { $set: { balance: newBalance } });
        await db.collection(`${tokenExists.userID}History`)
            .updateOne({ _id: new ObjectId(operationID) }, { $set: { amount: value.amount, description: value.description } });

        // console.log(updateBalanceResponse);

        res.send("Mudança feita!");
    }
    catch (error) {
        return res.status(500).send(error.message);
    }
}