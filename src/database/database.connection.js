import { MongoClient } from 'mongodb';
import dotenv from "dotenv";

dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);
export const db = mongoClient.db();
try {
    await mongoClient.connect();
    console.log("MongoDB online");
}
catch (error) {
    console.log(error.message);
}