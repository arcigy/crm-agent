import 'dotenv/config';
import { executeAiTool } from '../src/app/actions/executors-ai';
import { verifyExecutionResults } from '../src/app/actions/agent-verifier';

async function main() {
  console.log("=== 🧪 TEST: AI Email Generator ===");
  try {
    const emailRes = await executeAiTool("ai_generate_email", {
      context: [
        { role: "user", content: "Ahoj, kedy mas cas?" },
        { role: "assistant", content: "Cau, tento tyzden mam plno." },
        { role: "user", content: "A buduci pondelok o 14:00?" }
      ],
      instruction: "Suhlas s pondelkom, ale navrhni 15:00"
    });
    
    console.log("Create Email Result:", JSON.stringify(emailRes, null, 2));

    if (emailRes.success && emailRes.data.subject && emailRes.data.body) {
        console.log("✅ AI Email Generator works!");
    } else {
        console.error("❌ AI Email Generator failed structure check.");
    }
  } catch (e) {
      console.error("❌ AI Email Generator Exception:", e);
  }

  console.log("\n=== 🧪 TEST: Verifier ===");
  try {
    const verifyRes = await verifyExecutionResults("Odpovedz mu na email", [
       { tool: "gmail_fetch", status: "success", output: { id: 123 } },
       { tool: "ai_generate_email", status: "success", output: { subject: "Re: Pondelok", body: "Ok..." } },
       { tool: "gmail_reply", status: "success", output: { sent: true } }
    ]);
    console.log("Verifier Result:", JSON.stringify(verifyRes, null, 2));

    if (verifyRes.success && verifyRes.analysis) {
        console.log("✅ Verifier logic works!");
    } else {
        console.error("❌ Verifier failed structure check.");
    }
  } catch (e) {
      console.error("❌ Verifier Exception:", e);
  }

  console.log("\n=== 🧪 TEST: Preparer (Validator) ===");
  try {
      const { validateActionPlan } = await import('../src/app/actions/agent-preparer');
      
      // Scenario 1: Missing Argument (Should fail)
      const invalidPlan = await validateActionPlan(
          "Odpis mu", 
          [{ tool: "gmail_reply", args: { body: "Cau" } }], // Missing threadId
          []
      );
      console.log("Invalid Plan Result:", JSON.stringify(invalidPlan, null, 2));

      if (invalidPlan.valid === false && invalidPlan.questions.length > 0) {
          console.log("✅ Preparer correctly caught missing info!");
      } else {
          console.error("❌ Preparer failed to catch missing info.");
      }

      // Scenario 2: Valid Plan
      const validPlan = await validateActionPlan(
          "Odpis mu",
          [{ tool: "gmail_reply", args: { threadId: "123", body: "Cau" } }],
          []
      );
      
      if (validPlan.valid === true) {
          console.log("✅ Preparer accepted valid plan!");
      } else {
           console.error("❌ Preparer rejected valid plan.");
      }

  } catch (e) {
      console.error("❌ Preparer Exception:", e);
  }

  console.log("\n=== 🧪 TEST: Orchestrator (Planner) ===");
  try {
      const { orchestrateParams } = await import('../src/app/actions/agent-orchestrator');
      
      const plan = await orchestrateParams(
          "Odpis Martinovi ze suhlasim",
          [{ role: "user", content: "Odpis Martinovi ze suhlasim" }]
      );
      
      console.log("Orchestrator Plan:", JSON.stringify(plan, null, 2));

      if (plan.steps && plan.steps.length > 0) {
          console.log("✅ Orchestrator generated a plan!");
          // Check if it includes gmail tools
          const hasGmail = plan.steps.some((s: any) => s.tool.includes("gmail"));
          if (hasGmail) console.log("✅ Plan includes relevant Gmail tools.");
      } else {
          console.error("❌ Orchestrator failed to generate steps.");
      }

      console.log("\n--- Scenario 2: Complex (Email + Calendar + Todo) ---");
      const complexPlan = await orchestrateParams(
        "pozri si poslednu správu od Nováka, a zabookuj mi do calendár termín ktorý uviedol v správe a pridaj mi to aj do todolsitu v ten deň, že mu mám volat",
        []
      );
      console.log("Complex Plan:", JSON.stringify(complexPlan, null, 2));

      console.log("\n--- Orchestrator -> Preparer Handover ---");
      if (complexPlan.steps && complexPlan.steps.length > 0) {
          const { validateActionPlan } = await import('../src/app/actions/agent-preparer');
          const validationResult = await validateActionPlan(
              complexPlan.intent,
              complexPlan.steps,
              [{ role: "user", content: "pozri si poslednu správu od Nováka, a zabookuj mi do calendár termín ktorý uviedol v správe a pridaj mi to aj do todolsitu v ten deň, že mu mám volat" }]
          );
          console.log("Preparer Validation Result:", JSON.stringify(validationResult, null, 2));
          
          if (!validationResult.valid) {
              console.log("✅ Preparer correctly blocked execution due to missing info (???).");
              console.log("❓ Question asked:", validationResult.questions[0]);
          } else {
              console.log("⚠️ Preparer allowed execution (Check if this is intended).");
          }
      }

  } catch (e) {
      console.error("❌ Orchestrator Exception:", e);
  }
}

main();
