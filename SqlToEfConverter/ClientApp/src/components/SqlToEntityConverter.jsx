import React, { useState } from 'react';

export default function SqlToEntityConverter() {
    const [inputSql, setInputSql] = useState('');
    const [outputEf, setOutputEf] = useState('');
    const [entityName, setEntityName] = useState('Illness');

    const convertSqlToEntityFramework = () => {
        // Extract the table name from the first INSERT statement
        const tableNameMatch = inputSql.match(/INSERT \[dbo\]\.\[([^\]]+)\]/i);
        const tableName = tableNameMatch ? tableNameMatch[1] : entityName;

        // Extract column names from the first INSERT statement
        const columnNamesMatch = inputSql.match(/\(([^)]+)\) VALUES/i);
        if (!columnNamesMatch) {
            return 'Could not parse column names from the SQL.';
        }

        const columnNamesWithBrackets = columnNamesMatch[1].split(',').map(col => col.trim());
        const columnNames = columnNamesWithBrackets.map(col => {
            // Remove brackets and potential dbo prefix
            return col.replace(/\[|\]/g, '');
        });

        // Parse each INSERT statement
        const insertRegex = /INSERT [^\(]+ \([^)]+\) VALUES \(([^)]+)\)/g;
        const values = [];
        let match;

        while ((match = insertRegex.exec(inputSql)) !== null) {
            const valueString = match[1];

            // Split by comma but respect string literals with N'text'
            const rawValues = [];
            let currentValue = '';
            let inString = false;

            for (let i = 0; i < valueString.length; i++) {
                const char = valueString[i];

                if (char === "'" && (i === 0 || valueString[i - 1] !== '\\')) {
                    inString = !inString;
                    currentValue += char;
                } else if (char === ',' && !inString) {
                    rawValues.push(currentValue.trim());
                    currentValue = '';
                } else {
                    currentValue += char;
                }
            }

            if (currentValue.trim()) {
                rawValues.push(currentValue.trim());
            }

            // Process values to clean them up
            const processedValues = rawValues.map(val => {
                // Remove N prefix from strings
                val = val.replace(/^N'(.*)'$/, "'$1'");

                // Convert NULL to null
                if (val.toUpperCase() === 'NULL') {
                    return 'null';
                }

                // Keep strings quoted
                if (val.startsWith("'") && val.endsWith("'")) {
                    return val;
                }

                return val;
            });

            values.push(processedValues);
        }

        // Generate Entity Framework HasData syntax
        let result = `entity.HasData(\n`;

        values.forEach((valueSet, index) => {
            result += `    new ${entityName}\n    {\n`;

            columnNames.forEach((colName, colIndex) => {
                const value = valueSet[colIndex];

                // Format property value based on type
                let formattedValue;
                if (value === 'null') {
                    formattedValue = 'null';
                } else if (value && value.startsWith("'") && value.endsWith("'")) {
                    // String value - remove quotes for C#
                    formattedValue = value;
                } else {
                    formattedValue = value;
                }

                result += `        ${colName} = ${formattedValue},\n`;
            });

            result += `    }${index < values.length - 1 ? ',' : ''}\n`;
        });

        result += ');';

        return result;
    };

    const handleConvert = () => {
        setOutputEf(convertSqlToEntityFramework());
    };

    return (
        <div className="container mt-4">
            <h1 className="mb-4">SQL INSERT to Entity Framework HasData Converter</h1>

            <div className="mb-3">
                <label className="form-label">Entity Name:</label>
                <input
                    type="text"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    className="form-control"
                />
            </div>

            <div className="row">
                <div className="col-md-6">
                    <div className="mb-3">
                        <label className="form-label">Input SQL:</label>
                        <textarea
                            className="form-control font-monospace"
                            value={inputSql}
                            onChange={(e) => setInputSql(e.target.value)}
                            placeholder="Paste SQL INSERT statements here..."
                            rows="12"
                        />
                    </div>
                </div>

                <div className="col-md-6">
                    <div className="mb-3">
                        <label className="form-label">Output Entity Framework:</label>
                        <textarea
                            className="form-control font-monospace bg-light"
                            value={outputEf}
                            readOnly
                            rows="12"
                        />
                    </div>
                </div>
            </div>

            <div className="d-grid gap-2 col-2 mx-auto mb-3">
                <button
                    onClick={handleConvert}
                    className="btn btn-primary"
                >
                    Convert
                </button>
            </div>

            <div className="row mt-3">
                <div className="col">
                    <p><strong>Example Input:</strong> SQL INSERT statements</p>
                    <p><strong>Example Output:</strong> Entity Framework HasData configuration code</p>
                </div>
            </div>
        </div>
    );
}