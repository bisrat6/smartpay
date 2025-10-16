// Lightweight test for TimeLog pre-save behavior using in-memory MongoDB
// Run: node scripts/test-timelog.js

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

(async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const TimeLog = require("../models/TimeLog");
  const Employee = require("../models/Employee");

  // Create fake employee
  const emp = await Employee.create({
    name: "Test Employee",
    email: `test-${Date.now()}@example.com`,
    userId: new mongoose.Types.ObjectId(),
    companyId: new mongoose.Types.ObjectId(),
    hourlyRate: 10,
  });

  // Create time log with 10 hours duration
  const clockIn = new Date();
  clockIn.setHours(8, 0, 0, 0);
  const clockOut = new Date(clockIn.getTime() + 10 * 3600000); // +10 hours

  const tl = new TimeLog({
    employeeId: emp._id,
    clockIn,
    clockOut,
  });

  await tl.save();

  console.log("Saved TimeLog:");
  console.log({
    duration: tl.duration,
    regularHours: tl.regularHours,
    bonusHours: tl.bonusHours,
  });

  // Expect regularHours = 8, bonusHours = 2

  await mongoose.disconnect();
  await mongod.stop();
})();
