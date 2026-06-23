const router = require("express").Router();

router.post("/test", (req, res) => {
  console.log("POST /api/test HIT");
  res.send("API HIT SUCCESSFULLY");
});

module.exports = router;
