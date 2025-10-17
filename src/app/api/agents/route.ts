import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { agents } from '@/db/schema';
import { eq, like, and, or, desc, asc, ne } from 'drizzle-orm';
import { getCurrentUser, isValidEmail, isValidPhone } from '@/lib/validations';
import { nextEntityCode } from '../_lib/sequences';
import { validateTIN, validateCACOrRC } from '@/app/api/_lib/auth';

export async function GET(request: NextRequest) {
  try {
    // No auth required - open access
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    let query = db.select().from(agents);

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(agents.fullName, `%${search}%`),
          like(agents.legalName, `%${search}%`),
          like(agents.email, `%${search}%`),
          like(agents.phone, `%${search}%`)
        )
      );
    }

    if (status) {
      if (status === 'active' || status === 'inactive') {
        conditions.push(eq(agents.status, status));
      }
    }

    if (type) {
      if (type === 'individual' || type === 'corporate') {
        conditions.push(eq(agents.type, type));
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(agents.createdAt))
      .limit(limit)
      .offset(offset);

    const formattedResults = results.map(agent => ({
      id: agent.id,
      type: agent.type,
      legalName: agent.legalName,
      fullName: agent.fullName,
      cacRc: agent.cacRc,
      tin: agent.tin,
      email: agent.email,
      phone: agent.phone,
      defaultCommissionPct: agent.defaultCommissionPct,
      commissionModel: agent.commissionModel,
      status: agent.status,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    }));

    return NextResponse.json(formattedResults);
  } catch (error) {
    console.error('GET agents error:', error);
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Remove auth requirement - allow open access for testing
    const body = await request.json();

    // Security: Reject if agent_code or agentCode provided in request body
    if ('agent_code' in body || 'agentCode' in body) {
      return NextResponse.json({ 
        error: "Agent code is auto-generated and cannot be provided in request body",
        code: "AGENT_CODE_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Validate type
    if (!body.type || (body.type !== 'individual' && body.type !== 'corporate')) {
      return NextResponse.json({ 
        error: 'Type is required and must be either "individual" or "corporate"',
        code: 'INVALID_TYPE'
      }, { status: 400 });
    }

    // Validate fields based on type
    if (body.type === 'individual') {
      if (!body.fullName || typeof body.fullName !== 'string' || body.fullName.trim().length === 0) {
        return NextResponse.json({ 
          error: 'Full name is required for individual agents',
          code: 'MISSING_FULL_NAME'
        }, { status: 400 });
      }
      if (body.fullName.length > 100) {
        return NextResponse.json({ 
          error: 'Full name must not exceed 100 characters',
          code: 'FULL_NAME_TOO_LONG'
        }, { status: 400 });
      }
      if (body.legalName) {
        return NextResponse.json({ 
          error: 'Legal name must be empty for individual agents',
          code: 'INVALID_LEGAL_NAME'
        }, { status: 400 });
      }
      if (body.cacRc || body.tin) {
        return NextResponse.json({ 
          error: 'CAC/RC and TIN are not required for individual agents',
          code: 'INVALID_CORPORATE_FIELDS'
        }, { status: 400 });
      }
    } else {
      if (!body.legalName || typeof body.legalName !== 'string' || body.legalName.trim().length === 0) {
        return NextResponse.json({ 
          error: 'Legal name is required for corporate agents',
          code: 'MISSING_LEGAL_NAME'
        }, { status: 400 });
      }
      if (body.legalName.length > 100) {
        return NextResponse.json({ 
          error: 'Legal name must not exceed 100 characters',
          code: 'LEGAL_NAME_TOO_LONG'
        }, { status: 400 });
      }
      if (body.fullName) {
        return NextResponse.json({ 
          error: 'Full name must be empty for corporate agents',
          code: 'INVALID_FULL_NAME'
        }, { status: 400 });
      }
      if (!body.cacRc || typeof body.cacRc !== 'string' || body.cacRc.trim().length === 0) {
        return NextResponse.json({ 
          error: 'CAC/RC number is required for corporate agents',
          code: 'MISSING_CAC_RC'
        }, { status: 400 });
      }
      // Strict CAC/RC validation
      const cacCheck = validateCACOrRC(body.cacRc);
      if (!cacCheck.success) {
        return NextResponse.json({ error: cacCheck.error || 'Invalid CAC/RC format', code: 'INVALID_CAC_RC' }, { status: 400 });
      }
      if (!body.tin || typeof body.tin !== 'string' || body.tin.trim().length === 0) {
        return NextResponse.json({ 
          error: 'TIN number is required for corporate agents',
          code: 'MISSING_TIN'
        }, { status: 400 });
      }
      // Strict TIN validation
      const tinCheck = validateTIN(body.tin);
      if (!tinCheck.success) {
        return NextResponse.json({ error: tinCheck.error || 'Invalid TIN format', code: 'INVALID_TIN' }, { status: 400 });
      }
    }

    // Validate email if provided
    if (body.email !== undefined && body.email !== null && body.email !== '') {
      if (typeof body.email !== 'string' || !isValidEmail(body.email)) {
        return NextResponse.json({ 
          error: 'Email must be a valid email address',
          code: 'INVALID_EMAIL'
        }, { status: 400 });
      }
    }

    // Validate phone if provided
    if (body.phone !== undefined && body.phone !== null && body.phone !== '') {
      if (typeof body.phone !== 'string' || !isValidPhone(body.phone)) {
        return NextResponse.json({ 
          error: 'Phone must be in E.164 format',
          code: 'INVALID_PHONE'
        }, { status: 400 });
      }
    }

    // Normalize/prepare values
    const normalizedCac = body.type === 'corporate' ? body.cacRc.trim().toUpperCase() : null;
    const normalizedTin = body.type === 'corporate' ? body.tin.trim().replace(/\D/g, '') : null;

    // Duplicate prevention for corporate CAC/TIN
    if (body.type === 'corporate') {
      const dupCac = await db.select().from(agents).where(eq(agents.cacRc, normalizedCac!)).limit(1);
      if (dupCac.length > 0) {
        return NextResponse.json({ error: 'CAC/RC already exists', code: 'DUPLICATE_CAC_RC' }, { status: 400 });
      }
      const dupTin = await db.select().from(agents).where(eq(agents.tin, normalizedTin!)).limit(1);
      if (dupTin.length > 0) {
        return NextResponse.json({ error: 'TIN already exists', code: 'DUPLICATE_TIN' }, { status: 400 });
      }
    }

    // Validate defaultCommissionPct
    const defaultCommissionPct = typeof body.defaultCommissionPct === 'number' ? body.defaultCommissionPct : 0;
    if (typeof defaultCommissionPct !== 'number' || defaultCommissionPct < 0 || defaultCommissionPct > 100) {
      return NextResponse.json({ 
        error: 'Default commission percentage must be between 0 and 100',
        code: 'INVALID_COMMISSION_PCT'
      }, { status: 400 });
    }

    // Validate commissionModel
    const commissionModel = body.commissionModel || 'flat';
    if (commissionModel !== 'flat' && commissionModel !== 'variable') {
      return NextResponse.json({ 
        error: 'Commission model must be either "flat" or "variable"',
        code: 'INVALID_COMMISSION_MODEL'
      }, { status: 400 });
    }

    // Validate status
    const status = body.status || 'active';
    if (status !== 'active' && status !== 'inactive') {
      return NextResponse.json({ 
        error: 'Status must be either "active" or "inactive"',
        code: 'INVALID_STATUS'
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Generate agent code using centralized service
    const { code: agentCode } = await nextEntityCode(db, { 
      entity: 'AGENT', 
      type: body.type 
    });

    const newAgent = await db.insert(agents).values({
      agentCode,
      type: body.type,
      legalName: body.type === 'corporate' ? body.legalName.trim() : null,
      fullName: body.type === 'individual' ? body.fullName.trim() : null,
      cacRc: body.type === 'corporate' ? normalizedCac : null,
      tin: body.type === 'corporate' ? normalizedTin : null,
      email: body.email ? body.email.trim().toLowerCase() : null,
      phone: body.phone ? body.phone.trim() : null,
      defaultCommissionPct,
      commissionModel,
      status,
      createdAt: now,
      updatedAt: now,
    }).returning();

    const formattedAgent = {
      id: newAgent[0].id,
      agentCode: newAgent[0].agentCode,
      type: newAgent[0].type,
      legalName: newAgent[0].legalName,
      fullName: newAgent[0].fullName,
      cacRc: newAgent[0].cacRc,
      tin: newAgent[0].tin,
      email: newAgent[0].email,
      phone: newAgent[0].phone,
      defaultCommissionPct: newAgent[0].defaultCommissionPct,
      commissionModel: newAgent[0].commissionModel,
      status: newAgent[0].status,
      createdAt: newAgent[0].createdAt,
      updatedAt: newAgent[0].updatedAt,
    };

    return NextResponse.json(formattedAgent, { status: 201 });
  } catch (error) {
    console.error('POST agents error:', error);
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // No auth required - open access
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ error: 'Valid ID is required', code: 'INVALID_ID' }, { status: 400 });
    }

    const body = await request.json();

    // Load existing
    const existing = await db.select().from(agents).where(eq(agents.id, parseInt(id))).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Agent not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    const current = existing[0];

    // Determine effective type
    const effType: 'individual' | 'corporate' = body.type ?? current.type;
    if (body.type && body.type !== 'individual' && body.type !== 'corporate') {
      return NextResponse.json({ error: 'type must be "individual" or "corporate"', code: 'INVALID_TYPE' }, { status: 400 });
    }

    const updates: any = {};

    // Type-specific validations
    if (effType === 'individual') {
      // fullName required (if provided or switching types)
      if (body.type === 'individual' || body.fullName !== undefined || current.type !== 'individual') {
        if (!body.fullName && current.type !== 'individual' && !current.fullName) {
          return NextResponse.json({ error: 'Full name is required for individual agents', code: 'MISSING_FULL_NAME' }, { status: 400 });
        }
        if (body.fullName !== undefined) {
          if (typeof body.fullName !== 'string' || body.fullName.trim().length === 0) {
            return NextResponse.json({ error: 'Full name is required for individual agents', code: 'MISSING_FULL_NAME' }, { status: 400 });
          }
          if (body.fullName.length > 100) {
            return NextResponse.json({ error: 'Full name must not exceed 100 characters', code: 'FULL_NAME_TOO_LONG' }, { status: 400 });
          }
          updates.fullName = body.fullName.trim();
        }
      }
      // Ensure corporate fields cleared when switching
      if (body.type === 'individual') {
        updates.legalName = null;
        updates.cacRc = null;
        updates.tin = null;
      }
    } else {
      // corporate
      // legalName required (if provided or switching types)
      if (body.type === 'corporate' || body.legalName !== undefined || current.type !== 'corporate') {
        const legal = body.legalName ?? current.legalName;
        if (!legal || typeof legal !== 'string' || legal.trim().length === 0) {
          return NextResponse.json({ error: 'Legal name is required for corporate agents', code: 'MISSING_LEGAL_NAME' }, { status: 400 });
        }
        if ((body.legalName ?? legal).length > 100) {
          return NextResponse.json({ error: 'Legal name must not exceed 100 characters', code: 'LEGAL_NAME_TOO_LONG' }, { status: 400 });
        }
        if (body.legalName !== undefined) updates.legalName = body.legalName.trim();
      }

      // CAC/RC required and strict when provided or switching
      if (body.type === 'corporate' || body.cacRc !== undefined || current.type !== 'corporate') {
        const cacVal = body.cacRc ?? current.cacRc;
        if (!cacVal || typeof cacVal !== 'string') {
          return NextResponse.json({ error: 'CAC/RC number is required for corporate agents', code: 'MISSING_CAC_RC' }, { status: 400 });
        }
        const cacCheck = validateCACOrRC(cacVal);
        if (!cacCheck.success) {
          return NextResponse.json({ error: cacCheck.error || 'Invalid CAC/RC format', code: 'INVALID_CAC_RC' }, { status: 400 });
        }
        const normalizedCac = cacVal.trim().toUpperCase();
        if (normalizedCac !== current.cacRc) {
          const dup = await db.select().from(agents).where(and(eq(agents.cacRc, normalizedCac), ne(agents.id, parseInt(id)))).limit(1);
          if (dup.length > 0) return NextResponse.json({ error: 'CAC/RC already exists', code: 'DUPLICATE_CAC_RC' }, { status: 400 });
        }
        if (body.cacRc !== undefined) updates.cacRc = normalizedCac;
      }

      // TIN required and strict when provided or switching
      if (body.type === 'corporate' || body.tin !== undefined || current.type !== 'corporate') {
        const tinVal = body.tin ?? current.tin;
        if (!tinVal || typeof tinVal !== 'string') {
          return NextResponse.json({ error: 'TIN number is required for corporate agents', code: 'MISSING_TIN' }, { status: 400 });
        }
        const tinCheck = validateTIN(tinVal);
        if (!tinCheck.success) {
          return NextResponse.json({ error: tinCheck.error || 'Invalid TIN format', code: 'INVALID_TIN' }, { status: 400 });
        }
        const normalizedTin = tinVal.trim().replace(/\D/g, '');
        if (normalizedTin !== current.tin) {
          const dup = await db.select().from(agents).where(and(eq(agents.tin, normalizedTin), ne(agents.id, parseInt(id)))).limit(1);
          if (dup.length > 0) return NextResponse.json({ error: 'TIN already exists', code: 'DUPLICATE_TIN' }, { status: 400 });
        }
        if (body.tin !== undefined) updates.tin = normalizedTin;
      }

      // Ensure individual field cleared when switching to corporate
      if (body.type === 'corporate') {
        updates.fullName = null;
      }
    }

    // Update type if provided
    if (body.type !== undefined) updates.type = effType;

    // Email validation
    if (body.email !== undefined) {
      if (body.email !== null && body.email !== '') {
        if (typeof body.email !== 'string' || !isValidEmail(body.email)) {
          return NextResponse.json({ error: 'Email must be a valid email address', code: 'INVALID_EMAIL' }, { status: 400 });
        }
        updates.email = body.email.trim().toLowerCase();
      } else {
        updates.email = null;
      }
    }

    // Phone validation
    if (body.phone !== undefined) {
      if (body.phone !== null && body.phone !== '') {
        if (typeof body.phone !== 'string' || !isValidPhone(body.phone)) {
          return NextResponse.json({ error: 'Phone must be in E.164 format', code: 'INVALID_PHONE' }, { status: 400 });
        }
        updates.phone = body.phone.trim();
      } else {
        updates.phone = null;
      }
    }

    // Commission pct
    if (body.defaultCommissionPct !== undefined) {
      if (typeof body.defaultCommissionPct !== 'number' || body.defaultCommissionPct < 0 || body.defaultCommissionPct > 100) {
        return NextResponse.json({ error: 'Default commission percentage must be between 0 and 100', code: 'INVALID_COMMISSION_PCT' }, { status: 400 });
      }
      updates.defaultCommissionPct = body.defaultCommissionPct;
    }

    // Commission model
    if (body.commissionModel !== undefined) {
      if (body.commissionModel !== 'flat' && body.commissionModel !== 'variable') {
        return NextResponse.json({ error: 'Commission model must be either "flat" or "variable"', code: 'INVALID_COMMISSION_MODEL' }, { status: 400 });
      }
      updates.commissionModel = body.commissionModel;
    }

    // Status
    if (body.status !== undefined) {
      if (body.status !== 'active' && body.status !== 'inactive') {
        return NextResponse.json({ error: 'Status must be either "active" or "inactive"', code: 'INVALID_STATUS' }, { status: 400 });
      }
      updates.status = body.status;
    }

    // Names (when editing within same type)
    if (effType === 'individual' && body.fullName !== undefined) {
      updates.fullName = body.fullName.trim();
    }
    if (effType === 'corporate' && body.legalName !== undefined) {
      updates.legalName = body.legalName.trim();
    }

    updates.updatedAt = new Date().toISOString();

    const updated = await db.update(agents)
      .set(updates)
      .where(eq(agents.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Agent not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    const a = updated[0];
    const formattedAgent = {
      id: a.id,
      agentCode: a.agentCode,
      type: a.type,
      legalName: a.legalName,
      fullName: a.fullName,
      cacRc: a.cacRc,
      tin: a.tin,
      email: a.email,
      phone: a.phone,
      defaultCommissionPct: a.defaultCommissionPct,
      commissionModel: a.commissionModel,
      status: a.status,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };

    return NextResponse.json(formattedAgent);
  } catch (error) {
    console.error('PUT agents error:', error);
    return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}