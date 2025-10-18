/**
 * Fix Next.js 15 params breaking change
 * In Next.js 15, route params are now Promises and must be awaited
 * This script automatically fixes all route files
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

async function fixRouteFile(filePath) {
  console.log(`\nProcessing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Pattern 1: Single param { params: { id: string } }
  const singleParamRegex = /\{\s*params\s*\}:\s*\{\s*params:\s*\{\s*id:\s*string\s*\}\s*\}/g;
  if (singleParamRegex.test(content)) {
    content = content.replace(
      /export async function (GET|POST|PUT|PATCH|DELETE)\([^,]+,\s*\{\s*params\s*\}:\s*\{\s*params:\s*\{\s*id:\s*string\s*\}\s*\}\)/g,
      (match, method) => {
        const newSignature = match.replace(
          /\{\s*params\s*\}:\s*\{\s*params:\s*\{\s*id:\s*string\s*\}\s*\}/,
          '{ params }: { params: Promise<{ id: string }> }'
        );
        return newSignature;
      }
    );
    
    // Add await params destructuring after the function signature
    content = content.replace(
      /(export async function (?:GET|POST|PUT|PATCH|DELETE)\([^)]+\) \{[^}]*?)\n(\s*)(?:const\s+(?:\w+)\s*=\s*parseInt\(params\.id\)|const\s+\{\s*id\s*\}\s*=\s*params)/g,
      (match, functionStart, indent) => {
        // Check if await params already exists
        if (functionStart.includes('await params')) {
          return match;
        }
        return `${functionStart}\n${indent}const { id } = await params;\n${indent}const`;
      }
    );
    
    // Fix params.id references to use destructured id
    content = content.replace(/parseInt\(params\.id\)/g, 'parseInt(id)');
    
    modified = true;
    console.log('  ✓ Fixed single param routes');
  }
  
  // Pattern 2: Multi param { params: { id: string; contactId: string } }
  const multiParamRegex = /\{\s*params\s*\}:\s*\{\s*params:\s*\{\s*id:\s*string;\s*(\w+):\s*string\s*\}\s*\}/g;
  if (multiParamRegex.test(content)) {
    // Get the param names
    const match = content.match(/\{\s*params\s*\}:\s*\{\s*params:\s*\{\s*id:\s*string;\s*(\w+):\s*string\s*\}\s*\}/);
    if (match) {
      const secondParam = match[1];
      
      content = content.replace(
        /\{\s*params\s*\}:\s*\{\s*params:\s*\{\s*id:\s*string;\s*(\w+):\s*string\s*\}\s*\}/g,
        (match, param) => `{ params }: { params: Promise<{ id: string; ${param}: string }> }`
      );
      
      // Add await params destructuring
      content = content.replace(
        /(export async function (?:GET|POST|PUT|PATCH|DELETE)\([^)]+\) \{[^}]*?)\n(\s*)const\s+\w+\s*=\s*parseInt\(params\.id\)/g,
        (match, functionStart, indent) => {
          if (functionStart.includes('await params')) {
            return match;
          }
          return `${functionStart}\n${indent}const { id, ${secondParam}: ${secondParam}Str } = await params;\n${indent}const agentId = parseInt(id);\n${indent}const ${secondParam} = parseInt(${secondParam}Str);\n${indent}const`;
        }
      );
      
      modified = true;
      console.log('  ✓ Fixed multi-param routes');
    }
  }
  
  // Pattern 3: Routes that already destructure params inline
  content = content.replace(
    /export async function (GET|POST|PUT|PATCH|DELETE)\(\s*request:\s*NextRequest,\s*\{\s*params\s*\}:\s*\{\s*params:\s*\{\s*(\w+):\s*string\s*\}\s*\}\s*\)\s*\{\s*const\s+\{([^}]+)\}\s*=\s*params;/g,
    (match, method, paramType, destructured) => {
      return `export async function ${method}(\n  request: NextRequest,\n  { params }: { params: Promise<{ ${paramType}: string }> }\n) {\n  const {${destructured}} = await params;`;
    }
  );
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('  ✓ File updated successfully');
    return true;
  } else {
    console.log('  - No changes needed');
    return false;
  }
}

async function main() {
  console.log('🔧 Fixing Next.js 15 params in all route files...\n');
  
  const routeFiles = await glob('src/app/api/**/route.ts', {
    cwd: process.cwd(),
    absolute: true,
    windowsPathsNoEscape: true
  });
  
  console.log(`Found ${routeFiles.length} route files\n`);
  
  let fixedCount = 0;
  
  for (const file of routeFiles) {
    try {
      const wasFixed = await fixRouteFile(file);
      if (wasFixed) fixedCount++;
    } catch (error) {
      console.error(`  ✗ Error processing ${file}:`, error.message);
    }
  }
  
  console.log(`\n✅ Complete! Fixed ${fixedCount} out of ${routeFiles.length} files`);
}

main().catch(console.error);
