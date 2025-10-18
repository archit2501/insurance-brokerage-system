import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { agents, bankAccounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser, isValidEmail, isValidPhone } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const parsedId = parseInt(id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid agent ID', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const agentResults = await db
      .select()
      .from(agents)
      .where(eq(agents.id, parsedId))
      .limit(1);

    if (agentResults.length === 0) {
      return NextResponse.json(
        { error: 'Agent not found', code: 'AGENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const agent = agentResults[0];

    const bankAccountResults = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.ownerType, 'Agent'),
          eq(bankAccounts.ownerId, id)
        )
      );

    const agentCamel = {
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
      updatedAt: agent.updatedAt
    };

    const bankAccountsCamel = bankAccountResults.map(bankAccount => ({
      id: bankAccount.id,
      ownerType: bankAccount.ownerType,
      ownerId: bankAccount.ownerId,
      bankName: bankAccount.bankName,
      branch: bankAccount.branch,
      accountNumber: bankAccount.accountNumber,
      accountCountry: bankAccount.accountCountry,
      currency: bankAccount.currency,
      swiftBic: bankAccount.swiftBic,
      usageReceivable: bankAccount.usageReceivable,
      usagePayable: bankAccount.usagePayable,
      isDefault: bankAccount.isDefault,
      statementSource: bankAccount.statementSource,
      glCode: bankAccount.glCode,
      active: bankAccount.active,
      createdAt: bankAccount.createdAt,
      updatedAt: bankAccount.updatedAt
    }));

    return NextResponse.json({
      ...agentCamel,
      bankAccounts: bankAccountsCamel
    });
  } catch (error) {
    console.error('GET agent error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const parsedId = parseInt(id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid agent ID', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Security check: reject if forbidden fields are provided
    if ('userId' in body || 'user_id' in body || 'authorId' in body || 'type' in body || 'id' in body) {
      return NextResponse.json(
        { error: 'Cannot update restricted fields: id, type, userId', code: 'FORBIDDEN_FIELDS' },
        { status: 400 }
      );
    }

    const existingAgentResult = await db
      .select()
      .from(agents)
      .where(eq(agents.id, parsedId))
      .limit(1);

    if (existingAgentResult.length === 0) {
      return NextResponse.json(
        { error: 'Agent not found', code: 'AGENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const existingAgent = existingAgentResult[0];
    const updateData: any = { updatedAt: new Date().toISOString() };

    // Validate fields based on agent type
    if (existingAgent.type === 'individual') {
      if ('fullName' in body) {
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
        updateData.fullName = body.fullName.trim();
      }
      if ('legalName' in body && body.legalName !== null && body.legalName !== '') {
        return NextResponse.json({
          error: 'Legal name must be empty for individual agents',
          code: 'INVALID_LEGAL_NAME'
        }, { status: 400 });
      }
    } else if (existingAgent.type === 'corporate') {
      if ('legalName' in body) {
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
        updateData.legalName = body.legalName.trim();
      }
      if ('fullName' in body && body.fullName !== null && body.fullName !== '') {
        return NextResponse.json({
          error: 'Full name must be empty for corporate agents',
          code: 'INVALID_FULL_NAME'
        }, { status: 400 });
      }
      if ('cacRc' in body) {
        if (!body.cacRc || typeof body.cacRc !== 'string' || body.cacRc.trim().length === 0) {
          return NextResponse.json({
            error: 'CAC/RC number is required for corporate agents',
            code: 'MISSING_CAC_RC'
          }, { status: 400 });
        }
        if (!/^[a-zA-Z0-9]+$/.test(body.cacRc)) {
          return NextResponse.json({
            error: 'CAC/RC number must be alphanumeric',
            code: 'INVALID_CAC_RC_FORMAT'
          }, { status: 400 });
        }
        if (body.cacRc.length > 20) {
          return NextResponse.json({
            error: 'CAC/RC number must not exceed 20 characters',
            code: 'CAC_RC_TOO_LONG'
          }, { status: 400 });
        }
        updateData.cacRc = body.cacRc.trim();
      }
      if ('tin' in body) {
        if (!body.tin || typeof body.tin !== 'string' || body.tin.trim().length === 0) {
          return NextResponse.json({
            error: 'TIN number is required for corporate agents',
            code: 'MISSING_TIN'
          }, { status: 400 });
        }
        if (!/^[a-zA-Z0-9-]+$/.test(body.tin)) {
          return NextResponse.json({
            error: 'TIN number must be alphanumeric with dashes',
            code: 'INVALID_TIN_FORMAT'
          }, { status: 400 });
        }
        if (body.tin.length > 20) {
          return NextResponse.json({
            error: 'TIN number must not exceed 20 characters',
            code: 'TIN_TOO_LONG'
          }, { status: 400 });
        }
        updateData.tin = body.tin.trim();
      }
    }

    // Validate email if provided
    if ('email' in body) {
      if (body.email !== null && body.email !== '') {
        if (typeof body.email !== 'string' || !isValidEmail(body.email)) {
          return NextResponse.json({
            error: 'Email must be a valid email address',
            code: 'INVALID_EMAIL'
          }, { status: 400 });
        }
        updateData.email = body.email.trim().toLowerCase();
      } else {
        updateData.email = null;
      }
    }

    // Validate phone if provided
    if ('phone' in body) {
      if (body.phone !== null && body.phone !== '') {
        if (typeof body.phone !== 'string' || !isValidPhone(body.phone)) {
          return NextResponse.json({
            error: 'Phone must be in E.164 format',
            code: 'INVALID_PHONE'
          }, { status: 400 });
        }
        updateData.phone = body.phone.trim();
      } else {
        updateData.phone = null;
      }
    }

    // Validate defaultCommissionPct if provided
    if ('defaultCommissionPct' in body) {
      const pct = parseFloat(body.defaultCommissionPct);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        return NextResponse.json({
          error: 'Default commission percentage must be between 0 and 100',
          code: 'INVALID_COMMISSION_PCT'
        }, { status: 400 });
      }
      updateData.defaultCommissionPct = pct;
    }

    // Validate commissionModel if provided
    if ('commissionModel' in body) {
      if (body.commissionModel !== 'flat' && body.commissionModel !== 'variable') {
        return NextResponse.json({
          error: 'Commission model must be either "flat" or "variable"',
          code: 'INVALID_COMMISSION_MODEL'
        }, { status: 400 });
      }
      updateData.commissionModel = body.commissionModel;
    }

    // Validate status if provided
    if ('status' in body) {
      if (body.status !== 'active' && body.status !== 'inactive') {
        return NextResponse.json({
          error: 'Status must be either "active" or "inactive"',
          code: 'INVALID_STATUS'
        }, { status: 400 });
      }
      updateData.status = body.status;
    }

    const updated = await db
      .update(agents)
      .set(updateData)
      .where(eq(agents.id, parsedId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Agent not found', code: 'AGENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const updatedAgent = updated[0];

    return NextResponse.json({
      id: updatedAgent.id,
      type: updatedAgent.type,
      legalName: updatedAgent.legalName,
      fullName: updatedAgent.fullName,
      cacRc: updatedAgent.cacRc,
      tin: updatedAgent.tin,
      email: updatedAgent.email,
      phone: updatedAgent.phone,
      defaultCommissionPct: updatedAgent.defaultCommissionPct,
      commissionModel: updatedAgent.commissionModel,
      status: updatedAgent.status,
      createdAt: updatedAgent.createdAt,
      updatedAt: updatedAgent.updatedAt
    });
  } catch (error) {
    console.error('PUT agent error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const parsedId = parseInt(id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid agent ID', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const existingAgentResult = await db
      .select()
      .from(agents)
      .where(eq(agents.id, parsedId))
      .limit(1);

    if (existingAgentResult.length === 0) {
      return NextResponse.json(
        { error: 'Agent not found', code: 'AGENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .update(agents)
      .set({
        status: 'inactive',
        updatedAt: new Date().toISOString()
      })
      .where(eq(agents.id, parsedId))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Agent not found', code: 'AGENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deletedAgent = deleted[0];

    return NextResponse.json({
      message: 'Agent successfully deactivated',
      agent: {
        id: deletedAgent.id,
        type: deletedAgent.type,
        legalName: deletedAgent.legalName,
        fullName: deletedAgent.fullName,
        email: deletedAgent.email,
        phone: deletedAgent.phone,
        defaultCommissionPct: deletedAgent.defaultCommissionPct,
        commissionModel: deletedAgent.commissionModel,
        status: deletedAgent.status,
        createdAt: deletedAgent.createdAt,
        updatedAt: deletedAgent.updatedAt
      }
    });
  } catch (error) {
    console.error('DELETE agent error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}