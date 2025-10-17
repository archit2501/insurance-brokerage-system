import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { agentContacts, agents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; contactId: string } }
) {
  try {
    // No auth required - open access
    const agentId = parseInt(params.id);
    const contactId = parseInt(params.contactId);

    if (isNaN(agentId)) {
      return NextResponse.json(
        { error: 'Invalid agent ID', code: 'INVALID_AGENT_ID' },
        { status: 400 }
      );
    }

    if (isNaN(contactId)) {
      return NextResponse.json(
        { error: 'Invalid contact ID', code: 'INVALID_CONTACT_ID' },
        { status: 400 }
      );
    }

    // Check if agent exists
    const agent = await db.select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    if (agent.length === 0) {
      return NextResponse.json(
        { error: 'Agent not found', code: 'AGENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check if contact exists for this agent
    const contact = await db.select()
      .from(agentContacts)
      .where(and(eq(agentContacts.id, contactId), eq(agentContacts.agentId, agentId)))
      .limit(1);

    if (contact.length === 0) {
      return NextResponse.json(
        { error: 'Contact not found', code: 'CONTACT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete the contact
    await db.delete(agentContacts)
      .where(and(eq(agentContacts.id, contactId), eq(agentContacts.agentId, agentId)));

    return NextResponse.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('DELETE agent contact error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}