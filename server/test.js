const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("HELLO FROM TEST SERVER");
});

app.listen(5000, () => {
  console.log("TEST SERVER RUNNING ON 5000");
});
