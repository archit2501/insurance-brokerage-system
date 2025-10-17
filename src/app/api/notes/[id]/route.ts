import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notes, cnInsurerShares, clients, insurers, policies, users } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

// Financial recalculation helper
function recalculateFinancials(note: any, updates: any = {}) {
  const grossPremium = updates.grossPremium !== undefined ? parseFloat(updates.grossPremium) : note.grossPremium;
  const brokeragePct = updates.brokeragePct !== undefined ? parseFloat(updates.brokeragePct) : note.brokeragePct;
  const vatPct = updates.vatPct !== undefined ? parseFloat(updates.vatPct) : note.vatPct;
  const agentCommissionPct = updates.agentCommissionPct !== undefined ? parseFloat(updates.agentCommissionPct) : note.agentCommissionPct;

  // percent range guard
  if (brokeragePct < 0 || brokeragePct > 100 || vatPct < 0 || vatPct > 100 || agentCommissionPct < 0 || agentCommissionPct > 100) {
    throw new Error('PCT_RANGE');
  }
  
  const brokerageAmount = (grossPremium * brokeragePct) / 100;
  const vatOnBrokerage = (brokerageAmount * vatPct) / 100;
  const agentCommission = (grossPremium * agentCommissionPct) / 100;
  
  // Keep consistent with main /api/notes route
  const netBrokerage = brokerageAmount - agentCommission; // do NOT subtract VAT here
  
  // Levies handling
  const leviesObj = updates.levies !== undefined
    ? (typeof updates.levies === 'string' ? JSON.parse(updates.levies) : updates.levies)
    : (note.levies ? (typeof note.levies === 'string' ? JSON.parse(note.levies) : note.levies) : {});

  const totalLevies = ['niacom', 'ncrib', 'ed_tax'].reduce((sum, k) => sum + (parseFloat(leviesObj?.[k] ?? 0) || 0), 0);

  const netAmountDue = grossPremium - brokerageAmount - vatOnBrokerage - totalLevies;
  
  return {
    grossPremium,
    brokeragePct,
    brokerageAmount,
    vatPct,
    vatOnBrokerage,
    agentCommissionPct,
    agentCommission,
    netBrokerage,
    netAmountDue,
    levies: leviesObj,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }
    
    // Get the note with all joins
    const noteResults = await db
      .select({
        note: notes,
        client: clients,
        insurer: insurers,
        policy: policies,
        preparedByUser: users,
        authorizedByUser: users
      })
      .from(notes)
      .leftJoin(clients, eq(notes.clientId, clients.id))
      .leftJoin(insurers, eq(notes.insurerId, insurers.id))
      .leftJoin(policies, eq(notes.policyId, policies.id))
      .leftJoin(users, eq(notes.preparedBy, users.id))
      .where(eq(notes.id, parseInt(id)))
      .limit(1);
    
    if (noteResults.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
    
    const result = noteResults[0];
    
    // Get CN insurer shares if it's a CN with co-insurance
    let cnInsurerSharesData = null;
    if (result.note.noteType === 'CN' && result.note.coInsurance) {
      const shares = await db
        .select()
        .from(cnInsurerShares)
        .where(eq(cnInsurerShares.noteId, result.note.id));
      
      cnInsurerSharesData = shares;
    }
    
    // Get prepared by and authorized by user details
    let preparedBy = null;
    let authorizedBy = null;
    
    if (result.note.preparedBy) {
      const preparedUser = await db
        .select()
        .from(users)
        .where(eq(users.id, result.note.preparedBy))
        .limit(1);
      preparedBy = preparedUser[0] || null;
    }
    
    if (result.note.authorizedBy) {
      const authorizedUser = await db
        .select()
        .from(users)
        .where(eq(users.id, result.note.authorizedBy))
        .limit(1);
      authorizedBy = authorizedUser[0] || null;
    }
    
    return NextResponse.json({
      ...result.note,
      client: result.client,
      insurer: result.insurer,
      policy: result.policy,
      preparedBy,
      authorizedBy,
      cnInsurerShares: cnInsurerSharesData
    });
    
  } catch (error) {
    console.error('GET note error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Security check: reject if forbidden fields are provided
    const forbiddenFields = ['noteId', 'noteType', 'noteSeq', 'noteYear', 'status', 'createdBy', 'createdAt'];
    const providedForbiddenFields = forbiddenFields.filter(field => field in body);
    
    if (providedForbiddenFields.length > 0) {
      return NextResponse.json({ 
        error: `Cannot update fields: ${providedForbiddenFields.join(', ')}`,
        code: 'FORBIDDEN_FIELDS' 
      }, { status: 400 });
    }
    
    // Get current note for validation and recalculation
    const currentNote = await db
      .select()
      .from(notes)
      .where(eq(notes.id, parseInt(id)))
      .limit(1);
    
    if (currentNote.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
    
    const note = currentNote[0];
    
    // Validate allowed fields
    const allowedFields = ['grossPremium', 'brokeragePct', 'vatPct', 'agentCommissionPct', 'levies', 'payableBankAccountId', 'coInsurance'];
    const updates: any = {};
    
    // Only process allowed fields
    allowedFields.forEach(field => {
      if (field in body) {
        updates[field] = body[field];
      }
    });
    
    // Handle co-insurance validation for CN
    if (note.noteType === 'CN' && updates.coInsurance) {
      const coInsurance = typeof updates.coInsurance === 'string' 
        ? JSON.parse(updates.coInsurance) 
        : updates.coInsurance;
      
      if (Array.isArray(coInsurance) && coInsurance.length > 0) {
        const totalPercentage = coInsurance.reduce((sum: number, item: any) => {
          return sum + (parseFloat(item.percentage) || 0);
        }, 0);
        
        if (Math.abs(totalPercentage - 100) > 0.01) {
          return NextResponse.json({ 
            error: 'Co-insurance percentages must sum to 100',
            code: 'INVALID_COINSURANCE_PERCENTAGES' 
          }, { status: 400 });
        }
      }
    }
    
    // Recalculate financial values (throws on invalid pct range)
    let recalculated;
    try {
      recalculated = recalculateFinancials(note, updates);
    } catch (e: any) {
      if (e?.message === 'PCT_RANGE') {
        return NextResponse.json({ error: 'Percentages must be between 0 and 100', code: 'PCT_RANGE' }, { status: 400 });
      }
      throw e;
    }
    
    // Prepare update data
    const updateData = {
      grossPremium: recalculated.grossPremium,
      brokeragePct: recalculated.brokeragePct,
      brokerageAmount: recalculated.brokerageAmount,
      vatPct: recalculated.vatPct,
      vatOnBrokerage: recalculated.vatOnBrokerage,
      agentCommissionPct: recalculated.agentCommissionPct,
      agentCommission: recalculated.agentCommission,
      netBrokerage: recalculated.netBrokerage,
      netAmountDue: recalculated.netAmountDue,
      levies: JSON.stringify(recalculated.levies ?? {}),
      payableBankAccountId: updates.payableBankAccountId !== undefined 
        ? updates.payableBankAccountId 
        : note.payableBankAccountId,
      coInsurance: updates.coInsurance !== undefined 
        ? (typeof updates.coInsurance === 'string' ? updates.coInsurance : JSON.stringify(updates.coInsurance))
        : note.coInsurance,
      updatedAt: new Date().toISOString()
    } as any;
    
    // Update the note
    const updated = await db
      .update(notes)
      .set(updateData)
      .where(eq(notes.id, parseInt(id)))
      .returning();
    
    if (updated.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
    
    // Handle CN insurer shares if co-insurance is updated: compute amount from percentage and current gross
    if (note.noteType === 'CN' && updates.coInsurance) {
      const coInsurance = typeof updates.coInsurance === 'string' 
        ? JSON.parse(updates.coInsurance) 
        : updates.coInsurance;
      
      // Delete existing shares
      await db
        .delete(cnInsurerShares)
        .where(eq(cnInsurerShares.noteId, parseInt(id)));
      
      // Insert new shares
      if (Array.isArray(coInsurance) && coInsurance.length > 0) {
        const shareInserts = coInsurance.map((item: any) => ({
          noteId: parseInt(id),
          insurerId: parseInt(item.insurerId),
          percentage: parseFloat(item.percentage),
          amount: recalculated.grossPremium * (parseFloat(item.percentage) || 0) / 100,
          createdAt: new Date().toISOString()
        }));
        
        await db
          .insert(cnInsurerShares)
          .values(shareInserts);
      }
    }
    
    return NextResponse.json(updated[0]);
    
  } catch (error) {
    console.error('PUT note error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}