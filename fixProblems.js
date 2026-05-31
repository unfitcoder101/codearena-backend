require("dotenv").config();
const mongoose = require("mongoose");
const Problem = require("./models/Problem");

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected");

  const result = await Problem.updateMany(
    { isPublic: { $ne: true } },
    { $set: { isPublic: true } }
  );

  console.log(`Fixed ${result.modifiedCount} problems`);
  process.exit(0);
}

fix();
