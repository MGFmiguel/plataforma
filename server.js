const path = require("path");
const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const database = require("./database/database");
const { SqliteSessionStore } = require("./middleware/sqlite-session-store");
const { requirePageAuth } = require("./middleware/auth");

try {
  process.loadEnvFile(".env");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

if (!process.env.SESSION_SECRET) {
  if (isProduction) throw new Error("SESSION_SECRET deve ser definido no ambiente de produção.");
  process.env.SESSION_SECRET = crypto.randomBytes(32).toString("hex");
  console.warn("SESSION_SECRET não definido: usando um segredo temporário para desenvolvimento.");
}
if (isProduction) app.set("trust proxy", 1);

app.disable("x-powered-by");
app.use((request, response, next) => {
  response.set({
    "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  });
  next();
});
app.use(express.json({ limit: "16kb" }));
app.use(
  session({
    store: new SqliteSessionStore(database),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 8,
    },
  }),
);
app.use("/api/auth", require("./routes/auth"));
app.use("/api/dashboard", require("./routes/dashboard"));

app.get(["/dashboard", "/dashboard.html"], requirePageAuth, (request, response) =>
  response.sendFile(path.join(__dirname, "public", "dashboard.html")),
);
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", (request, response) => response.status(404).json({ error: "Rota nao encontrada." }));
app.get("*", (request, response) =>
  response.sendFile(path.join(__dirname, "public", "index.html")),
);

app.use((error, request, response, next) => {
  console.error(error);
  if (response.headersSent) return next(error);
  response.status(500).json({ error: "Ocorreu um erro inesperado. Tente novamente." });
});

if (require.main === module) {
  app.listen(port, () => console.log(`Portal Mamae Margarida em http://localhost:${port}`));
}

module.exports = app;
