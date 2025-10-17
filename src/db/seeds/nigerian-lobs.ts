import { db } from "@/db";
import { lobs } from "@/db/schema";

export async function seedNigerianLOBs() {
  const nigerianLOBs = [
    {
      lobCode: "LOB-MOTOR-001",
      lobName: "Motor Insurance",
      lobDescription: "Comprehensive motor vehicle insurance including third-party, fire, and theft",
      defaultBrokeragePercent: 12.5,
      defaultVatPercent: 7.5,
      rateBasis: "Sum Insured",
      minPremium: 5000,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      lobCode: "LOB-FIRE-002",
      lobName: "Fire & Special Perils",
      lobDescription: "Fire insurance and special perils coverage for property",
      defaultBrokeragePercent: 15.0,
      defaultVatPercent: 7.5,
      rateBasis: "Sum Insured",
      minPremium: 10000,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      lobCode: "LOB-GA-003",
      lobName: "General Accident",
      lobDescription: "Personal accident and liability insurance",
      defaultBrokeragePercent: 10.0,
      defaultVatPercent: 7.5,
      rateBasis: "Sum Insured",
      minPremium: 3000,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      lobCode: "LOB-MARINE-004",
      lobName: "Marine Insurance",
      lobDescription: "Marine cargo and hull insurance",
      defaultBrokeragePercent: 12.0,
      defaultVatPercent: 7.5,
      rateBasis: "Sum Insured",
      minPremium: 15000,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      lobCode: "LOB-ENG-005",
      lobName: "Engineering",
      lobDescription: "Engineering and contractors all risks insurance",
      defaultBrokeragePercent: 10.0,
      defaultVatPercent: 7.5,
      rateBasis: "Sum Insured",
      minPremium: 20000,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      lobCode: "LOB-BOND-006",
      lobName: "Bonds & Guarantees",
      lobDescription: "Performance bonds and bid bonds",
      defaultBrokeragePercent: 8.0,
      defaultVatPercent: 7.5,
      rateBasis: "Sum Insured",
      minPremium: 5000,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      lobCode: "LOB-LIFE-007",
      lobName: "Life Assurance",
      lobDescription: "Life insurance and endowment policies",
      defaultBrokeragePercent: 5.0,
      defaultVatPercent: 7.5,
      rateBasis: "Premium",
      minPremium: 2000,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      lobCode: "LOB-HEALTH-008",
      lobName: "Health Insurance",
      lobDescription: "Health maintenance organizations and medical insurance",
      defaultBrokeragePercent: 10.0,
      defaultVatPercent: 7.5,
      rateBasis: "Premium",
      minPremium: 8000,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  console.log("Seeding Nigerian LOBs...");
  
  for (const lob of nigerianLOBs) {
    try {
      await db.insert(lobs).values(lob);
      console.log(`✓ Created LOB: ${lob.lobName}`);
    } catch (error: any) {
      if (error.message?.includes("UNIQUE")) {
        console.log(`⚠ LOB already exists: ${lob.lobName}`);
      } else {
        console.error(`✗ Failed to create LOB ${lob.lobName}:`, error);
      }
    }
  }
  
  console.log("Nigerian LOB seeding complete!");
}