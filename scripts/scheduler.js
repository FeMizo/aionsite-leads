const cron = require("node-cron");
const { exec } = require("child_process");

// Cada 2 días a las 9:00 AM
cron.schedule("0 9 */2 * *", () => {
  console.log("Ejecutando envío de prospectos...");
  exec("node scripts/sendEmails.js", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(stdout);
  });
});

console.log("Scheduler corriendo...");
