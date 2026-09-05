const express = require("express");
const { requireAuth } = require("../middleware/auth");
const database = require("../database/database");

const router = express.Router();
router.use(requireAuth);

router.get("/summary", (request, response) => {
  response.json({
    stats: database.getStats(),
    activities: database.listActivities(),
  });
});

module.exports = router;
