import { apiClient } from '../server/api-client';
import { db } from '../server/database';

async function beginNewPeriod() {
  console.log('Starting new billing period...');

  try {
    // Fetch current costs from the API
    console.log('Fetching current costs from API...');
    const currentCosts = await apiClient.getCurrentCosts();
    console.log(`Retrieved data for ${currentCosts.length} users`);

    // Insert snapshot into database
    console.log('Creating billing snapshot...');
    const snapshotId = db.insertSnapshot(JSON.stringify(currentCosts));
    console.log(`Created snapshot with ID: ${snapshotId}`);

    // Display summary
    const totalCost = currentCosts.reduce((sum, user) => {
      return sum + (user.usage?.total?.cost || 0);
    }, 0);

    console.log('\n=== New Billing Period Started ===');
    console.log(`Snapshot ID: ${snapshotId}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Users: ${currentCosts.length}`);
    console.log(`Total Cost at Snapshot: $${totalCost.toFixed(2)}`);
    console.log('====================================\n');

    console.log('✅ New billing period created successfully!');
    
  } catch (error) {
    console.error('❌ Failed to create new billing period:');
    console.error(error);
    process.exit(1);
  }
}

beginNewPeriod();