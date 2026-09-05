const database = require("../database/database");

function hasValidUser(request) {
  return request.session.userId && database.findUserById(request.session.userId);
}

function requireAuth(request, response, next) {
  if (!hasValidUser(request)) {
    request.session.destroy(() => {});
    return response
      .status(401)
      .json({ error: "Sua sessao expirou. Entre novamente." });
  }
  next();
}

function requirePageAuth(request, response, next) {
  if (!hasValidUser(request)) return response.redirect("/");
  next();
}

module.exports = { requireAuth, requirePageAuth };
