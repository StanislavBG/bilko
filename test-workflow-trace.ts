import { routeWorkflow } from './server/workflows/router';

async function main() {
  console.log('Testing euro-flow with trace...');
  
  const result = await routeWorkflow(
    'european-football-daily',
    'execute', 
    { test: true },
    'replit:shell',
    'test-user'
  );

  console.log('Result:');
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
