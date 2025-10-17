import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notes, noteSequences, cnInsurerShares, clients, insurers, policies, users } from '@/db/schema';
import { eq, like, and, or, desc, asc, sql, inArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const noteType = searchParams.get('note_type');
    const status = searchParams.get('status');
    const clientId = searchParams.get('client_id');
    const insurerId = searchParams.get('insurer_id');
    const includeShares = searchParams.get('include_shares') === '1';

    let query = db.select({
      note: notes,
      client: {
        id: clients.id,
        companyName: clients.companyName,
      },
      insurer: {
        id: insurers.id,
        companyName: insurers.companyName,
        shortName: insurers.shortName,
      },
      policy: {
        id: policies.id,
        policyNumber: policies.policyNumber,
        sumInsured: policies.sumInsured,
        grossPremium: policies.grossPremium,
      },
      preparedByUser: {
        id: users.id,
        fullName: users.fullName,
      },
    })
    .from(notes)
    .leftJoin(clients, eq(notes.clientId, clients.id))
    .leftJoin(insurers, eq(notes.insurerId, insurers.id))
    .leftJoin(policies, eq(notes.policyId, policies.id))
    .leftJoin(users, eq(notes.preparedBy, users.id));

    const conditions = [] as any[];

    if (search) {
      conditions.push(
        or(
          like(notes.noteId, `%${search}%`),
          like(clients.companyName, `%${search}%`)
        )
      );
    }

    if (noteType) {
      conditions.push(eq(notes.noteType, noteType));
    }

    if (status) {
      const statusArray = status.split(',');
      conditions.push(inArray(notes.status, statusArray));
    }

    if (clientId) {
      conditions.push(eq(notes.clientId, parseInt(clientId)));
    }

    if (insurerId) {
      conditions.push(eq(notes.insurerId, parseInt(insurerId)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(notes.createdAt))
      .limit(limit)
      .offset(offset);

    if (!includeShares) {
      return NextResponse.json(results);
    }

    // includeShares: attach cnInsurerShares for CN notes in the page
    const cnNoteIds = results
      .filter((r: any) => r.note.noteType === 'CN')
      .map((r: any) => r.note.id);

    if (cnNoteIds.length === 0) {
      return NextResponse.json(results);
    }

    const shares = await db
      .select()
      .from(cnInsurerShares)
      .where(inArray(cnInsurerShares.noteId, cnNoteIds));

    const shareMap = new Map<number, any[]>();
    for (const s of shares as any[]) {
      const arr = shareMap.get(s.noteId) || [];
      arr.push(s);
      shareMap.set(s.noteId, arr);
    }

    const enriched = results.map((r: any) => ({
      ...r,
      cnInsurerShares: r.note.noteType === 'CN' ? (shareMap.get(r.note.id) || []) : undefined,
    }));

    return NextResponse.json(enriched);

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body || 'authorId' in body || 'preparedBy' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const {
      noteType,
      clientId,
      policyId,
      grossPremium,
      brokeragePct,
      insurerId,
      vatPct = 7.5,
      agentCommissionPct = 0,
      levies = {},
      payableBankAccountId,
      coInsurance
    } = body;

    // Validate required fields
    if (!noteType || !['DN', 'CN'].includes(noteType)) {
      return NextResponse.json({ 
        error: "Valid noteType is required (DN or CN)",
        code: "INVALID_NOTE_TYPE" 
      }, { status: 400 });
    }

    if (!clientId || isNaN(parseInt(clientId))) {
      return NextResponse.json({ 
        error: "Valid clientId is required",
        code: "INVALID_CLIENT_ID" 
      }, { status: 400 });
    }

    if (!policyId || isNaN(parseInt(policyId))) {
      return NextResponse.json({ 
        error: "Valid policyId is required",
        code: "INVALID_POLICY_ID" 
      }, { status: 400 });
    }

    if (!grossPremium || isNaN(parseFloat(grossPremium)) || parseFloat(grossPremium) <= 0) {
      return NextResponse.json({ 
        error: "Valid grossPremium is required",
        code: "INVALID_GROSS_PREMIUM" 
      }, { status: 400 });
    }

    if (!brokeragePct || isNaN(parseFloat(brokeragePct)) || parseFloat(brokeragePct) < 0) {
      return NextResponse.json({ 
        error: "Valid brokeragePct is required",
        code: "INVALID_BROKERAGE_PCT" 
      }, { status: 400 });
    }

    // additional pct validations
    if (parseFloat(brokeragePct) > 100) {
      return NextResponse.json({ error: "brokeragePct must be between 0 and 100", code: "PCT_RANGE" }, { status: 400 });
    }
    if (isNaN(parseFloat(String(vatPct))) || parseFloat(String(vatPct)) < 0 || parseFloat(String(vatPct)) > 100) {
      return NextResponse.json({ error: "vatPct must be between 0 and 100", code: "PCT_RANGE" }, { status: 400 });
    }
    if (isNaN(parseFloat(String(agentCommissionPct))) || parseFloat(String(agentCommissionPct)) < 0 || parseFloat(String(agentCommissionPct)) > 100) {
      return NextResponse.json({ error: "agentCommissionPct must be between 0 and 100", code: "PCT_RANGE" }, { status: 400 });
    }

    if (noteType === 'CN' && (!insurerId || isNaN(parseInt(insurerId)))) {
      return NextResponse.json({ 
        error: "Valid insurerId is required for CN",
        code: "INVALID_INSURER_ID" 
      }, { status: 400 });
    }

    // Validate co-insurance for CN
    if (noteType === 'CN' && coInsurance && coInsurance.length > 0) {
      const totalPercentage = coInsurance.reduce((sum: number, item: any) => sum + parseFloat(item.percentage), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        return NextResponse.json({ 
          error: "Co-insurance percentages must sum to 100",
          code: "INVALID_COINSURANCE_PCT" 
        }, { status: 400 });
      }
    }

    // levies non-negative
    if (levies) {
      const l = { niacom: levies.niacom ?? 0, ncrib: levies.ncrib ?? 0, ed_tax: levies.ed_tax ?? 0 } as any;
      if (parseFloat(l.niacom) < 0 || parseFloat(l.ncrib) < 0 || parseFloat(l.ed_tax) < 0) {
        return NextResponse.json({ error: "Levy values cannot be negative", code: "INVALID_LEVY" }, { status: 400 });
      }
    }

    const currentYear = new Date().getFullYear();

    // Calculate financial values (pre-calc; persisted inside tx)
    const gross = parseFloat(grossPremium);
    const brokerage = parseFloat(brokeragePct);
    const vat = parseFloat(vatPct);
    const agentCommission = parseFloat(agentCommissionPct);

    const round2 = (n: number) => Number((n).toFixed(2));

    const brokerageAmount = round2(gross * brokerage / 100);
    const vatOnBrokerage = round2(brokerageAmount * vat / 100);
    const agentCommissionAmount = round2(gross * agentCommission / 100);
    const netBrokerage = round2(brokerageAmount - agentCommissionAmount);

    const niacom = parseFloat(levies.niacom || 0);
    const ncrib = parseFloat(levies.ncrib || 0);
    const edTax = parseFloat(levies.ed_tax || 0);
    const totalLevies = round2(niacom + ncrib + edTax);

    const netAmountDue = round2(gross - brokerageAmount - vatOnBrokerage - totalLevies);

    const now = new Date().toISOString();
    // Defer real PDF hash generation to issuance; leave null at creation time
    const hashHex = null as any;

    // Use a transaction to atomically increment sequence and create note
    const created = await db.transaction(async (tx) => {
      // Get or create sequence for this year and note type
      let sequence = await tx.select()
        .from(noteSequences)
        .where(and(eq(noteSequences.noteType, noteType), eq(noteSequences.year, currentYear)))
        .limit(1);

      let nextSeq = 1;
      if (sequence.length > 0) {
        nextSeq = sequence[0].lastSeq + 1;
        await tx.update(noteSequences)
          .set({ lastSeq: nextSeq })
          .where(and(eq(noteSequences.noteType, noteType), eq(noteSequences.year, currentYear)));
      } else {
        await tx.insert(noteSequences)
          .values({ noteType, year: currentYear, lastSeq: nextSeq });
      }

      const noteId = `${noteType}/${currentYear}/${String(nextSeq).padStart(6, '0')}`;

      const noteData = {
        noteId,
        noteType,
        noteSeq: nextSeq,
        noteYear: currentYear,
        clientId: parseInt(clientId),
        insurerId: noteType === 'CN' && insurerId ? parseInt(insurerId) : null,
        policyId: parseInt(policyId),
        grossPremium: round2(gross),
        brokeragePct: brokerage,
        brokerageAmount,
        vatPct: vat,
        vatOnBrokerage,
        agentCommissionPct: agentCommission,
        agentCommission: agentCommissionAmount,
        netBrokerage,
        levies: JSON.stringify({
          niacom: round2(niacom),
          ncrib: round2(ncrib),
          ed_tax: round2(edTax)
        }),
        netAmountDue,
        payableBankAccountId: payableBankAccountId || null,
        coInsurance: coInsurance ? JSON.stringify(coInsurance) : null,
        status: 'Draft',
        pdfPath: `/pdf/${noteId}.pdf`,
        sha256Hash: hashHex,
        preparedBy: parseInt(userId),
        createdAt: now,
        updatedAt: now
      };

      const inserted = await tx.insert(notes)
        .values(noteData)
        .returning();

      // persist co-insurer shares for CN
      if (noteType === 'CN' && coInsurance && coInsurance.length > 0) {
        const rows = coInsurance.map((item: any) => ({
          noteId: inserted[0].id,
          insurerId: parseInt(item.insurerId),
          percentage: parseFloat(item.percentage),
          amount: round2(gross * parseFloat(item.percentage) / 100),
          createdAt: now,
        }));
        await tx.insert(cnInsurerShares).values(rows as any);
      }

      return inserted[0];
    });

    return NextResponse.json(created, { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const body = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body || 'authorId' in body || 'preparedBy' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const {
      noteType,
      clientId,
      policyId,
      grossPremium,
      brokeragePct,
      insurerId,
      vatPct,
      agentCommissionPct,
      levies,
      payableBankAccountId,
      coInsurance,
      status
    } = body;

    // Check if note exists and belongs to user
    const existingNote = await db.select()
      .from(notes)
      .where(and(eq(notes.id, parseInt(id)), eq(notes.preparedBy, parseInt(userId))))
      .limit(1);

    if (existingNote.length === 0) {
      return NextResponse.json({ 
        error: "Note not found or access denied",
        code: "NOT_FOUND" 
      }, { status: 404 });
    }

    const updates: any = { updatedAt: new Date().toISOString() };

    // Update fields if provided
    if (noteType) updates.noteType = noteType;
    if (clientId !== undefined) updates.clientId = parseInt(clientId);
    if (policyId !== undefined) updates.policyId = parseInt(policyId);
    if (insurerId !== undefined) updates.insurerId = insurerId ? parseInt(insurerId) : null;
    if (payableBankAccountId !== undefined) updates.payableBankAccountId = payableBankAccountId;
    if (status) updates.status = status;

    // Recalculate financials if any related fields changed
    if (grossPremium !== undefined || brokeragePct !== undefined || vatPct !== undefined || 
        agentCommissionPct !== undefined || levies !== undefined) {
      const round2 = (n: number) => Number((n).toFixed(2));
      const gross = parseFloat(grossPremium || existingNote[0].grossPremium);
      const brokerage = parseFloat(brokeragePct || existingNote[0].brokeragePct);
      const vat = parseFloat(vatPct || existingNote[0].vatPct);
      const agentCommission = parseFloat(agentCommissionPct || existingNote[0].agentCommissionPct);

      // pct ranges
      if (brokerage < 0 || brokerage > 100 || vat < 0 || vat > 100 || agentCommission < 0 || agentCommission > 100) {
        return NextResponse.json({ error: "Percentages must be between 0 and 100", code: "PCT_RANGE" }, { status: 400 });
      }

      const brokerageAmount = round2(gross * brokerage / 100);
      const vatOnBrokerage = round2(brokerageAmount * vat / 100);
      const agentCommissionAmount = round2(gross * agentCommission / 100);
      const netBrokerage = round2(brokerageAmount - agentCommissionAmount);

      const leviesData = levies || JSON.parse(existingNote[0].levies || '{}');
      const totalLevies = round2((parseFloat(leviesData.niacom || 0)) + 
                         (parseFloat(leviesData.ncrib || 0)) + 
                         (parseFloat(leviesData.ed_tax || 0)));

      updates.grossPremium = round2(gross);
      updates.brokeragePct = brokerage;
      updates.brokerageAmount = brokerageAmount;
      updates.vatPct = vat;
      updates.vatOnBrokerage = vatOnBrokerage;
      updates.agentCommissionPct = agentCommission;
      updates.agentCommission = agentCommissionAmount;
      updates.netBrokerage = netBrokerage;
      updates.levies = JSON.stringify({
        niacom: round2(parseFloat(leviesData.niacom || 0)),
        ncrib: round2(parseFloat(leviesData.ncrib || 0)),
        ed_tax: round2(parseFloat(leviesData.ed_tax || 0)),
      });
      updates.netAmountDue = round2(gross - brokerageAmount - vatOnBrokerage - totalLevies);
    }

    // handle co-insurance update for CN
    if (coInsurance !== undefined && existingNote[0].noteType === 'CN') {
      if (coInsurance && coInsurance.length > 0) {
        const totalPercentage = coInsurance.reduce((sum: number, item: any) => sum + parseFloat(item.percentage), 0);
        if (Math.abs(totalPercentage - 100) > 0.01) {
          return NextResponse.json({ error: "Co-insurance percentages must sum to 100", code: "INVALID_COINSURANCE_PCT" }, { status: 400 });
        }
      }
      updates.coInsurance = coInsurance ? JSON.stringify(coInsurance) : null;
    }

    const updated = await db.update(notes)
      .set(updates)
      .where(and(eq(notes.id, parseInt(id)), eq(notes.preparedBy, parseInt(userId))))
      .returning();

    // persist co-insurer shares when coInsurance changed (CN only)
    if (coInsurance !== undefined && existingNote[0].noteType === 'CN') {
      const grossForShares = (grossPremium !== undefined) ? parseFloat(grossPremium) : existingNote[0].grossPremium;
      await db.delete(cnInsurerShares).where(eq(cnInsurerShares.noteId, parseInt(id)));
      if (coInsurance && coInsurance.length > 0) {
        const rows = coInsurance.map((item: any) => ({
          noteId: parseInt(id),
          insurerId: parseInt(item.insurerId),
          percentage: parseFloat(item.percentage),
          amount: round2(grossForShares * parseFloat(item.percentage) / 100),
          createdAt: new Date().toISOString(),
        }));
        await db.insert(cnInsurerShares).values(rows as any);
      }
    }

    return NextResponse.json(updated[0]);

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if note exists and belongs to user
    const existingNote = await db.select()
      .from(notes)
      .where(and(eq(notes.id, parseInt(id)), eq(notes.preparedBy, parseInt(userId))))
      .limit(1);

    if (existingNote.length === 0) {
      return NextResponse.json({ 
        error: "Note not found or access denied",
        code: "NOT_FOUND" 
      }, { status: 404 });
    }

    // Delete related records first
    await db.delete(cnInsurerShares)
      .where(eq(cnInsurerShares.noteId, parseInt(id)));

    await db.delete('reminders' as any)
      .where(eq('reminders.note_id', parseInt(id)));

    // Delete the note
    const deleted = await db.delete(notes)
      .where(and(eq(notes.id, parseInt(id)), eq(notes.preparedBy, parseInt(userId))))
      .returning();

    return NextResponse.json({ 
      message: "Note deleted successfully",
      deleted: deleted[0]
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}