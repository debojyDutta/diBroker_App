const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');

/**
 * Writes mergedObj to a CSV file in the specified output directory.
 * @param {Object} mergedObj - The object containing weekly candle data.
 * @param {String} [outputDir='../output'] - Directory where the CSV should be saved.
 * @returns {String} The full path of the saved CSV file.
 */
function writeMergedObjToCSV(mergedObj, outputDir = path.join(__dirname, '../output')) {
  // Flatten mergedObj into array of rows
  const rows = [];
  for (const [week, entries] of Object.entries(mergedObj)) {
    (Array.isArray(entries) ? entries : [entries]).forEach((entry) => {
      rows.push({ week, ...entry });
    });
  }

  if (rows.length === 0) {
    throw new Error('No data found in mergedObj to write to CSV');
  }

  // Convert to CSV
  const fields = Object.keys(rows[0]);
  const parser = new Parser({ fields });
  const csv = parser.parse(rows);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write file
  const fileName = `merged_output_${Date.now()}.csv`;
  const filePath = path.join(outputDir, fileName);
  fs.writeFileSync(filePath, csv);

  console.log(`CSV written to ${filePath}`);
  return filePath;
}

module.exports = { writeMergedObjToCSV };
