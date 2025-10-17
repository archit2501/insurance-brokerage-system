import { db } from '@/db';
import { agentContacts } from '@/db/schema';

async function main() {
    const sampleAgentContacts = [
        // Agent 1 (Individual - 2 contacts)
        {
            agentId: 1,
            fullName: 'Chinedu Okafor',
            designation: 'Principal Agent',
            email: 'chinedu.okafor@agents.ng',
            phone: '+2348034567890',
            isPrimary: true,
            status: 'active',
            createdAt: new Date('2024-01-15').toISOString(),
            updatedAt: new Date('2024-01-15').toISOString(),
        },
        {
            agentId: 1,
            fullName: 'Grace Adeyemi',
            designation: 'Assistant',
            email: 'grace.adeyemi@agents.ng',
            phone: '+2348034567891',
            isPrimary: false,
            status: 'active',
            createdAt: new Date('2024-01-16').toISOString(),
            updatedAt: new Date('2024-01-16').toISOString(),
        },
        
        // Agent 2 (Individual - 2 contacts)
        {
            agentId: 2,
            fullName: 'Fatima Bello',
            designation: 'Principal Agent',
            email: 'fatima.bello@agency.ng',
            phone: '+2348051234567',
            isPrimary: true,
            status: 'active',
            createdAt: new Date('2024-01-20').toISOString(),
            updatedAt: new Date('2024-01-20').toISOString(),
        },
        {
            agentId: 2,
            fullName: 'Ibrahim Musa',
            designation: 'Secretary',
            email: 'ibrahim.musa@agency.ng',
            phone: '+2348051234568',
            isPrimary: false,
            status: 'active',
            createdAt: new Date('2024-01-21').toISOString(),
            updatedAt: new Date('2024-01-21').toISOString(),
        },
        
        // Agent 3 (Individual - 2 contacts)
        {
            agentId: 3,
            fullName: 'Emeka Nwosu',
            designation: 'Principal Agent',
            email: 'emeka.nwosu@insurance.com.ng',
            phone: '+2348023456789',
            isPrimary: true,
            status: 'active',
            createdAt: new Date('2024-02-01').toISOString(),
            updatedAt: new Date('2024-02-01').toISOString(),
        },
        {
            agentId: 3,
            fullName: 'Amina Sanusi',
            designation: 'Assistant',
            email: 'amina.sanusi@insurance.com.ng',
            phone: '+2348023456790',
            isPrimary: false,
            status: 'active',
            createdAt: new Date('2024-02-02').toISOString(),
            updatedAt: new Date('2024-02-02').toISOString(),
        },
        
        // Agent 4 (Corporate - 3 contacts)
        {
            agentId: 4,
            fullName: 'Johnson Adebayo',
            designation: 'Managing Director',
            email: 'johnson.adebayo@primecorp.ng',
            phone: '+2348067890123',
            isPrimary: true,
            status: 'active',
            createdAt: new Date('2024-02-10').toISOString(),
            updatedAt: new Date('2024-02-10').toISOString(),
        },
        {
            agentId: 4,
            fullName: 'Sarah Ahmed',
            designation: 'Operations Manager',
            email: 'sarah.ahmed@primecorp.ng',
            phone: '+2348067890124',
            isPrimary: false,
            status: 'active',
            createdAt: new Date('2024-02-11').toISOString(),
            updatedAt: new Date('2024-02-11').toISOString(),
        },
        {
            agentId: 4,
            fullName: 'Michael Okonkwo',
            designation: 'Marketing Manager',
            email: 'michael.okonkwo@primecorp.ng',
            phone: '+2348067890125',
            isPrimary: false,
            status: 'active',
            createdAt: new Date('2024-02-12').toISOString(),
            updatedAt: new Date('2024-02-12').toISOString(),
        },
        
        // Agent 5 (Corporate - 3 contacts)
        {
            agentId: 5,
            fullName: 'Aisha Mohammed',
            designation: 'Managing Director',
            email: 'aisha.mohammed@trustagents.ng',
            phone: '+2348076543210',
            isPrimary: true,
            status: 'active',
            createdAt: new Date('2024-02-15').toISOString(),
            updatedAt: new Date('2024-02-15').toISOString(),
        },
        {
            agentId: 5,
            fullName: 'David Okafor',
            designation: 'Operations Manager',
            email: 'david.okafor@trustagents.ng',
            phone: '+2348076543211',
            isPrimary: false,
            status: 'active',
            createdAt: new Date('2024-02-16').toISOString(),
            updatedAt: new Date('2024-02-16').toISOString(),
        },
        {
            agentId: 5,
            fullName: 'Fatima Ibrahim',
            designation: 'Accounts Manager',
            email: 'fatima.ibrahim@trustagents.ng',
            phone: '+2348076543212',
            isPrimary: false,
            status: 'active',
            createdAt: new Date('2024-02-17').toISOString(),
            updatedAt: new Date('2024-02-17').toISOString(),
        },
        
        // Agent 6 (Corporate - 3 contacts)
        {
            agentId: 6,
            fullName: 'Olumide Bakare',
            designation: 'Managing Director',
            email: 'olumide.bakare@nigeriaagency.com',
            phone: '+2348012345678',
            isPrimary: true,
            status: 'active',
            createdAt: new Date('2024-03-01').toISOString(),
            updatedAt: new Date('2024-03-01').toISOString(),
        },
        {
            agentId: 6,
            fullName: 'Chiamaka Nwachukwu',
            designation: 'Operations Manager',
            email: 'chiamaka.nwachukwu@nigeriaagency.com',
            phone: '+2348012345679',
            isPrimary: false,
            status: 'active',
            createdAt: new Date('2024-03-02').toISOString(),
            updatedAt: new Date('2024-03-02').toISOString(),
        },
        {
            agentId: 6,
            fullName: 'Abdulrahman Sule',
            designation: 'Marketing Manager',
            email: 'abdulrahman.sule@nigeriaagency.com',
            phone: '+2348012345680',
            isPrimary: false,
            status: 'active',
            createdAt: new Date('2024-03-03').toISOString(),
            updatedAt: new Date('2024-03-03').toISOString(),
        },
        
        // Agent 7 (Mix - 2 contacts)
        {
            agentId: 7,
            fullName: 'Kehinde Adeleke',
            designation: 'Principal Agent',
            email: 'kehinde.adeleke@reliable.ng',
            phone: '+2348098765432',
            isPrimary: true,
            status: 'active',
            createdAt: new Date('2024-03-10').toISOString(),
            updatedAt: new Date('2024-03-10').toISOString(),
        },
        {
            agentId: 7,
            fullName: 'Zainab Bello',
            designation: 'Assistant',
            email: 'zainab.bello@reliable.ng',
            phone: '+2348098765433',
            isPrimary: false,
            status: 'active',
            createdAt: new Date('2024-03-11').toISOString(),
            updatedAt: new Date('2024-03-11').toISOString(),
        },
        
        // Agent 8 (Mix - 2 contacts)
        {
            agentId: 8,
            fullName: 'Samuel Johnson',
            designation: 'Operations Manager',
            email: 'samuel.johnson@bestagents.com.ng',
            phone: '+2348032109876',
            isPrimary: true,
            status: 'active',
            createdAt: new Date('2024-03-15').toISOString(),
            updatedAt: new Date('2024-03-15').toISOString(),
        },
        {
            agentId: 8,
            fullName: 'Grace Udo',
            designation: 'Accounts Officer',
            email: 'grace.udo@bestagents.com.ng',
            phone: '+2348032109877',
            isPrimary: false,
            status: 'active',
            createdAt: new Date('2024-03-16').toISOString(),
            updatedAt: new Date('2024-03-16').toISOString(),
        },
        
        // Agent 9 (Mix - 2 contacts)
        {
            agentId: 9,
            fullName: 'Tunde Ogunleye',
            designation: 'Principal Agent',
            email: 'tunde.ogunleye@firstclass.ng',
            phone: '+2348054321098',
            isPrimary: true,
            status: 'active',
            createdAt: new Date('2024-03-20').toISOString(),
            updatedAt: new Date('2024-03-20').toISOString(),
        },
        {
            agentId: 9,
            fullName: 'Ngozi Chukwu',
            designation: 'Secretary',
            email: 'ngozi.chukwu@firstclass.ng',
            phone: '+2348054321099',
            isPrimary: false,
            status: 'active',
            createdAt: new Date('2024-03-21').toISOString(),
            updatedAt: new Date('2024-03-21').toISOString(),
        },
        
        // Agent 10 (Mix - 2 contacts)
        {
            agentId: 10,
            fullName: 'Abubakar Sani',
            designation: 'Managing Director',
            email: 'abubakar.sani@eliteagency.ng',
            phone: '+2348078901234',
            isPrimary: true,
            status: 'active',
            createdAt: new Date('2024-03-25').toISOString(),
            updatedAt: new Date('2024-03-25').toISOString(),
        },
        {
            agentId: 10,
            fullName: 'Amaka Okafor',
            designation: 'Marketing Manager',
            email: 'amaka.okafor@eliteagency.ng',
            phone: '+2348078901235',
            isPrimary: false,
            status: 'active',
            createdAt: new Date('2024-03-26').toISOString(),
            updatedAt: new Date('2024-03-26').toISOString(),
        },
    ];

    await db.insert(agentContacts).values(sampleAgentContacts);
    
    console.log('✅ Agent contacts seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});