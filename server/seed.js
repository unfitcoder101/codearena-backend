// seed.js — run this once to add sample problems to your database
// Usage: node seed.js

require("dotenv").config();
const mongoose = require("mongoose");
const Problem = require("./models/Problem");
const User = require("./models/User");

const problems = [
  {
    title: "Maximum Element",
    description: "Find the maximum element in an array of integers.",
    difficulty: "Easy",
    tags: ["arrays"],
    inputFormat: "First line: n\nSecond line: n space-separated integers",
    outputFormat: "Single integer — the maximum element",
    constraints: "1 <= n <= 10000, elements between -10000 and 10000",
    sampleInput: "5\n3 1 4 1 5",
    sampleOutput: "5",
    hiddenTestCases: [
      { input: "5\n3 1 4 1 5", expectedOutput: "5" },
      { input: "3\n-1 -5 -2", expectedOutput: "-1" },
      { input: "1\n42", expectedOutput: "42" },
      { input: "4\n0 0 0 0", expectedOutput: "0" },
    ],
  },
  {
    title: "Sum of Array",
    description: "Given an array of n integers, find the sum of all elements.",
    difficulty: "Easy",
    tags: ["arrays", "math"],
    inputFormat: "First line: n\nSecond line: n space-separated integers",
    outputFormat: "Single integer — the sum",
    constraints: "1 <= n <= 10000",
    sampleInput: "4\n1 2 3 4",
    sampleOutput: "10",
    hiddenTestCases: [
      { input: "4\n1 2 3 4", expectedOutput: "10" },
      { input: "3\n-1 -2 -3", expectedOutput: "-6" },
      { input: "1\n0", expectedOutput: "0" },
      { input: "5\n10 20 30 40 50", expectedOutput: "150" },
    ],
  },
  {
    title: "Count Vowels",
    description: "Given a string, count the number of vowels (a, e, i, o, u) in it.",
    difficulty: "Easy",
    tags: ["strings"],
    inputFormat: "A single string (lowercase only)",
    outputFormat: "Single integer — number of vowels",
    constraints: "1 <= length <= 1000",
    sampleInput: "hello",
    sampleOutput: "2",
    hiddenTestCases: [
      { input: "hello", expectedOutput: "2" },
      { input: "aeiou", expectedOutput: "5" },
      { input: "rhythm", expectedOutput: "0" },
      { input: "codearena", expectedOutput: "5" },
    ],
  },
  {
    title: "Fibonacci Number",
    description: "Given n, print the nth Fibonacci number. F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2).",
    difficulty: "Medium",
    tags: ["math", "dynamic-programming"],
    inputFormat: "Single integer n",
    outputFormat: "Single integer — the nth Fibonacci number",
    constraints: "0 <= n <= 30",
    sampleInput: "6",
    sampleOutput: "8",
    hiddenTestCases: [
      { input: "0", expectedOutput: "0" },
      { input: "1", expectedOutput: "1" },
      { input: "6", expectedOutput: "8" },
      { input: "10", expectedOutput: "55" },
      { input: "20", expectedOutput: "6765" },
    ],
  },
  {
    title: "Check Palindrome",
    description: "Given a string, check if it reads the same forwards and backwards. Print YES or NO.",
    difficulty: "Easy",
    tags: ["strings", "two-pointers"],
    inputFormat: "A single string",
    outputFormat: "YES or NO",
    constraints: "1 <= length <= 1000",
    sampleInput: "racecar",
    sampleOutput: "YES",
    hiddenTestCases: [
      { input: "racecar", expectedOutput: "YES" },
      { input: "hello", expectedOutput: "NO" },
      { input: "a", expectedOutput: "YES" },
      { input: "abba", expectedOutput: "YES" },
      { input: "abcd", expectedOutput: "NO" },
    ],
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find the first user to assign as creator
    const user = await User.findOne().lean();
    if (!user) {
      console.log("No users found. Register first then run this script.");
      process.exit(1);
    }

    console.log(`Creating problems as user: ${user.email}`);

    let created = 0;
    for (const problem of problems) {
      // Skip if already exists
      const exists = await Problem.findOne({ title: problem.title });
      if (exists) {
        console.log(`  Skipping "${problem.title}" — already exists`);
        continue;
      }

      await Problem.create({ ...problem, createdBy: user._id });
      console.log(`  Created "${problem.title}"`);
      created++;
    }

    console.log(`\nDone. Created ${created} new problems.`);
    process.exit(0);

  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  }
}

seed();