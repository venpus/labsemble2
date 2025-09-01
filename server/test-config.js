#!/usr/bin/env node

// config.js 테스트 스크립트
console.log('🧪 [Test] Config.js 테스트 시작...\n');

try {
  // config 로드
  const config = require('./config/config');
  
  console.log('✅ [Test] Config 로드 성공!');
  console.log('📋 [Test] 현재 설정:');
  console.log('  - 환경:', config.env);
  console.log('  - 이미지 URL:', config.imageBaseUrl);
  console.log('  - 정적 URL:', config.staticBaseUrl);
  console.log('  - 포트:', config.port);
  console.log('  - 시간대:', config.timezone);
  console.log('  - CORS Origin:', config.corsOrigin);
  console.log('  - 업로드 경로:', config.uploadPath);
  console.log('  - 상용서버 여부:', config.isProduction);
  console.log('  - 개발서버 여부:', config.isDevelopment);
  
  // 환경 감지 테스트
  console.log('\n🔍 [Test] 환경 감지 테스트:');
  const os = require('os');
  console.log('  - 호스트명:', os.hostname());
  console.log('  - 플랫폼:', os.platform());
  console.log('  - 아키텍처:', os.arch());
  
  // 네트워크 인터페이스 확인
  const networkInterfaces = os.networkInterfaces();
  console.log('\n🌐 [Test] 네트워크 인터페이스:');
  for (const name of Object.keys(networkInterfaces)) {
    for (const interface of networkInterfaces[name]) {
      if (interface.family === 'IPv4') {
        console.log(`  - ${name}: ${interface.address} (내부: ${interface.internal})`);
      }
    }
  }
  
  console.log('\n🎉 [Test] 모든 테스트 완료!');
  
} catch (error) {
  console.error('❌ [Test] Config 로드 실패:', error.message);
  process.exit(1);
} 