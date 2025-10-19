import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { clients, centralizedSequences as sequences } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Step 1: Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
      console.log('Debug: Request body parsed successfully:', JSON.stringify(requestBody, null, 2));
    } catch (error) {
      console.error('Debug: Failed to parse request body:', error);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 400 });
    }

    // Step 2: Validate required fields
    const { companyName, cacRcNumber, tin } = requestBody;
    const errors: string[] = [];

    if (!companyName || typeof companyName !== 'string' || companyName.trim() === '') {
      errors.push('companyName is required and must be a non-empty string');
    }

    if (!cacRcNumber || typeof cacRcNumber !== 'string' || cacRcNumber.trim() === '') {
      errors.push('cacRcNumber is required and must be a non-empty string');
    }

    if (!tin || typeof tin !== 'string' || tin.trim() === '') {
      errors.push('tin is required and must be a non-empty string');
    }

    if (errors.length > 0) {
      console.error('Debug: Validation errors:', errors);
      return NextResponse.json({ 
        error: 'Validation failed',
        code: 'VALIDATION_FAILED',
        details: errors
      }, { status: 400 });
    }

    // Step 3: Check if CAC RC number already exists
    console.log('Debug: Checking CAC RC number uniqueness:', cacRcNumber);
    const existingCac = await db.select()
      .from(clients)
      .where(eq(clients.cacRcNumber, cacRcNumber))
      .limit(1);

    if (existingCac.length > 0) {
      console.error('Debug: CAC RC number already exists');
      return NextResponse.json({ 
        error: 'A client with this CAC RC number already exists',
        code: 'CAC_EXISTS',
        existingClientId: existingCac[0].id
      }, { status: 400 });
    }

    // Step 4: Check if TIN already exists
    console.log('Debug: Checking TIN uniqueness:', tin);
    const existingTin = await db.select()
      .from(clients)
      .where(eq(clients.tin, tin))
      .limit(1);

    if (existingTin.length > 0) {
      console.error('Debug: TIN already exists');
      return NextResponse.json({ 
        error: 'A client with this TIN already exists',
        code: 'TIN_EXISTS',
        existingClientId: existingTin[0].id
      }, { status: 400 });
    }

    // Step 5: Get current year for sequence generation
    const currentYear = new Date().getFullYear();
    console.log('Debug: Current year for sequence:', currentYear);

    // Step 6: Generate sequence using centralized system
    let nextSeq = 1;
    try {
      // Check if sequence exists for current year
      const existingSequence = await db.select()
        .from(sequences)
        .where(and(eq(sequences.entity, 'client'), eq(sequences.year, currentYear)))
        .limit(1);

      console.log('Debug: Existing sequence query result:', JSON.stringify(existingSequence, null, 2));

      if (existingSequence.length === 0) {
        console.log('Debug: Creating new sequence for client in year:', currentYear);
        // Create new sequence for this year
        const newSequence = await db.insert(sequences)
          .values({
            entity: 'client',
            year: currentYear,
            lastSeq: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          .returning();
        
        console.log('Debug: New sequence created:', JSON.stringify(newSequence, null, 2));
        nextSeq = 1;
      } else {
        // Increment existing sequence
        const currentLast = existingSequence[0].lastSeq;
        nextSeq = currentLast + 1;
        console.log('Debug: Incrementing sequence from', currentLast, 'to', nextSeq);

        const updatedSequence = await db.update(sequences)
          .set({ 
            lastSeq: nextSeq,
            updatedAt: new Date().toISOString()
          })
          .where(and(eq(sequences.entity, 'client'), eq(sequences.year, currentYear)))
          .returning();
        
        console.log('Debug: Sequence updated:', JSON.stringify(updatedSequence, null, 2));
      }
    } catch (sequenceError) {
      console.error('Debug: Sequence generation error:', sequenceError);
      return NextResponse.json({ 
        error: 'Failed to generate sequence number',
        code: 'SEQUENCE_ERROR',
        details:sequenceError instanceof Error ? sequenceError.message : 'Unknown sequence error'
      }, { status: 500 });
    }

    // Step 7: Generate client code
    const clientCode = `CL/${currentYear}/${String(nextSeq).padStart(6, '0')}`;
    console.log('Debug: Generated client code:', clientCode);

    // Step 8: Prepare insert data with proper field mapping
    const insertData = {
      clientCode,
      companyName: companyName.trim(),
      cacRcNumber: cacRcNumber.trim(),
      tin: tin.trim(),
      industry: requestBody.industry?.trim() || null,
      address: requestBody.address?.trim() || null,
      city: requestBody.city?.trim() || null,
      state: requestBody.state?.trim() || null,
      country: requestBody.country?.trim() || 'Nigeria',
      website: requestBody.website?.trim() || null,
      kycStatus: 'pending',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('Debug: Prepared insert data with all fields:', JSON.stringify(insertData, null, 2));
    console.log('Debug: Insert data field types:');
    Object.entries(insertData).forEach(([key, value]) => {
      console.log(`  ${key}: ${typeof value} = ${JSON.stringify(value)}`);
    });

    // Step 9: Insert the client record
    let insertedClient;
    try {
      console.log('Debug: Attempting to insert client record...');
      const insertResult = await db.insert(clients)
        .values(insertData)
        .returning();
      
      insertedClient = insertResult[0];
      console.log('Debug: Client inserted successfully:', JSON.stringify(insertedClient, null, 2));
    } catch (insertError) {
      console.error('Debug: Client insertion error:', insertError);
      console.error('Debug: Error type:', typeof insertError);
      console.error('Debug: Error keys:', Object.keys(insertError || {}));
      
      let errorDetails: any = 'Unknown insert error';
      
      if (insertError instanceof Error) {
        errorDetails = {
          message: insertError.message,
          stack: insertError.stack,
          constructor: insertError.constructor.name
        };
        
        // Check for SQLite-specific errors
        if ('result' in insertError) {
          errorDetails.result = (insertError as any).result;
        }
        if ('code' in insertError) {
          errorDetails.code = (insertError as any).code;
        }
        if ('errno' in insertError) {
          errorDetails.errno = (insertError as any).errno;
        }
        if ('errmsg' in insertError) {
          errorDetails.errmsg = (insertError as any).errmsg;
        }
      }

      // Rollback sequence update on insert failure
      console.log('Debug: Rolling back sequence update due to insert failure');
      try {
        await db.update(sequences)
          .set({ 
            lastSeq: nextSeq - 1,
            updatedAt: new Date().toISOString()
          })
          .where(and(eq(sequences.entity, 'client'), eq(sequences.year, currentYear)));
      } catch (rollbackError) {
        console.error('Debug: Sequence rollback error:', rollbackError);
      }

      return NextResponse.json({ 
        error: 'Failed to create client',
        code: 'INSERT_ERROR',
        details: errorDetails
      }, { status: 500 });
    }

    // Step 10: Return success response with full debug information
    console.log('Debug: Completed successfully, returning client data');
    return NextResponse.json({
      message: 'Client created successfully',
      client: insertedClient,
      debug: {
        nextSeq,
        clientCode,
        currentYear,
        schemaFields: Object.keys(insertData),
        insertData,
        timestamp: new Date().toISOString()
      }
    }, { status: 201 });

  } catch (unexpectedError) {
    console.error('Debug: Unexpected error in POST handler:', unexpectedError);
    console.error('Debug: Type:', typeof unexpectedError);
    console.error('Debug: Error object:', unexpectedError instanceof Error ? {
      message: unexpectedError.message,
      stack: unexpectedError.stack
    } : unexpectedError);
    
    return NextResponse.json({ 
      error: 'An unexpected error occurred',
      code: 'UNEXPECTED_ERROR',
      details: unexpectedError instanceof Error ? unexpectedError.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const id = searchParams.get('id');
    const search = searchParams.get('search');

    // Single record fetch
    if (id) {
      console.log('Debug: Fetching single client with ID:', id);
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        }, { status: 400 });
      }

      try {
        const clientsResult = await db.select()
          .from(clients)
          .where(eq(clients.id, parseInt(id)))
          .limit(1);

        if (clientsResult.length === 0) {
          console.log('Debug: Client not found with ID:', id);
          return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        }

        console.log('Debug: Found client:', JSON.stringify(clientsResult[0], null, 2));
        return NextResponse.json(clientsResult[0]);
      } catch (fetchError) {
        console.error('Debug: Error fetching client', id + ':', fetchError);
        return NextResponse.json({ 
          error: 'Failed to fetch client',
          code: 'FETCH_ERROR',
          details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // List with pagination and optional search
    console.log('Debug: Fetching client list with limit:', limit, 'offset:', offset, 'search:', search);
    
    try {
      let query = db.select()
        .from(clients)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(clients.createdAt));

      if (search) {
        console.log('Debug: Applying search filter for:', search);
        query = query.where(
          or(
            like(clients.companyName, `%${search}%`),
            like(clients.clientCode, `%${search}%`)
          )
        );
      }

      const clientsResult = await query;
      console.log('Debug: Found', clientsResult.length, 'clients');
      
      return NextResponse.json(clientsResult);
    } catch (listError) {
      console.error('Debug: Error fetching client list:', listError);
      return NextResponse.json({ 
        error: 'Failed to fetch clients',
        code: 'LIST_ERROR',
        details: listError instanceof Error ? listError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (handlerError) {
    console.error('Debug: Unexpected error in GET handler:', handlerError);
    return NextResponse.json({ 
      error: 'An unexpected error occurred',
      code: 'UNEXPECTED_ERROR',
      details: handlerError instanceof Error ? handlerError.message : 'Unknown error'
    }, { status: 500 });
  }
}