import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { clients, clientSequences, users } from '@/db/schema';
import { eq, like, and, desc, asc } from 'drizzle-orm';

// Helper function to get current user (authentication detected)
import { getCurrentUser } from '@/lib/auth';

// Helper function to generate client code
async function generateClientCode(clientType: string, testMode: boolean = true): Promise<string> {
  const currentYear = new Date().getFullYear();
  const typePrefix = clientType === 'Individual' ? 'IND' : 'CORP';
  const testPrefix = testMode ? 'TST' : '';
  
  // Get or create sequence record
  const [existingSequence] = await db.select()
    .from(clientSequences)
    .where(and(eq(clientSequences.year, currentYear), eq(clientSequences.type, typePrefix)))
    .limit(1);
  
  let sequenceNumber = 1;
  if (existingSequence) {
    sequenceNumber = existingSequence.lastSeq + 1;
    await db.update(clientSequences)
      .set({ lastSeq: sequenceNumber, updatedAt: new Date().toISOString() })
      .where(eq(clientSequences.id, existingSequence.id));
  } else {
    await db.insert(clientSequences).values({
      year: currentYear,
      type: typePrefix,
      lastSeq: sequenceNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  
  // Format: TST/IND/2025/0001 or TST/CORP/2025/0001
  const sequenceStr = sequenceNumber.toString().padStart(4, '0');
  const testSeparator = testMode ? '/' : '';
  return `${testPrefix}${testSeparator}${typePrefix}/${currentYear}/${sequenceStr}`;
}

// Test data generators
function generateTestClientData(clientType: string, index: number, userId: number) {
  const baseData = {
    clientType,
    cacRcNumber: `TST-${clientType.toUpperCase()}-${Date.now()}${index}`,
    tin: `TST-${Date.now()}${index}`,
    industry: clientType === 'Corporate' ? 'Technology' : 'Individual',
    address: `Test Address ${index}`,
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    website: `https://test${index}.com`,
    kycStatus: 'pending' as const,
    status: 'active' as const,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  if (clientType === 'Corporate') {
    return {
      ...baseData,
      companyName: `Test Corporate Client ${index}`,
    };
  } else {
    return {
      ...baseData,
      companyName: `Test Individual Client ${index}`,
    };
  }
}

// POST endpoint - Create test clients
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    
    const body = await request.json();
    const { count = 10, individualRatio = 0.5 } = body;
    
    // Security check
    if ('userId' in body || 'user_id' in body || 'createdBy' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }
    
    const clientCount = parseInt(count) || 10;
    const individualCount = Math.floor(clientCount * individualRatio);
    const corporateCount = clientCount - individualCount;
    
    const results = {
      created: 0,
      failed: 0,
      details: {
        individuals: { attempted: individualCount, created: 0, codes: [] as string[] },
        corporates: { attempted: corporateCount, created: 0, codes: [] as string[] }
      },
      errors: [] as string[]
    };
    
    // Create individual clients
    for (let i = 0; i < individualCount; i++) {
      try {
        const clientCode = await generateClientCode('Individual', true);
        const clientData = {
          ...generateTestClientData('Individual', i, user.id),
          clientCode
        };
        
        const [createdClient] = await db.insert(clients).values(clientData).returning();
        results.created++;
        results.details.individuals.created++;
        results.details.individuals.codes.push(clientCode);
        
      } catch (error) {
        results.failed++;
        results.errors.push(`Individual ${i}: ${error}`);
      }
    }
    
    // Create corporate clients
    for (let i = 0; i < corporateCount; i++) {
      try {
        const clientCode = await generateClientCode('Corporate', true);
        const clientData = {
          ...generateTestClientData('Corporate', i, user.id),
          clientCode
        };
        
        const [createdClient] = await db.insert(clients).values(clientData).returning();
        results.created++;
        results.details.corporates.created++;
        results.details.corporates.codes.push(clientCode);
        
      } catch (error) {
        results.failed++;
        results.errors.push(`Corporate ${i}: ${error}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Created ${results.created} test clients (failed: ${results.failed})`,
      results,
      clientCodes: {
        individuals: results.details.individuals.codes,
        corporates: results.details.corporates.codes,
        total: results.details.individuals.codes.length + results.details.corporates.codes.length
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('POST test clients error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

// GET endpoint - Validate test clients
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const validateOnly = searchParams.get('validate') === 'true';
    
    // Get test clients
    const testClients = await db.select()
      .from(clients)
      .where(and(
        eq(clients.createdBy, user.id),
        like(clients.clientCode, 'TST/%')
      ))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(clients.createdAt));
    
    if (validateOnly) {
      const validationResults = {
        totalFound: testClients.length,
        formatValid: 0,
        formatInvalid: 0,
        sequenceInfo: {
          individuals: new Set<number>(),
          corporates: new Set<number>(),
          duplicates: [] as string[]
        },
        details: testClients.map(client => {
          const parts = client.clientCode.split('/');
          const isValidFormat = parts.length === 4 && 
            parts[0] === 'TST' && 
            ['IND', 'CORP'].includes(parts[1]) &&
            !isNaN(parseInt(parts[2])) &&
            !isNaN(parseInt(parts[3]));
          
          if (isValidFormat) {
            const sequence = parseInt(parts[3]);
            if (parts[1] === 'IND') {
              validationResults.sequenceInfo.individuals.add(sequence);
            } else {
              validationResults.sequenceInfo.corporates.add(sequence);
            }
          }
          
          return {
            id: client.id,
            clientCode: client.clientCode,
            clientType: client.clientType,
            companyName: client.companyName,
            formatValid: isValidFormat,
            createdAt: client.createdAt
          };
        }).sort((a, b) => a.clientCode.localeCompare(b.clientCode))
      };
      
      validationResults.formatValid = validationResults.details.filter(d => d.formatValid).length;
      validationResults.formatInvalid = validationResults.details.filter(d => !d.formatValid).length;
      
      // Check for duplicates
      const codeCounts: Record<string, number> = {};
      testClients.forEach(client => {
        codeCounts[client.clientCode] = (codeCounts[client.clientCode] || 0) + 1;
      });
      
      validationResults.sequenceInfo.duplicates = Object.entries(codeCounts)
        .filter(([_, count]) => count > 1)
        .map(([code, count]) => code);
      
      return NextResponse.json({
        validation: true,
        summary: {
          total: validationResults.totalFound,
          formatValid: validationResults.formatValid,
          formatInvalid: validationResults.formatInvalid,
          duplicatesFound: validationResults.sequenceInfo.duplicates.length
        },
        sequenceAnalysis: {
          individualSequences: Array.from(validationResults.sequenceInfo.individuals).sort((a, b) => a - b),
          corporateSequences: Array.from(validationResults.sequenceInfo.corporates).sort((a, b) => a - b),
          missingIndividual: [],
          missingCorporate: []
        },
        duplicates: validationResults.sequenceInfo.duplicates,
        details: validationResults.details
      });
    }
    
    return NextResponse.json({
      testClients: testClients.map(client => ({
        id: client.id,
        clientCode: client.clientCode,
        clientType: client.clientType,
        companyName: client.companyName,
        cacRcNumber: client.cacRcNumber,
        tin: client.tin,
        status: client.status,
        createdAt: client.createdAt
      })),
      total: testClients.length,
      limit,
      offset
    });
    
  } catch (error) {
    console.error('GET test clients error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

// DELETE endpoint - Clean up test data
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('id');
    
    if (clientId) {
      // Delete single test client
      const id = parseInt(clientId);
      if (isNaN(id)) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }
      
      // Verify client exists and belongs to user
      const [client] = await db.select()
        .from(clients)
        .where(and(eq(clients.id, id), eq(clients.createdBy, user.id), like(clients.clientCode, 'TST/%')))
        .limit(1);
      
      if (!client) {
        return NextResponse.json({ 
          error: 'Test client not found or does not belong to you',
          code: "CLIENT_NOT_FOUND" 
        }, { status: 404 });
      }
      
      const [deleted] = await db.delete(clients)
        .where(eq(clients.id, id))
        .returning();
      
      return NextResponse.json({
        success: true,
        message: 'Test client deleted successfully',
        deleted: {
          id: deleted.id,
          clientCode: deleted.clientCode,
          companyName: deleted.companyName
        }
      });
      
    } else {
      // Delete all test clients for user
      const testClients = await db.select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.createdBy, user.id), like(clients.clientCode, 'TST/%')));
      
      if (testClients.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No test clients found to delete',
          deleted: 0
        });
      }
      
      const deletedCount = await db.delete(clients)
        .where(and(eq(clients.createdBy, user.id), like(clients.clientCode, 'TST/%')));
      
      // Clean up orphaned sequences
      const currentYear = new Date().getFullYear();
      await db.delete(clientSequences)
        .where(and(eq(clientSequences.year, currentYear), like(clientSequences.type, '%')));
      
      return NextResponse.json({
        success: true,
        message: `Deleted all test clients for user`,
        deleted: testClients.length,
        cleanup: {
          sequences: 'Sequence cleanup attempted',
          userScoped: true
        }
      });
    }
    
  } catch (error) {
    console.error('DELETE test clients error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}