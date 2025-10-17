import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { centralizedSequences, clientSequences } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateSequenceNumber, generateClientCode } from '@/lib/sequenceGenerator';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const testType = searchParams.get('type') || 'sequence';
    const scope = searchParams.get('scope') || 'client';
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;

    if (testType === 'sequence') {
      // Test generateSequenceNumber function
      const results = [];
      
      // Test first sequence number
      const seq1 = await generateSequenceNumber(scope, year);
      results.push({
        test: 'First sequence call',
        scope,
        year: year || new Date().getFullYear(),
        result: seq1,
        expected: 1,
        passed: seq1 === 1
      });
      
      // Test second sequence number
      const seq2 = await generateSequenceNumber(scope, year);
      results.push({
        test: 'Second sequence call',
        scope,
        year: year || new Date().getFullYear(),
        result: seq2,
        expected: 2,
        passed: seq2 === 2
      });
      
      // Test different scope has independent sequence
      const differentScope = await generateSequenceNumber('policy', year);
      results.push({
        test: 'Different scope independence',
        scope: 'policy',
        year: year || new Date().getFullYear(),
        result: differentScope,
        expected: 1,
        passed: differentScope === 1
      });
      
      // Test different year has independent sequence
      const differentYear = await generateSequenceNumber(scope, (year || new Date().getFullYear()) + 1);
      results.push({
        test: 'Different year independence',
        scope,
        year: (year || new Date().getFullYear()) + 1,
        result: differentYear,
        expected: 1,
        passed: differentYear === 1
      });

      return NextResponse.json({
        testType: 'generateSequenceNumber',
        results,
        allPassed: results.every(r => r.passed),
        summary: `${results.filter(r => r.passed).length}/${results.length} tests passed`
      });
      
    } else if (testType === 'client-code') {
      // Test generateClientCode function
      const results = [];
      
      // Test Individual client code
      const indCode1 = await generateClientCode('Individual', year);
      const indExpectedPattern = new RegExp(`MEIBL/CL/${year || new Date().getFullYear()}/IND/00001`);
      results.push({
        test: 'Individual client code - first',
        clientType: 'Individual',
        year: year || new Date().getFullYear(),
        result: indCode1,
        expectedPattern: indExpectedPattern.source,
        passed: indExpectedPattern.test(indCode1)
      });
      
      // Test Corporate client code
      const corpCode1 = await generateClientCode('Corporate', year);
      const corpExpectedPattern = new RegExp(`MEIBL/CL/${year || new Date().getFullYear()}/CORP/00001`);
      results.push({
        test: 'Corporate client code - first',
        clientType: 'Corporate',
        year: year || new Date().getFullYear(),
        result: corpCode1,
        expectedPattern: corpExpectedPattern.source,
        passed: corpExpectedPattern.test(corpCode1)
      });
      
      // Test Individual second code (should be 00002)
      const indCode2 = await generateClientCode('Individual', year);
      const indExpectedPattern2 = new RegExp(`MEIBL/CL/${year || new Date().getFullYear()}/IND/00002`);
      results.push({
        test: 'Individual client code - second',
        clientType: 'Individual',
        year: year || new Date().getFullYear(),
        result: indCode2,
        expectedPattern: indExpectedPattern2.source,
        passed: indExpectedPattern2.test(indCode2)
      });
      
      // Test Corporate second code (should be 00002)
      const corpCode2 = await generateClientCode('Corporate', year);
      const corpExpectedPattern2 = new RegExp(`MEIBL/CL/${year || new Date().getFullYear()}/CORP/00002`);
      results.push({
        test: 'Corporate client code - second',
        clientType: 'Corporate',
        year: year || new Date().getFullYear(),
        result: corpCode2,
        expectedPattern: corpExpectedPattern2.source,
        passed: corpExpectedPattern2.test(corpCode2)
      });

      return NextResponse.json({
        testType: 'generateClientCode',
        results,
        allPassed: results.every(r => r.passed),
        summary: `${results.filter(r => r.passed).length}/${results.length} tests passed`
      });
    }
    
    return NextResponse.json({
      error: 'Invalid test type. Use ?type=sequence or ?type=client-code'
    }, { status: 400 });

  } catch (error) {
    console.error('Sequence generator test error:', error);
    return NextResponse.json({
      error: 'Test failed: ' + error,
      code: 'TEST_FAILED'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientType = 'Corporate', year, count = 1 } = body;
    
    if (clientType !== 'Individual' && clientType !== 'Corporate') {
      return NextResponse.json({
        error: 'clientType must be Individual or Corporate'
      }, { status: 400 });
    }
    
    if (count < 1 || count > 10) {
      return NextResponse.json({
        error: 'count must be between 1 and 10'
      }, { status: 400 });
    }
    
    const results = [];
    
    for (let i = 0; i < count; i++) {
      const clientCode = await generateClientCode(clientType, year);
      results.push({
        iteration: i + 1,
        clientType,
        year: year || new Date().getFullYear(),
        generatedCode: clientCode,
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json({
      testType: 'bulk client code generation',
      results,
      count,
      summary: `Generated ${count} ${clientType} client codes successfully`
    });
    
  } catch (error) {
    console.error('Bulk client code generation test error:', error);
    return NextResponse.json({
      error: 'Bulk generation test failed: ' + error,
      code: 'BULK_TEST_FAILED'
    }, { status: 500 });
  }
}