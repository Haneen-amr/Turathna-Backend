const path = require("path");
const express = require("express");
const { i18next, middleware } = require("../i18n");
const { getTranslation } = require("../i18n/smartTranslate");
const cors = require("cors");
const dotenv = require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});
const dbConnection = require("../config/database");

const app = express();
app.use(middleware.handle(i18next));
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], // Added PATCH
    credentials: true,
  }),
);
dbConnection();

const ApiError = require("../utils/apiError");

// Middlewares
// Helper: translate any string on-demand
app.use((req, res, next) => {
  res.t = async (key, defaultText) => {
    const lang = req.language || "en";
    if (lang === "en") return defaultText; // No need to translate source language

    // Check i18next cache first
    const cached = req.t(key);
    if (cached !== key) return cached; // i18next found it

    // Auto-translate and cache it
    return await getTranslation(key, defaultText, lang);
  };
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/public/uploads", express.static("public/uploads"));
const globalError = require("../middlewares/errorMW");

const morgan = require("morgan"); //for process logging
if (process.env.NODE_ENV == "development") {
  app.use(morgan("dev"));
  console.log(`node: ${process.env.NODE_ENV}`);
}

// Routes
const uiRouter = require("../routes/uiRoutes");
const authRouter = require("../routes/authRoutes");
const userRouter = require("../routes/userRoutes");
const adminRouter = require("../routes/adminRoutes");
const productRouter = require("../routes/productsRoute");

app.use(`${process.env.API_URL}`, uiRouter);
app.use(`${process.env.API_URL}/user`, authRouter);
app.use(`${process.env.API_URL}/user`, userRouter);
app.use(`${process.env.API_URL}/admin`, adminRouter);
app.use(`${process.env.API_URL}/product`, productRouter);

app.all(/(.*)/, (req, res, next) => {
  next(new ApiError(`Can't find this route: ${req.originalUrl}`, 404));
});

app.use(globalError);

//Unhandled Rejectons outside Express
process.on("unhandledRejection", (err) => {
  console.error(`UnhandledRejection Errors: ${err.name} | ${err.message}`);
  server.close(() => {
    console.error("Shutting down...");
    process.exit(1);
  });
});

// Start the Server
const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
