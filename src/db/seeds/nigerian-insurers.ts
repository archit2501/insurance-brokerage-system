import { db } from "@/db";
import { insurers, insurerEmails, insurerLobs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function seedNigerianInsurers() {
  const nigerianInsurers = [
    {
      insurerCode: "INS-LEADWAY-001",
      legalName: "Leadway Assurance Company Limited",
      tradingName: "Leadway Assurance",
      licenseType: "Composite",
      naicomLicenseNo: "INS-001-2020",
      licenseExpiry: "2030-12-31",
      underwritingEmail: "underwriting@leadway.com",
      claimsEmail: "claims@leadway.com",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      insurerCode: "INS-AIICO-002",
      legalName: "AIICO Insurance Plc",
      tradingName: "AIICO",
      licenseType: "Composite",
      naicomLicenseNo: "INS-002-2020",
      licenseExpiry: "2030-12-31",
      underwritingEmail: "underwriting@aiico.com",
      claimsEmail: "claims@aiico.com",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      insurerCode: "INS-AXA-003",
      legalName: "AXA Mansard Insurance Plc",
      tradingName: "AXA Mansard",
      licenseType: "Composite",
      naicomLicenseNo: "INS-003-2020",
      licenseExpiry: "2030-12-31",
      underwritingEmail: "underwriting@axamansard.com",
      claimsEmail: "claims@axamansard.com",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      insurerCode: "INS-NSIA-004",
      legalName: "NSIA Insurance Limited",
      tradingName: "NSIA Insurance",
      licenseType: "Composite",
      naicomLicenseNo: "INS-004-2020",
      licenseExpiry: "2030-12-31",
      underwritingEmail: "underwriting@nsia.com.ng",
      claimsEmail: "claims@nsia.com.ng",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      insurerCode: "INS-CUSTODIAN-005",
      legalName: "Custodian Investment Plc",
      tradingName: "Custodian Insurance",
      licenseType: "Composite",
      naicomLicenseNo: "INS-005-2020",
      licenseExpiry: "2030-12-31",
      underwritingEmail: "underwriting@custodianplc.com.ng",
      claimsEmail: "claims@custodianplc.com.ng",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  console.log("Seeding Nigerian Insurers...");
  
  const createdInsurers = [];
  
  for (const insurer of nigerianInsurers) {
    try {
      const [created] = await db.insert(insurers).values(insurer).returning();
      console.log(`✓ Created Insurer: ${insurer.legalName}`);
      createdInsurers.push(created);
      
      // Add email contacts
      const emails = [
        { insurerId: created.id, emailType: "underwriting", email: insurer.underwritingEmail, isPrimary: true },
        { insurerId: created.id, emailType: "claims", email: insurer.claimsEmail, isPrimary: true }
      ];
      
      for (const email of emails) {
        try {
          await db.insert(insurerEmails).values({
            ...email,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } catch (error: any) {
          if (!error.message?.includes("UNIQUE")) {
            console.error(`  ✗ Failed to add email:`, error.message);
          }
        }
      }
    } catch (error: any) {
      if (error.message?.includes("UNIQUE")) {
        console.log(`⚠ Insurer already exists: ${insurer.legalName}`);
        // Try to get existing insurer
        const [existing] = await db.select().from(insurers).where(eq(insurers.insurerCode, insurer.insurerCode)).limit(1);
        if (existing) createdInsurers.push(existing);
      } else {
        console.error(`✗ Failed to create insurer ${insurer.legalName}:`, error);
      }
    }
  }
  
  // Link all insurers to all LOBs
  console.log("\nLinking insurers to LOBs...");
  const allLobs = await db.select().from(require("@/db/schema").lobs);
  
  for (const insurer of createdInsurers) {
    for (const lob of allLobs) {
      try {
        await db.insert(insurerLobs).values({
          insurerId: insurer.id,
          lobId: lob.id,
          createdAt: new Date().toISOString()
        });
      } catch (error: any) {
        // Ignore duplicate errors
        if (!error.message?.includes("UNIQUE")) {
          console.error(`  ✗ Failed to link ${insurer.legalName} to ${lob.lobName}:`, error.message);
        }
      }
    }
    console.log(`✓ Linked ${insurer.legalName} to all LOBs`);
  }
  
  console.log("\nNigerian Insurer seeding complete!");
}