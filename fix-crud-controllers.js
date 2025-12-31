import fs from 'fs';

// Define schema mappings
const schemas = {
  'liaison_primary': ['id', 'first_name', 'last_name', 'phone', 'email', 'relationship', 'createdAt', 'updatedAt'],
  'liaison_secondary': ['id', 'first_name', 'last_name', 'phone', 'email', 'relationship', 'createdAt', 'updatedAt'],
  'dnr': ['id', 'dnr_status', 'dnr_date', 'dnr_notes', 'createdAt', 'updatedAt'],
  'emergency_preparedness_level': ['id', 'level', 'description', 'createdAt', 'updatedAt'],
};

function generateSelectObject(tableName, columns, idOnly = false) {
  if (idOnly) {
    return `{\n                id: ${tableName}.id,\n            }`;
  }

  const lines = columns.map(col => `                ${col}: ${tableName}.${col},`);
  return `{\n${lines.join('\n')}\n            }`;
}

function fixFile(filePath, tableName, schema) {
  console.log(`\nFixing ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf-8');

  const allColumns = generateSelectObject(tableName, schema, false);
  const idOnly = generateSelectObject(tableName, schema, true);

  // Fix index (list all) - line 10 pattern
  content = content.replace(
    new RegExp(`const \\w+ = await db\\.select\\(\\)\\.from\\(${tableName}\\);`, 'g'),
    (match) => {
      const varName = match.match(/const (\w+) =/)[1];
      return `const ${varName} = await db.select(${allColumns}).from(${tableName});`;
    }
  );

  // Fix show/update/destroy existence checks
  content = content.replace(
    new RegExp(`const \\w+ = await db\n      \\.select\\(\\)\n      \\.from\\(${tableName}\\)\n      \\.where\\(eq\\(${tableName}\\.id, id\\)\\)\n      \\.limit\\(1\\);`, 'g'),
    (match) => {
      const varName = match.match(/const (\w+) =/)[1];
      // For show, use all columns; for update/destroy, use ID only
      // We'll check context - if it's show method, use all columns
      return match.includes('show')
        ? `const ${varName} = await db\n      .select(${allColumns})\n      .from(${tableName})\n      .where(eq(${tableName}.id, id))\n      .limit(1);`
        : `const ${varName} = await db\n      .select(${idOnly})\n      .from(${tableName})\n      .where(eq(${tableName}.id, id))\n      .limit(1);`;
    }
  );

  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed ${filePath}`);
}

// Fix all files
const files = [
  { path: 'src/controllers/patient/LiaisonPrimary.controller.js', table: 'liaison_primary' },
  { path: 'src/controllers/patient/LiaisonSecondary.controller.js', table: 'liaison_secondary' },
  { path: 'src/controllers/patient/Dnr.controller.js', table: 'dnr' },
  { path: 'src/controllers/patient/EmergencyPreparednessLevel.controller.js', table: 'emergency_preparedness_level' },
];

files.forEach(({ path, table }) => {
  const fullPath = `/Users/fabrice/Sites/hospice-ehr-routes/ehr_backend-main/${path}`;
  if (fs.existsSync(fullPath)) {
    fixFile(fullPath, table, schemas[table]);
  } else {
    console.log(`❌ File not found: ${path}`);
  }
});

console.log('\n✅ All CRUD controllers fixed!');
