import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

export const connectDB = async () => {
  try {
    const dbInstance = await mongoose.connect(
      `${process.env.MONGO_DB_URI}/${DB_NAME}`
    );
    console.log("Connected to MongoDB");
  } catch (error) {
    console.log("MongoDB connection Error: ", error);
  }
};
