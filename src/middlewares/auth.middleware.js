import { db } from "../database/database.connection.js"

export async function authValidation(req, res, next){
    const { authorization } = req.headers;
    const token = authorization?.replace('Bearer ', '');  
    if (!token) return res.status(401).send("Sessão expirada, faça login");
    try{
        const tokenExists = await db.collection("sessions").findOne({ token });
        if (!tokenExists) return res.status(401).send("Você não tem autorização");

        res.locals.tokenExists = tokenExists; 
        res.locals.token = token; 

        next();
    }  
    catch (error){
        return res.status(500).send(error.message);
    }
}   