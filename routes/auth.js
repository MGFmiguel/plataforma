const express = require("express");
const bcrypt = require("bcryptjs");
const database = require("../database/database");
const {
  createToken,
  getCsrfToken,
  requireCsrf,
} = require("../middleware/csrf");
const { createRateLimit } = require("../middleware/rate-limit");

const router = express.Router();

const loginLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message:
    "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
});
const registerLimit = createRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message:
    "Muitos cadastros a partir deste endereco. Tente novamente mais tarde.",
});

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function validateRegistration(name, email, password) {
  const normalizedName = String(name || "").trim();
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = String(password || "");
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  if (normalizedName.length < 2 || normalizedName.length > 100)
    return { error: "Informe um nome entre 2 e 100 caracteres." };
  if (!validEmail || normalizedEmail.length > 254)
    return { error: "Informe um email valido." };
  if (normalizedPassword.length < 6 || normalizedPassword.length > 8)
    return { error: "A senha deve ter entre 6 e 8 caracteres." };
  return { normalizedName, normalizedEmail, normalizedPassword };
}

function createAuthenticatedSession(request, userId) {
  return new Promise((resolve, reject) => {
    request.session.regenerate((error) => {
      if (error) return reject(error);
      request.session.userId = userId;
      request.session.csrfToken = createToken();
      request.session.save((saveError) =>
        saveError ? reject(saveError) : resolve(request.session.csrfToken),
      );
    });
  });
}

router.get("/csrf", getCsrfToken);

router.post(
  "/login",
  loginLimit,
  requireCsrf,
  async (request, response, next) => {
    try {
      const { email, password } = request.body;
      const user = await database.findUserByEmail(normalizeEmail(email));
      if (
        !user ||
        !(await bcrypt.compare(String(password || ""), user.password))
      ) {
        return response
          .status(401)
          .json({ error: "Email ou senha incorretos." });
      }
      const csrfToken = await createAuthenticatedSession(request, user.id);
      response.json({
        user: { id: user.id, name: user.name, email: user.email },
        csrfToken,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/register",
  registerLimit,
  requireCsrf,
  async (request, response, next) => {
    const { name, email, password } = request.body;
    const validation = validateRegistration(name, email, password);
    if (validation.error)
      return response.status(400).json({ error: validation.error });

    try {
      const result = await database.createUser(
        validation.normalizedName,
        validation.normalizedEmail,
        await bcrypt.hash(validation.normalizedPassword, 12),
      );
      const csrfToken = await createAuthenticatedSession(
        request,
        result.lastInsertRowid,
      );
      response
        .status(201)
        .json({
          user: await database.findUserById(result.lastInsertRowid),
          csrfToken,
        });
    } catch (error) {
      if (
        String(error.code).includes("SQLITE_CONSTRAINT") ||
        error.code === "23505"
      ) {
        return response
          .status(409)
          .json({ error: "Este email ja esta cadastrado." });
      }
      next(error);
    }
  },
);

router.post("/logout", requireCsrf, (request, response, next) => {
  request.session.destroy((error) => {
    if (error) return next(error);
    response.clearCookie("connect.sid");
    response.json({ ok: true });
  });
});

router.get("/me", async (request, response, next) => {
  try {
    const user = request.session.userId
      ? await database.findUserById(request.session.userId)
      : null;
    response.json({ user: user || null });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
