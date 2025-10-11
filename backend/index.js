const express = require("express")
const app = express();
const cookieParser = require('cookie-parser')
const cors = require('cors');
const path = require('path');
require("dotenv").config();

// MIDDLEWARE
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});
// Allow requests from all origins with credentials
app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Serve generated certificates (saved PDFs)
app.use('/generated_certificates', express.static(path.join(__dirname, 'generated_certificates')));

// ROUTES
const authenticationRouter = require("./routers/authentication")
app.use("/authentication", authenticationRouter)

const candidateRouter = require("./routers/candidate")
const feedbackRouter = require("./routers/feedback")
const groupRouter = require("./routers/group")
const workRouter = require("./routers/work")

app.use("/candidate", candidateRouter);
app.use("/feedback", feedbackRouter);
app.use("/group", groupRouter);
app.use("/work", workRouter);

// ERRORs
// Catch-all for unmapped routes -> return proper 404 status
app.use((req, res, next) => {
    res.status(404).send("ERROR 404");
})

// ERROR HANDLERS
app.use((error, req, res, next) => {
    res.status(error.status ?? 404).send({ status: error.status ?? 404, error: error.message });
});

// SERVER
const port = process.env.PORT ?? 2324;
const databaseConnection = require("./database/connect")
databaseConnection.then((mongoose) => {
    mongoose.set('debug', true) // enable logging collection methods + arguments to the console/file

    console.log("Model Names: ", mongoose.modelNames())
    app.listen(port, () => {
        console.log("http://localhost:" + port);
    })
}).catch((error) => {
    console.log("Problem TO Connect With Database")
})