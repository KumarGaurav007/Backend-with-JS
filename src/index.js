import dotenv from "dotenv";
dotenv.config()
import connectDB from "./db/db.js"
import app from "./app.js"


connectDB()
    .then(() => {
        const server = app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running  on port ${process.env.PORT}`)
        })
        server.on('error', (error) => {
            console.error("❌ Failed to start server: ", error);
            process.exit(1);
        })
    })
    .catch((err) => {
        console.log("MONGO db connection failed !!! ", err);
        process.exit(1);
    })