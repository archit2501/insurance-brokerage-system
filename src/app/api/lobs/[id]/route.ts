import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { lobs } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const id = id;

  if (!id || isNaN(parseInt(id))) {
    return NextResponse.json({ 
      error: "Valid ID is required",
      code: "INVALID_ID" 
    }, { status: 400 });
  }

  try {
    const record = await db.select()
      .from(lobs)
      .where(eq(lobs.id, parseInt(id)))
      .limit(1);

    if (record.length === 0) {
      return NextResponse.json({ error: 'LOB not found' }, { status: 404 });
    }

    return NextResponse.json(record[0]);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const id = id;

  if (!id || isNaN(parseInt(id))) {
    return NextResponse.json({ 
      error: "Valid ID is required",
      code: "INVALID_ID" 
    }, { status: 400 });
  }

  try {
    // Simple auth check - require Admin role for LOB updates
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userRole = request.headers.get('x-role') || 'Viewer';
    if (userRole !== 'Admin') {
      return NextResponse.json({ 
        error: 'Admin role required for LOB updates',
        code: 'INSUFFICIENT_PERMISSIONS'
      }, { status: 403 });
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      status,
      defaultBrokeragePct,
      defaultVatPct,
      rateBasis,
      ratingInputs,
      minPremium,
      wordingRefs
    } = body;

    // Validate at least one field to update
    if (!name && !description && !status && defaultBrokeragePct === undefined && 
        defaultVatPct === undefined && !rateBasis && !ratingInputs && 
        minPremium === undefined && !wordingRefs) {
      return NextResponse.json({ 
        error: "At least one field to update is required",
        code: "MISSING_UPDATE_FIELDS" 
      }, { status: 400 });
    }

    // Check if record exists
    const existingRecord = await db.select()
      .from(lobs)
      .where(eq(lobs.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ error: 'LOB not found' }, { status: 404 });
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return NextResponse.json({ 
          error: "Name cannot be empty",
          code: "INVALID_NAME" 
        }, { status: 400 });
      }

      // Check name uniqueness (exclude current record)
      const nameExists = await db.select()
        .from(lobs)
        .where(and(
          eq(lobs.name, trimmedName),
          ne(lobs.id, parseInt(id))
        ))
        .limit(1);

      if (nameExists.length > 0) {
        return NextResponse.json({ 
          error: "A LOB with this name already exists",
          code: "NAME_EXISTS" 
        }, { status: 400 });
      }

      updateData.name = trimmedName;
    }

    if (description !== undefined) {
      updateData.description = description.trim();
    }

    if (status !== undefined) {
      const validStatuses = ['active', 'inactive'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ 
          error: "Invalid status. Must be 'active' or 'inactive'",
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
      updateData.status = status;
    }

    if (defaultBrokeragePct !== undefined) {
      const pct = parseFloat(defaultBrokeragePct);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        return NextResponse.json({ 
          error: "Default brokerage percentage must be between 0 and 100",
          code: "INVALID_BROKERAGE_PCT" 
        }, { status: 400 });
      }
      updateData.defaultBrokeragePct = pct;
    }

    if (defaultVatPct !== undefined) {
      const pct = parseFloat(defaultVatPct);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        return NextResponse.json({ 
          error: "Default VAT percentage must be between 0 and 100",
          code: "INVALID_VAT_PCT" 
        }, { status: 400 });
      }
      updateData.defaultVatPct = pct;
    }

    if (minPremium !== undefined) {
      const premium = parseFloat(minPremium);
      if (isNaN(premium) || premium < 0) {
        return NextResponse.json({ 
          error: "Minimum premium must be non-negative",
          code: "INVALID_MIN_PREMIUM" 
        }, { status: 400 });
      }
      updateData.minPremium = premium;
    }

    if (rateBasis !== undefined) {
      updateData.rateBasis = rateBasis?.trim() || null;
    }

    if (ratingInputs !== undefined) {
      updateData.ratingInputs = ratingInputs;
    }

    if (wordingRefs !== undefined) {
      updateData.wordingRefs = wordingRefs?.trim() || null;
    }

    const updated = await db.update(lobs)
      .set(updateData)
      .where(eq(lobs.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'LOB not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const id = id;

  if (!id || isNaN(parseInt(id))) {
    return NextResponse.json({ 
      error: "Valid ID is required",
      code: "INVALID_ID" 
    }, { status: 400 });
  }

  try {
    // Soft delete by setting status to inactive
    const deleted = await db.update(lobs)
      .set({ 
        status: 'inactive',
        updatedAt: new Date().toISOString()
      })
      .where(eq(lobs.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'LOB not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'LOB successfully deactivated',
      lob: deleted[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}