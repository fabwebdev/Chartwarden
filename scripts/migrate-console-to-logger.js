/**
 * Console to Logger Migration Script
 * TICKET #015: Automated replacement of console.* statements
 *
 * This script replaces all console.log/error/warn/info statements
 * with proper Pino logger calls that include PHI protection.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

/**
 * Recursively get all JS files in a directory
 */
function getAllJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, dist, build directories
      if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
        getAllJsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Statistics
let stats = {
  filesProcessed: 0,
  filesModified: 0,
  consoleLogs: 0,
  consoleErrors: 0,
  consoleWarns: 0,
  consoleInfos: 0,
  totalReplacements: 0
};

/**
 * Check if file already has logger import
 */
function hasLoggerImport(content) {
  return /import\s+.*\s+from\s+['"].*logger\.js['"]/.test(content) ||
         /import\s+.*logger.*from/.test(content);
}

/**
 * Add logger import to file
 */
function addLoggerImport(content, filePath) {
  // Determine relative path to logger.js
  const fileDir = path.dirname(filePath);
  const loggerPath = path.join(rootDir, 'src/utils/logger.js');
  let relativePath = path.relative(fileDir, loggerPath);

  // Ensure path starts with ./  or ../
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }

  // Convert Windows paths to Unix
  relativePath = relativePath.split(path.sep).join('/');

  // Find the last import statement
  const importRegex = /^import\s+.*from\s+['"].*['"];?\s*$/gm;
  const imports = content.match(importRegex);

  if (imports && imports.length > 0) {
    // Add after the last import
    const lastImport = imports[imports.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertPosition = lastImportIndex + lastImport.length;

    const importStatement = `\nimport { logger } from '${relativePath}';`;

    content = content.slice(0, insertPosition) + importStatement + content.slice(insertPosition);
  } else {
    // No imports found, add at the beginning
    const importStatement = `import { logger } from '${relativePath}';\n\n`;
    content = importStatement + content;
  }

  return content;
}

/**
 * Replace console.log with logger calls
 */
function replaceConsoleCalls(content) {
  let modified = false;
  let localStats = {
    log: 0,
    error: 0,
    warn: 0,
    info: 0
  };

  // Replace console.log
  const logPattern = /console\.log\((.*?)\);?/g;
  if (logPattern.test(content)) {
    content = content.replace(/console\.log\((.*?)\);?/g, (match, args) => {
      modified = true;
      localStats.log++;
      return `logger.info(${args})`;
    });
  }

  // Replace console.error
  const errorPattern = /console\.error\((.*?)\);?/g;
  if (errorPattern.test(content)) {
    content = content.replace(/console\.error\((.*?)\);?/g, (match, args) => {
      modified = true;
      localStats.error++;
      return `logger.error(${args})`;
    });
  }

  // Replace console.warn
  const warnPattern = /console\.warn\((.*?)\);?/g;
  if (warnPattern.test(content)) {
    content = content.replace(/console\.warn\((.*?)\);?/g, (match, args) => {
      modified = true;
      localStats.warn++;
      return `logger.warn(${args})`;
    });
  }

  // Replace console.info
  const infoPattern = /console\.info\((.*?)\);?/g;
  if (infoPattern.test(content)) {
    content = content.replace(/console\.info\((.*?)\);?/g, (match, args) => {
      modified = true;
      localStats.info++;
      return `logger.info(${args})`;
    });
  }

  return { content, modified, localStats };
}

/**
 * Process a single file
 */
async function processFile(filePath) {
  stats.filesProcessed++;

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Skip if no console statements
    if (!/console\.(log|error|warn|info)/.test(content)) {
      return;
    }

    // Replace console calls
    const { content: newContent, modified, localStats } = replaceConsoleCalls(content);

    if (modified) {
      // Add logger import if not present
      let finalContent = newContent;
      if (!hasLoggerImport(finalContent)) {
        finalContent = addLoggerImport(finalContent, filePath);
      }

      // Write back to file
      fs.writeFileSync(filePath, finalContent, 'utf8');

      stats.filesModified++;
      stats.consoleLogs += localStats.log;
      stats.consoleErrors += localStats.error;
      stats.consoleWarns += localStats.warn;
      stats.consoleInfos += localStats.info;
      stats.totalReplacements += localStats.log + localStats.error + localStats.warn + localStats.info;

      console.log(`✅ ${path.relative(rootDir, filePath)}: ${localStats.log + localStats.error + localStats.warn + localStats.info} replacements`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting console.* to logger migration...\n');

  // Find all JS files in src directory
  const srcDir = path.join(rootDir, 'src');
  const files = getAllJsFiles(srcDir);

  console.log(`📁 Found ${files.length} JavaScript files\n`);

  // Process each file
  for (const file of files) {
    await processFile(file);
  }

  // Print statistics
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Statistics');
  console.log('='.repeat(60));
  console.log(`Files Processed:      ${stats.filesProcessed}`);
  console.log(`Files Modified:       ${stats.filesModified}`);
  console.log(`console.log:          ${stats.consoleLogs} → logger.info`);
  console.log(`console.error:        ${stats.consoleErrors} → logger.error`);
  console.log(`console.warn:         ${stats.consoleWarns} → logger.warn`);
  console.log(`console.info:         ${stats.consoleInfos} → logger.info`);
  console.log(`Total Replacements:   ${stats.totalReplacements}`);
  console.log('='.repeat(60));

  if (stats.totalReplacements > 0) {
    console.log('\n✅ Migration completed successfully!');
    console.log('\n⚠️  Important: Review the changes and test thoroughly before committing.');
  } else {
    console.log('\n✅ No console statements found. Already migrated!');
  }
}

// Run migration
migrate().catch(console.error);
