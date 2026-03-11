const fs = require('fs');

const data = fs.readFileSync('docs/database/00_DATABASE_FOUNDATION.sql', 'utf8');
const lines = data.split('\n');

let currentTable = null;
const results = [];

for (let line of lines) {
    line = line.replace('\r', '');
    const tableMatch = line.match(/^CREATE TABLE (public\.)?(mma_[a-zA-Z_]+)/);
    if (tableMatch) {
        currentTable = tableMatch[2];
        continue;
    }
    
    if (line.match(/^\);/)) {
        currentTable = null;
        continue;
    }
    
    if (currentTable && line.startsWith('    ')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
            const colName = parts[0];
            let dataType = parts[1];
            if (dataType.endsWith(',')) dataType = dataType.slice(0, -1);
            
            if (!['PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK'].includes(colName.toUpperCase()) && !colName.startsWith('--')) {
                results.push(`${currentTable}\t${colName}\t${dataType}`);
            }
        }
    }
}

console.log('table_name\tcolumn_name\tdata_type');
console.log(results.join('\n'));
