const path = require("path");
const cron = require("node-cron");
const { spawn } = require("child_process");

function runNodeScript(relativeScriptPath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "..", relativeScriptPath);
    const child = spawn(process.execPath, [scriptPath], {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${relativeScriptPath} termino con codigo ${code}`));
    });
  });
}

async function runPipeline() {
  console.log("[scheduler] Ejecutando pipeline de prospeccion...");
  await runNodeScript(path.join("scripts", "generateProspects.js"));
  await runNodeScript(path.join("scripts", "sendEmails.js"));
}

cron.schedule("0 9 */2 * *", async () => {
  try {
    await runPipeline();
  } catch (error) {
    console.error(`[scheduler] Error: ${error.message}`);
  }
});

console.log("[scheduler] Scheduler corriendo. Frecuencia: cada 2 dias a las 09:00.");
