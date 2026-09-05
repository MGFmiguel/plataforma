const express = require("express");
const { requireAuth } = require("../middleware/auth");
const database = require("../database/database");

const router = express.Router();
router.use(requireAuth);

router.get("/summary", async (request, response, next) => {
  try {
    const [stats, activities] = await Promise.all([
      database.getStats(),
      database.listActivities(),
    ]);
    response.json({ stats, activities });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
