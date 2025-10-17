import { seedNigerianLOBs } from "./nigerian-lobs";
import { seedNigerianInsurers } from "./nigerian-insurers";

async function runSeeds() {
  console.log("🌱 Starting database seeding...\n");
  
  try {
    // Seed LOBs first (insurers reference LOBs)
    await seedNigerianLOBs();
    console.log("");
    
    // Then seed insurers
    await seedNigerianInsurers();
    
    console.log("\n✅ All seeds completed successfully!");
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runSeeds().then(() => process.exit(0));
}

export { runSeeds };