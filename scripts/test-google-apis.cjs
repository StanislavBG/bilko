const { google } = require('googleapis');

async function main() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
  
  if (!credentials.client_email) {
    console.error('ERROR: GOOGLE_SERVICE_ACCOUNT_KEY not found or invalid');
    process.exit(1);
  }
  
  console.log('Service Account:', credentials.client_email);
  console.log('---');

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/chat.spaces.readonly',
    ],
  });

  const authClient = await auth.getClient();

  console.log('\n=== GOOGLE SHEETS (via Drive API) ===\n');
  try {
    const drive = google.drive({ version: 'v3', auth: authClient });
    const res = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      pageSize: 10,
      fields: 'files(id, name, createdTime)',
    });
    
    if (res.data.files && res.data.files.length > 0) {
      console.log('Found', res.data.files.length, 'spreadsheet(s):');
      res.data.files.forEach((file, i) => {
        console.log(`  ${i + 1}. ${file.name}`);
        console.log(`     ID: ${file.id}`);
      });
    } else {
      console.log('No spreadsheets found.');
      console.log('(Service account can only see sheets shared with:', credentials.client_email, ')');
    }
  } catch (err) {
    console.error('Sheets Error:', err.message);
  }

  console.log('\n=== GOOGLE CHAT ===\n');
  try {
    const chat = google.chat({ version: 'v1', auth: authClient });
    const res = await chat.spaces.list({ pageSize: 10 });
    
    if (res.data.spaces && res.data.spaces.length > 0) {
      console.log('Found', res.data.spaces.length, 'space(s):');
      res.data.spaces.forEach((space, i) => {
        console.log(`  ${i + 1}. ${space.displayName || space.name}`);
      });
    } else {
      console.log('No chat spaces found.');
    }
  } catch (err) {
    console.error('Chat Error:', err.message);
    if (err.message.includes('domain-wide delegation')) {
      console.log('\n(Note: Google Chat API requires Workspace domain-wide delegation for service accounts)');
    }
  }
}

main().catch(console.error);
