import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = join(dirPath, file);
    if (statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else if (file === 'route.ts') {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

function fixFile(filePath) {
  let content = readFileSync(filePath, 'utf8');
  let modified = false;

  // Skip if already properly handled
  if (!content.includes('Promise<{ id: string')) {
    return false;
  }

  // Check if already has await params
  if (content.includes('const { id } = await params;')) {
    console.log(`Fixing duplicate id declarations in: ${filePath}`);
    
    // Fix duplicate const id = parseInt(id) declarations
    // Find and replace pattern like:
    //   const { id } = await params;
    //   ...
    //   const id = parseInt(id);
    // with:
    //   const { id } = await params;
    //   ...
    //   const parsedId = parseInt(id);
    
    content = content.replace(
      /(const \{ id \} = await params;[\s\S]{0,300}?)\n(\s*)const id = parseInt\(id\);/g,
      '$1\n$2const parsedId = parseInt(id);'
    );
    
    // Now replace usages of id (after the parseInt) with parsedId
    // Split content by functions to handle each separately
    const lines = content.split('\n');
    const newLines = [];
    let inFunction = false;
    let hasAwaitParams = false;
    let hasParsedId = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('export async function')) {
        inFunction = true;
        hasAwaitParams = false;
        hasParsedId = false;
      }
      
      if (inFunction && line.includes('const { id } = await params;')) {
        hasAwaitParams = true;
      }
      
      if (inFunction && line.includes('const parsedId = parseInt(id);')) {
        hasParsedId = true;
      }
      
      // In the function body after parsedId, replace id with parsedId (but not in variable names)
      if (inFunction && hasAwaitParams && hasParsedId && i > 0) {
        // Replace eq(table.id, id) with eq(table.id, parsedId)
        let newLine = line;
        newLine = newLine.replace(/eq\(([a-z]+)\.id,\s*id\)/g, 'eq($1.id, parsedId)');
        newLine = newLine.replace(/eq\(([a-z]+)\.agentId,\s*id\)/g, 'eq($1.agentId, parsedId)');
        newLine = newLine.replace(/eq\(([a-z]+)\.bankId,\s*id\)/g, 'eq($1.bankId, parsedId)');
        newLine = newLine.replace(/eq\(([a-z]+)\.userId,\s*id\)/g, 'eq($1.userId, parsedId)');
        newLine = newLine.replace(/eq\(([a-z]+)\.policyId,\s*id\)/g, 'eq($1.policyId, parsedId)');
        newLine = newLine.replace(/eq\(([a-z]+)\.lobId,\s*id\)/g, 'eq($1.lobId, parsedId)');
        newLine = newLine.replace(/eq\(([a-z]+)\.insurerId,\s*id\)/g, 'eq($1.insurerId, parsedId)');
        newLine = newLine.replace(/agentId:\s*id([,\s])/g, 'agentId: parsedId$1');
        newLine = newLine.replace(/bankId:\s*id([,\s])/g, 'bankId: parsedId$1');
        newLine = newLine.replace(/userId:\s*id([,\s])/g, 'userId: parsedId$1');
        newLine = newLine.replace(/id:\s*id([,\s])/g, 'id: parsedId$1');
        newLines.push(newLine);
      } else {
        newLines.push(line);
      }
      
      // Reset when function ends
      if (line.match(/^\}[\s]*$/)) {
        inFunction = false;
      }
    }
    
    content = newLines.join('\n');
    modified = true;
  }

  if (modified) {
    writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ Fixed`);
    return true;
  }

  return false;
}

// Main
const apiDir = join(process.cwd(), 'src', 'app', 'api');
const routeFiles = getAllFiles(apiDir);

console.log(`Found ${routeFiles.length} route files\n`);

let fixedCount = 0;
for (const file of routeFiles) {
  try {
    if (fixFile(file)) {
      fixedCount++;
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
}

console.log(`\n✅ Fixed ${fixedCount} files`);
