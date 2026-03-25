const fs = require('fs');

const content = fs.readFileSync('docs/database/00_DATABASE_FOUNDATION.sql', 'utf8');
const lines = content.split('\n');

let currentTable = null;
const results = [];

lines.forEach(line => {
    line = line.trimEnd(); // Keep leading spaces for indentation detection
    
    // Detect table start
    const tableMatch = line.match(/^CREATE TABLE (public\.)?(mma_[a-zA-Z_]+)( \()?/);
    if (tableMatch) {
        currentTable = tableMatch[2];
        return;
    }

    if (!currentTable) return;

    // Detect table end
    if (line.match(/^\);/)) {
        currentTable = null;
        return;
    }

    // Detect column
    // Columns typically start with 4 spaces in this file
    const colMatch = line.match(/^    ([a-zA-Z_]+)\s+([a-zA-Z_]+(\([^)]+\))?)/);
    
    if (colMatch) {
        const colName = colMatch[1];
        const dataType = colMatch[2];

        // Ignore constraints
        if (!['PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK'].includes(colName.toUpperCase())) {
            results.push(`${currentTable}\t${colName}\t${dataType}`);
        }
    }
});

console.log("table_name\tcolumn_name\tdata_type");
results.forEach(r => console.log(r));
