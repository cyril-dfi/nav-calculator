import { LSTPricesService } from '../services/lstPricesService';

async function testLstPrices() {
  try {
    const service = new LSTPricesService();
    
    // Test a sample of LST tokens
    const tokens = ['WSTETH', 'RETH', 'WEETH', 'WETH', 'CBETH'];
    
    console.log('Fetching LST prices...');
    const prices = await service.getRedeemPrices(tokens);
    
    console.log('\nResults:');
    for (const [token, price] of Object.entries(prices)) {
      console.log(`${token}: ${price.toFixed(6)} ETH`);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testLstPrices();
