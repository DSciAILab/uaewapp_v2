#!/bin/bash
# A simple awk script to extract table names, column names, and data types from the SQL file.

awk '
BEGIN { 
    current_table = ""; 
    print "table_name\tcolumn_name\tdata_type" 
}
/^CREATE TABLE/ {
    current_table = $3;
    # remove schema if present (e.g., public.mma_events -> mma_events)
    sub(/.*\./, "", current_table);
    # remove trailing (
    sub(/\($/, "", current_table);
}
# Match lines inside table definition that start with indentation and a word (column name)
/^    [a-zA-Z_]+/ {
    if (current_table != "" && current_table ~ /^mma_/) {
        col_name = $1;
        data_type = $2;
        # clean up any commas
        sub(/,$/, "", data_type);
        
        # Dont include constraints like PRIMARY, FOREIGN etc
        if (col_name != "PRIMARY" && col_name != "FOREIGN" && col_name != "UNIQUE" && col_name != "CHECK") {
             print current_table "\t" col_name "\t" data_type;
        }
    }
}
/^\);/ {
    current_table = "";
}
' docs/database/00_DATABASE_FOUNDATION.sql
