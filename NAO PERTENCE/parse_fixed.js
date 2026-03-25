const fs = require('fs');

const data = fs.readFileSync('docs/database/00_DATABASE_FOUNDATION.sql', 'utf8');
const lines = data.split('\n');

let currentTable = null;
const results = [];

for (let line of lines) {
    line = line.replace('\r', '');
    
    // Check for table start
    const tableMatch = line.match(/^CREATE TABLE (IF NOT EXISTS )?(public\.)?(mma_[a-zA-Z_]+)/);
    if (tableMatch) {
        currentTable = tableMatch[3];
        continue;
    }
    
    // Check for table end
    if (line.match(/^\);/)) {
        currentTable = null;
        continue;
    }
    
    // Check for columns inside table
    // It looks like indentation is 4 spaces "    column_name DATA_TYPE..."
    if (currentTable && line.startsWith('    ')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
            const colName = parts[0];
            let dataType = parts[1];
            // remove trailing comma if present
            if (dataType.endsWith(',')) dataType = dataType.slice(0, -1);
            
            // ignore keys and constraints
            if (!['PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK', 'CONSTRAINT'].includes(colName.toUpperCase()) && !colName.startsWith('--')) {
                results.push(`${currentTable}\t${colName}\t${dataType}`);
            }
        }
    }
}

console.log('table_name\tcolumn_name\tdata_type');
console.log(results.join('\n'));
