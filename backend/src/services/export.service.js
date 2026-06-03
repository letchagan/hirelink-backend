module.exports = {
  // Generates standard CSV format
  generateCSV(headers, rows) {
    const csvRows = [];
    // Add header row
    csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

    // Add data rows
    for (const row of rows) {
      const values = row.map(val => {
        const text = val === null || val === undefined ? '' : String(val);
        return `"${text.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  },

  // Generates an Excel-compatible XML spreadsheet format
  generateExcel(headers, rows) {
    let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="Report">
  <Table>
   <Row>`;
    
    // Add Headers
    headers.forEach(h => {
      xml += `<Cell><Data ss:Type="String">${h}</Data></Cell>`;
    });
    xml += `</Row>`;

    // Add Rows
    rows.forEach(row => {
      xml += `<Row>`;
      row.forEach(val => {
        const type = typeof val === 'number' ? 'Number' : 'String';
        const cleanVal = val === null || val === undefined ? '' : String(val);
        xml += `<Cell><Data ss:Type="${type}">${cleanVal}</Data></Cell>`;
      });
      xml += `</Row>`;
    });

    xml += `  </Table>
 </Worksheet>
</Workbook>`;
    return xml;
  }
};
