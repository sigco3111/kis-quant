/**
 * KIS API 프록시 테스트 스크립트
 * 로컬 개발 환경에서 API 엔드포인트 테스트용
 */

const axios = require('axios');

// 테스트 설정
const BASE_URL = 'http://localhost:3000'; // Vercel dev 서버
const TEST_TOKEN = 'test-auth-token';

// 테스트용 암호화된 API 키 데이터 (실제 환경에서는 실제 데이터 사용)
const TEST_API_DATA = {
  encryptedApiKey: {
    salt: 'test-salt',
    iv: 'test-iv',
    encrypted: 'test-encrypted-key'
  },
  encryptedSecret: {
    salt: 'test-salt',
    iv: 'test-iv', 
    encrypted: 'test-encrypted-secret'
  },
  accountNumber: '12345678-01'
};

/**
 * 계좌 정보 조회 테스트
 */
async function testAccountInfo() {
  try {
    console.log('🧪 계좌 정보 조회 테스트 시작...');
    
    const response = await axios.post(`${BASE_URL}/api/kis/account-info`, {
      ...TEST_API_DATA,
      password: 'test-password',
      isPaper: true // 모의투자 모드
    }, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ 계좌 정보 조회 성공:', response.data);
  } catch (error) {
    console.log('❌ 계좌 정보 조회 실패:', error.response?.data || error.message);
  }
}

/**
 * 시장 데이터 조회 테스트
 */
async function testMarketData() {
  try {
    console.log('🧪 시장 데이터 조회 테스트 시작...');
    
    const response = await axios.post(`${BASE_URL}/api/kis/market-data`, {
      ...TEST_API_DATA,
      password: 'test-password',
      stockCode: '005930', // 삼성전자
      isPaper: true
    }, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ 시장 데이터 조회 성공:', response.data);
  } catch (error) {
    console.log('❌ 시장 데이터 조회 실패:', error.response?.data || error.message);
  }
}

/**
 * 주문 테스트
 */
async function testOrder() {
  try {
    console.log('🧪 주문 테스트 시작...');
    
    const response = await axios.post(`${BASE_URL}/api/kis/orders`, {
      ...TEST_API_DATA,
      password: 'test-password',
      stockCode: '005930',
      orderType: 'buy',
      quantity: 1,
      price: 70000,
      orderCondition: '00', // 지정가
      isPaper: true
    }, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ 주문 성공:', response.data);
  } catch (error) {
    console.log('❌ 주문 실패:', error.response?.data || error.message);
  }
}

/**
 * Rate Limiting 테스트
 */
async function testRateLimit() {
  try {
    console.log('🧪 Rate Limiting 테스트 시작...');
    
    // 빠른 연속 요청으로 Rate Limit 테스트
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        axios.post(`${BASE_URL}/api/kis/market-data`, {
          ...TEST_API_DATA,
          password: 'test-password',
          stockCode: '005930',
          isPaper: true
        }, {
          headers: {
            'Authorization': `Bearer ${TEST_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }).catch(err => err.response)
      );
    }

    const results = await Promise.all(promises);
    results.forEach((result, index) => {
      if (result.status === 200) {
        console.log(`✅ 요청 ${index + 1}: 성공`);
      } else if (result.status === 429) {
        console.log(`⚠️ 요청 ${index + 1}: Rate Limit 적용됨`);
      } else {
        console.log(`❌ 요청 ${index + 1}: 실패 (${result.status})`);
      }
    });
  } catch (error) {
    console.log('❌ Rate Limiting 테스트 실패:', error.message);
  }
}

/**
 * 인증 실패 테스트
 */
async function testAuthFailure() {
  try {
    console.log('🧪 인증 실패 테스트 시작...');
    
    const response = await axios.post(`${BASE_URL}/api/kis/account-info`, {
      ...TEST_API_DATA,
      password: 'test-password'
    }, {
      headers: {
        'Content-Type': 'application/json'
        // Authorization 헤더 없음
      }
    });

    console.log('❌ 인증 실패 테스트 실패: 요청이 성공했습니다');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ 인증 실패 테스트 성공: 401 Unauthorized');
    } else {
      console.log('❌ 인증 실패 테스트 실패:', error.response?.data || error.message);
    }
  }
}

/**
 * 모든 테스트 실행
 */
async function runAllTests() {
  console.log('🚀 KIS API 프록시 테스트 시작\n');
  
  await testAccountInfo();
  console.log('');
  
  await testMarketData();
  console.log('');
  
  await testOrder();
  console.log('');
  
  await testRateLimit();
  console.log('');
  
  await testAuthFailure();
  console.log('');
  
  console.log('🏁 모든 테스트 완료');
}

// 스크립트 실행
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testAccountInfo,
  testMarketData,
  testOrder,
  testRateLimit,
  testAuthFailure
}; 