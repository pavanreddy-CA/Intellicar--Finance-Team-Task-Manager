import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const departments = [
  "SW - Engineering",
  "Manufacturing and Supply Chain",
  "Field Operations Technicians",
  "HW - Engineering",
  "Operations",
  "CSM & Sales",
  "Finance",
  "HR and Admin",
  "External People"
];

const departmentsStr = departments.join(",");

// Default matrix: all departments with TASKS=false, REQUESTS=true, LEARNING=false
// Finance gets TASKS=true and LEARNING=true
const defaultMatrix = departments.map(dept => ({
  department: dept,
  tasks: dept === "Finance",
  requests: true,
  learning: dept === "Finance"
}));

const matrixJson = JSON.stringify(defaultMatrix);

async function run() {
  try {
    // Check if SystemSettings row exists
    const existing = await sql`SELECT id FROM "SystemSettings" LIMIT 1`;

    if (existing.length === 0) {
      // Insert new row
      await sql`
        INSERT INTO "SystemSettings" ("masterDepartments", "matrixModuleAccess")
        VALUES (${departmentsStr}, ${matrixJson})
      `;
      console.log("Created new SystemSettings row with departments and matrix.");
    } else {
      // Update existing row
      await sql`
        UPDATE "SystemSettings"
        SET 
          "masterDepartments" = ${departmentsStr},
          "matrixModuleAccess" = ${matrixJson}
        WHERE id = ${existing[0].id}
      `;
      console.log("Updated SystemSettings with new departments and matrix.");
    }

    console.log("\nDepartments updated:");
    departments.forEach((d, i) => console.log(`  ${i + 1}. ${d}`));

    console.log("\nMatrix module updated for all departments.");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

run();
