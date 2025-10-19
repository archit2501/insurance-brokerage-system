import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routeFiles = [
  'src/app/api/policies/[id]/endorsements/route.ts',
  'src/app/api/lobs/[id]/sublobs/route.ts',
];

async function fixFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  console.log(`\n📝 Processing: ${filePath}`);
  
  try {
    let content = await fs.readFile(fullPath, 'utf-8');
    let modified = false;

    // Pattern 1: Function with Promise params but missing await at top
    // Match: export async function METHOD(\n  request...,\n  { params }: { params: Promise<...> }\n) {\n  try {
    const pattern1 = /(export async function (GET|POST|PUT|DELETE|PATCH)\(\s*request[^,]*,\s*\{\s*params\s*\}:\s*\{\s*params:\s*Promise<[^>]+>\s*\}\s*\)\s*\{\s*)(try\s*\{)/g;
    
    content = content.replace(pattern1, (match, funcStart, method, tryBlock) => {
      // Check if await params is already there
      if (content.indexOf(funcStart) !== -1 && !content.slice(content.indexOf(funcStart), content.indexOf(funcStart) + 200).includes('await params')) {
        console.log(`  ✓ Adding await params to ${method}`);
        modified = true;
        // Extract params type to know what to destructure
        const paramsMatch = funcStart.match(/Promise<\{\s*([^}]+)\s*\}>/);
        if (paramsMatch) {
          const paramNames = paramsMatch[1].split(',').map(p => p.split(':')[0].trim()).join(', ');
          return `${funcStart}const { ${paramNames} } = await params;\n  ${tryBlock}`;
        }
      }
      return match;
    });

    if (modified) {
      await fs.writeFile(fullPath, content, 'utf-8');
      console.log(`  ✅ Fixed: ${filePath}`);
      return true;
    } else {
      console.log(`  ⏭️  No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 Fixing remaining Next.js 15 params issues...\n');
  
  let fixedCount = 0;
  
  for (const file of routeFiles) {
    const fixed = await fixFile(file);
    if (fixed) fixedCount++;
  }
  
  console.log(`\n✅ Complete! Fixed ${fixedCount} files.`);
}

main().catch(console.error);
