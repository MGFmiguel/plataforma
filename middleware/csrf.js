const crypto = require("crypto");

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getCsrfToken(request, response, next) {
  if (!request.session.csrfToken) {
    request.session.csrfToken = createToken();
  }
  request.session.save((error) => {
    if (error) return next(error);
    response.json({ csrfToken: request.session.csrfToken });
  });
}

function requireCsrf(request, response, next) {
  const expected = request.session.csrfToken;
  const received = request.get("X-CSRF-Token");
  if (!expected || !received) {
    return response
      .status(403)
      .json({
        error: "Solicitacao invalida. Atualize a pagina e tente novamente.",
      });
  }

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    return response
      .status(403)
      .json({
        error: "Solicitacao invalida. Atualize a pagina e tente novamente.",
      });
  }
  next();
}

module.exports = { createToken, getCsrfToken, requireCsrf };
