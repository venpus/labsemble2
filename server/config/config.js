const config = {
  development: {
    imageBaseUrl: 'http://localhost:5000/images',
    staticBaseUrl: 'http://localhost:5000',
    uploadPath: 'server/uploads/project/mj/registImage',
    corsOrigin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    port: 5000,
    timezone: 'Asia/Seoul'
  },
  production: {
    imageBaseUrl: 'https://labsemble.com/images',
    staticBaseUrl: 'https://labsemble.com',
    uploadPath: 'server/uploads/project/mj/registImage',
    corsOrigin: ['https://labsemble.com', 'http://labsemble.com'],
    port: 5000,
    timezone: 'Asia/Seoul'
  }
};

// 환경 자동 감지 로직
function detectEnvironment() {
  console.log('\n🔍 [Config] ========================================');
  console.log('🔍 [Config] 환경 감지 시작');
  console.log('🔍 [Config] ========================================');
  
  // 1. NODE_ENV 환경변수 확인
  if (process.env.NODE_ENV) {
    console.log('✅ [Config] NODE_ENV 환경변수로 환경 감지:', process.env.NODE_ENV);
    console.log('🔍 [Config] ========================================\n');
    return process.env.NODE_ENV;
  }
  
  console.log('⚠️ [Config] NODE_ENV 환경변수가 설정되지 않음, 자동 감지 시작...');
  
  // 2. 호스트명으로 자동 감지
  const os = require('os');
  const hostname = os.hostname().toLowerCase();
  console.log('🏷️ [Config] 호스트명:', hostname);
  
  // 상용서버 호스트명 패턴 감지
  if (hostname.includes('labsemble') || 
      hostname.includes('prod') || 
      hostname.includes('production') ||
      hostname.includes('server') ||
      hostname.includes('host')) {
    console.log('🌐 [Config] 호스트명으로 상용서버 감지:', hostname);
    console.log('🔍 [Config] ========================================\n');
    return 'production';
  }
  
  // 3. IP 주소로 감지 (로컬 IP가 아닌 경우)
  console.log('🌐 [Config] IP 주소로 환경 감지 시도...');
  const networkInterfaces = os.networkInterfaces();
  for (const name of Object.keys(networkInterfaces)) {
    for (const interface of networkInterfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        const ip = interface.address;
        console.log(`  - ${name}: ${ip} (내부: ${interface.internal})`);
        
        if (!ip.startsWith('192.168.') && 
            !ip.startsWith('10.') && 
            !ip.startsWith('172.') && 
            ip !== '127.0.0.1' && 
            ip !== 'localhost') {
          console.log('🌐 [Config] 외부 IP로 상용서버 감지:', ip);
          console.log('🔍 [Config] ========================================\n');
          return 'production';
        }
      }
    }
  }
  
  // 4. 기본값은 development
  console.log('🏠 [Config] 모든 조건에서 상용서버로 감지되지 않음');
  console.log('🏠 [Config] 개발환경으로 설정 (기본값)');
  console.log('🔍 [Config] ========================================\n');
  return 'development';
}

// 현재 환경 결정
const currentEnv = detectEnvironment();

// 환경별 설정 가져오기
const currentConfig = config[currentEnv];

// 절대 경로 계산 함수
function getAbsoluteUploadPath() {
  const path = require('path');
  const os = require('os');
  
  // 현재 작업 디렉토리 확인
  const cwd = process.cwd();
  console.log('📁 [Config] 현재 작업 디렉토리:', cwd);
  
  // ecosystem.config.js의 cwd 설정 확인
  const ecosystemCwd = '/var/www/labsemble/server';
  
  // 상용서버인 경우 ecosystem.config.js의 cwd 사용
  if (currentEnv === 'production') {
    console.log('🌐 [Config] 상용서버 감지, ecosystem cwd 사용:', ecosystemCwd);
    
    // ecosystem cwd가 존재하는지 확인
    if (require('fs').existsSync(ecosystemCwd)) {
      const uploadPath = path.join(ecosystemCwd, 'uploads/project/mj/registImage');
      console.log('🌐 [Config] 상용서버 업로드 경로:', uploadPath);
      return uploadPath;
    } else {
      console.log('⚠️ [Config] ecosystem cwd가 존재하지 않음, 현재 cwd 사용');
    }
  }
  
  // 개발환경이거나 ecosystem cwd가 없는 경우
  const uploadPath = path.join(cwd, 'uploads/project/mj/registImage');
  console.log('🏠 [Config] 개발환경 또는 fallback 업로드 경로:', uploadPath);
  return uploadPath;
}

// 환경변수로 오버라이드 가능하도록 설정
const finalConfig = {
  ...currentConfig,
  env: currentEnv,
  isProduction: currentEnv === 'production',
  isDevelopment: currentEnv === 'development',
  
  // 환경변수가 있으면 우선 사용, 없으면 기본값 사용
  imageBaseUrl: process.env.IMAGE_BASE_URL || currentConfig.imageBaseUrl,
  staticBaseUrl: process.env.STATIC_BASE_URL || currentConfig.staticBaseUrl,
  port: process.env.PORT || currentConfig.port,
  timezone: process.env.TZ || currentConfig.timezone,
  corsOrigin: process.env.CORS_ORIGIN ? 
    process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : 
    currentConfig.corsOrigin,
  
  // 절대 경로로 업로드 경로 설정
  uploadPath: getAbsoluteUploadPath()
};

// 설정 로그 출력
console.log('⚙️ [Config] ========================================');
console.log('⚙️ [Config] 환경 설정 완료');
console.log('⚙️ [Config] ========================================');
console.log('🌍 [Config] 최종 환경 설정:');
console.log(`  - 환경: ${finalConfig.env.toUpperCase()}`);
console.log(`  - 모드: ${finalConfig.isProduction ? '🟢 PRODUCTION' : '🟡 DEVELOPMENT'}`);
console.log(`  - 이미지 URL: ${finalConfig.imageBaseUrl}`);
console.log(`  - 정적 URL: ${finalConfig.staticBaseUrl}`);
console.log(`  - 포트: ${finalConfig.port}`);
console.log(`  - 시간대: ${finalConfig.timezone}`);
console.log(`  - CORS Origin: ${finalConfig.corsOrigin.join(', ')}`);
console.log(`  - 업로드 경로: ${finalConfig.uploadPath}`);
console.log('⚙️ [Config] ========================================\n');

module.exports = finalConfig; 