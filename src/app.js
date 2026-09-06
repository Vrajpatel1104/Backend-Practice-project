import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

//Configurations
const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));  
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());


//route imports
import userRoute from './routes/user.route.js';


//route declaration
app.use("/api/v1/users", userRoute);

export default app;