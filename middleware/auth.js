const database = require("../database/database");

async function hasValidUser(request) {
  return request.session.userId && (await database.findUserById(request.session.userId));
}

async function requireAuth(request, response, next) {
  try {
    if (!(await hasValidUser(request))) {
      request.session.destroy(() => {});
      return response
        .status(401)
        .json({ error: "Sua sessao expirou. Entre novamente." });
    }
    next();
  } catch (error) {
    next(error);
  }
}

async function requirePageAuth(request, response, next) {
  try {
    if (!(await hasValidUser(request))) return response.redirect("/");
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { requireAuth, requirePageAuth };
