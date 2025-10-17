import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { clients, clientSequences, users } from '@/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';

function getCurrentYear(): number {
  return new Date().getFullYear();
}

function formatClientCode(sequence: number, year: number): string {
  const paddedSequence = sequence.toString().padStart(5, '0');
  return `MEIBL/CL/${year}/${paddedSequence}`;
}

async function generateNextClientCode(): Promise<string> {
  const currentYear = getCurrentYear();
  const type = null; // Phase 1: no client type
  
  return await db.transaction(async (tx) => {
    const existingSequence = await tx.select()
      .from(clientSequences)
      .where(and(
        eq(clientSequences.year, currentYear), 
        sql`${clientSequences.type} IS NULL`
      ))
      .limit(1);
    
    let nextSequence: number;
    const now = new Date().toISOString();
    
    if (existingSequence.length > 0) {
      nextSequence = existingSequence[0].lastSeq + 1;
      
      await tx.update(clientSequences)
        .set({ 
          lastSeq: nextSequence, 
          updatedAt: now
        })
        .where(and(
          eq(clientSequences.year, currentYear), 
          sql`${clientSequences.type} IS NULL`
        ));
    } else {
      nextSequence = 1;
      await tx.insert(clientSequences)
        .values({
          year: currentYear,
          type: type,
          lastSeq: nextSequence,
          createdAt: now,
          updatedAt: now
        });
    }
    
    return formatClientCode(nextSequence, currentYear);
  });
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-user-id');
    if (!authHeader || isNaN(parseInt(authHeader))) {
      return NextResponse.json({ 
        error: "Valid x-user-id header is required",
        code: "AUTH_HEADER_REQUIRED" 
      }, { status: 401 });
    }
    
    const userId = parseInt(authHeader);
    const searchParams = request.nextUrl.searchParams;
    const preview = searchParams.get('preview') === 'true';
    const count = parseInt(searchParams.get('count') || '1');
    const includeYearEnd = searchParams.get('includeYearEnd') === 'true';
    
    if (isNaN(count) || count < 1 || count > 10) {
      return NextResponse.json({ 
        error: "Count must be between 1 and 10",
        code: "INVALID_COUNT" 
      }, { status: 400 });
    }
    
    const currentYear = getCurrentYear();
    const previews: { currentYear?: number, clientCodes: string[] } = { currentYear, clientCodes: [] };
    
    if (preview) {
      const sequenceData = await db.select()
        .from(clientSequences)
        .where(eq(clientSequences.year, currentYear))
        .limit(1);
      
      const lastSequence = sequenceData.length > 0 ? sequenceData[0].lastSeq : 0;
      
      for (let i = 1; i <= count; i++) {
        previews.clientCodes.push(formatClientCode(lastSequence + i, currentYear));
      }
      
      return NextResponse.json({
        testType: 'sequence_preview',
        currentYear,
        count,
        lastSequence,
        generatedCodes: previews.clientCodes
      });
    } else {
      const generatedCodes: string[] = [];
      
      for (let i = 0; i < count; i++) {
        const code = await generateNextClientCode();
        generatedCodes.push(code);
      }
      
      const sequenceData = await db.select()
        .from(clientSequences)
        .where(and(eq(clientSequences.year, currentYear), eq(clientSequences.type, null)))
        .limit(1);
      
      const finalSequence = sequenceData.length > 0 ? sequenceData[0].lastSeq : 0;
      
      if (includeYearEnd) {
        const nextCode = await generateNextClientCode();
        
        return NextResponse.json({
          testType: 'sequence_generation',
          currentYear,
          count,
          generatedCodes,
          nextCode,
          finalSequence: finalSequence,
          transactionTest: 'completed'
        });
      }
      
      return NextResponse.json({
        testType: 'sequence_generation',
        currentYear,
        count,
        generatedCodes,
        finalSequence,
        transactionTest: 'completed'
      });
    }
  } catch (error) {
    console.error('Test sequence generation error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-user-id');
    if (!authHeader || isNaN(parseInt(authHeader))) {
      return NextResponse.json({ 
        error: "Valid x-user-id header is required",
        code: "AUTH_HEADER_REQUIRED" 
      }, { status: 401 });
    }
    
    const userId = parseInt(authHeader);
    const { companyName, cacRcNumber, tin, industry, address, city, state, country } = await request.json();
    
    const missingFields = [];
    if (!companyName) missingFields.push('companyName');
    if (!cacRcNumber) missingFields.push('cacRcNumber');
    if (!tin) missingFields.push('tin');
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: "Missing required fields",
        code: "MISSING_REQUIRED_FIELDS",
        fields: missingFields 
      }, { status: 400 });
    }
    
    const userExists = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (userExists.length === 0) {
      return NextResponse.json({ 
        error: "User not found",
        code: "USER_NOT_FOUND" 
      }, { status: 404 });
    }
    
    const existingClient = await db.select()
      .from(clients)
      .where(or(eq(clients.cacRcNumber, cacRcNumber), eq(clients.tin, tin)))
      .limit(1);
    
    if (existingClient.length > 0) {
      return NextResponse.json({ 
        error: "Client with this CAC/RC number or TIN already exists",
        code: "CLIENT_EXISTS" 
      }, { status: 409 });
    }
    
    const clientCode = await generateNextClientCode();
    
    const newClientData = {
      clientCode,
      companyName: companyName.trim(),
      cacRcNumber: cacRcNumber.trim(),
      tin: tin.trim(),
      industry: industry?.trim() || null,
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      country: country?.trim() || 'Nigeria',
      kycStatus: 'pending',
      status: 'active',
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const newClient = await db.insert(clients)
      .values(newClientData)
      .returning();
    
    const sequenceData = await db.select()
      .from(clientSequences)
      .where(and(eq(clientSequences.year, getCurrentYear()), eq(clientSequences.type, null)))
      .limit(1);
    
    return NextResponse.json({
      testType: 'client_creation_with_sequence',
      createdClient: {
        id: newClient[0].id,
        clientCode: newClient[0].clientCode,
        companyName: newClient[0].companyName
      },
      sequenceInfo: {
        currentYear: getCurrentYear(),
        lastSequence: sequenceData.length > 0 ? sequenceData[0].lastSeq : 0
      },
      timestamp: new Date().toISOString()
    }, { status: 201 });
  } catch (error) {
    console.error('Test client creation error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}