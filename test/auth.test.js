const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
process.env.DATABASE_PATH = path.join(__dirname, "database.test.sqlite");

const app = require("../server");

function sessionCookie(response) {
  return response.headers.get("set-cookie").split(";")[0];
}

test("cadastro, acesso protegido e logout", async () => {
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
    const anonymousCookie = sessionCookie(csrfResponse);
    const { csrfToken } = await csrfResponse.json();
    const email = `teste-${Date.now()}@example.com`;

    const requestWithoutCsrf = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: anonymousCookie },
      body: JSON.stringify({
        name: "Teste Seguro",
        email,
        password: "senha12",
      }),
    });
    assert.equal(requestWithoutCsrf.status, 403);

    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: anonymousCookie,
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        name: "Teste Seguro",
        email,
        password: "senha12",
      }),
    });
    assert.equal(registerResponse.status, 201);
    const registration = await registerResponse.json();
    const authenticatedCookie = sessionCookie(registerResponse);

    const dashboardResponse = await fetch(`${baseUrl}/api/dashboard/summary`, {
      headers: { Cookie: authenticatedCookie },
    });
    assert.equal(dashboardResponse.status, 200);

    const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        Cookie: authenticatedCookie,
        "X-CSRF-Token": registration.csrfToken,
      },
    });
    assert.equal(logoutResponse.status, 200);

    const afterLogout = await fetch(`${baseUrl}/api/dashboard/summary`, {
      headers: { Cookie: authenticatedCookie },
    });
    assert.equal(afterLogout.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
