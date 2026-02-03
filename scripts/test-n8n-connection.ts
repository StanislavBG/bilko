/**
 * Test n8n connection - run with: npx tsx scripts/test-n8n-connection.ts
 * This script uses Replit Secrets to test the n8n API connection.
 */

async function testConnection() {
  const baseUrl = process.env.N8N_API_BASE_URL;
  const apiKey = process.env.N8N_API_KEY;

  console.log("=== n8n Connection Test ===\n");
  console.log("N8N_API_BASE_URL:", baseUrl ? `${baseUrl.substring(0, 30)}...` : "NOT SET");
  console.log("N8N_API_KEY:", apiKey ? `${apiKey.substring(0, 4)}...` : "NOT SET");

  if (!baseUrl || !apiKey) {
    console.log("\n❌ Missing environment variables. Add them to Replit Secrets.");
    process.exit(1);
  }

  console.log("\nTesting connection...");

  try {
    const response = await fetch(`${baseUrl}/workflows`, {
      headers: {
        "X-N8N-API-KEY": apiKey,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.log(`\n❌ API returned ${response.status}: ${response.statusText}`);
      const text = await response.text();
      console.log("Response:", text.substring(0, 200));
      process.exit(1);
    }

    const data = await response.json();
    console.log(`\n✅ Connection successful!`);
    console.log(`Found ${data.data?.length || 0} workflows:`);

    for (const wf of (data.data || []).slice(0, 5)) {
      console.log(`  - ${wf.name} (${wf.id}) [${wf.active ? "active" : "inactive"}]`);
    }

    if ((data.data?.length || 0) > 5) {
      console.log(`  ... and ${data.data.length - 5} more`);
    }

  } catch (error) {
    console.log("\n❌ Connection failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testConnection();
