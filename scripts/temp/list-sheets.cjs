const { google } = require('googleapis');

async function main() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
  
  if (!credentials.client_email) {
    console.error('ERROR: GOOGLE_SERVICE_ACCOUNT_KEY not found or invalid');
    process.exit(1);
  }
  
  console.log('='.repeat(60));
  console.log('Service Account:', credentials.client_email);
  console.log('='.repeat(60));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
    ],
  });

  const authClient = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: authClient });
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  console.log('\nSearching for spreadsheets...\n');

  try {
    const res = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      pageSize: 20,
      fields: 'files(id, name, createdTime, modifiedTime)',
    });
    
    if (!res.data.files || res.data.files.length === 0) {
      console.log('No spreadsheets found.');
      console.log('\nTIP: Share a spreadsheet with this email to see it here:');
      console.log('    ', credentials.client_email);
      return;
    }

    console.log(`Found ${res.data.files.length} spreadsheet(s):\n`);

    for (let i = 0; i < res.data.files.length; i++) {
      const file = res.data.files[i];
      console.log('-'.repeat(60));
      console.log(`SPREADSHEET ${i + 1}: ${file.name}`);
      console.log(`ID: ${file.id}`);
      console.log(`Modified: ${file.modifiedTime}`);
      console.log('-'.repeat(60));

      try {
        const sheetData = await sheets.spreadsheets.get({
          spreadsheetId: file.id,
          includeGridData: false,
        });

        const sheetNames = sheetData.data.sheets.map(s => s.properties.title);
        console.log(`Tabs: ${sheetNames.join(', ')}\n`);

        for (const sheetName of sheetNames.slice(0, 3)) {
          console.log(`  [${sheetName}]`);
          
          try {
            const values = await sheets.spreadsheets.values.get({
              spreadsheetId: file.id,
              range: `'${sheetName}'!A1:F10`,
            });

            if (values.data.values && values.data.values.length > 0) {
              values.data.values.slice(0, 5).forEach((row, idx) => {
                const preview = row.slice(0, 4).map(cell => 
                  String(cell).substring(0, 20) + (String(cell).length > 20 ? '...' : '')
                ).join(' | ');
                console.log(`    Row ${idx + 1}: ${preview}`);
              });
              if (values.data.values.length > 5) {
                console.log(`    ... and ${values.data.values.length - 5} more rows`);
              }
            } else {
              console.log('    (empty)');
            }
          } catch (err) {
            console.log(`    Error reading: ${err.message}`);
          }
          console.log('');
        }

        if (sheetNames.length > 3) {
          console.log(`  ... and ${sheetNames.length - 3} more tabs\n`);
        }

      } catch (err) {
        console.log(`  Error accessing spreadsheet: ${err.message}\n`);
      }
    }

  } catch (err) {
    console.error('Error:', err.message);
    if (err.message.includes('has not been used') || err.message.includes('disabled')) {
      console.log('\nTIP: Enable the Drive API at:');
      console.log('https://console.developers.google.com/apis/api/drive.googleapis.com/overview');
    }
  }
}

main().catch(console.error);
