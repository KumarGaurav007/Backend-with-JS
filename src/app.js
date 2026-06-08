import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,    // middleware for cross origin resourse sharing
}));

app.use(express.json({
    limit: "16kb",              // middleware for data sharing in json format  with limit upto 16kb
    credential: true,
}))

app.use(express.urlencoded({
    limit: "16kb",              // middleware for data sharing in urls with limit 
    extended: true,
}))

app.use(express.static("public"))   // middleware for storing static asset in server

app.use(cookieParser())    // midddleware used to deal with users browser's cookies from server


import userRouter from "./routes/user.routes.js"

app.use("/api/v1/users", userRouter)

export default app;