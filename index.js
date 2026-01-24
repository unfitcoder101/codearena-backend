require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");

const PORT = 4000;   // we keep 4000

connectDB();

app.listen(PORT, () => {
  console.log(`CodeArena backend running on http://127.0.0.1:${PORT}`);
});
