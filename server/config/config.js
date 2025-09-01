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
  // 1. NODE_ENV 환경변수 확인
  if (process.env.NODE_ENV) {
    return process.env.NODE_ENV;
  }
  
  // 2. 호스트명으로 자동 감지
  const os = require('os');
  const hostname = os.hostname().toLowerCase();
  
  // 상용서버 호스트명 패턴 감지
  if (hostname.includes('labsemble') || 
      hostname.includes('prod') || 
      hostname.includes('production') ||
      hostname.includes('server') ||
      hostname.includes('host')) {
    console.log('🌐 [Config] 호스트명으로 상용서버 감지:', hostname);
    return 'production';
  }
  
  // 3. IP 주소로 감지 (로컬 IP가 아닌 경우)
  const networkInterfaces = os.networkInterfaces();
  for (const name of Object.keys(networkInterfaces)) {
    for (const interface of networkInterfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        const ip = interface.address;
        if (!ip.startsWith('192.168.') && 
            !ip.startsWith('10.') && 
            !ip.startsWith('172.') && 
            ip !== '127.0.0.1' && 
            ip !== 'localhost') {
          console.log('🌐 [Config] 외부 IP로 상용서버 감지:', ip);
          return 'production';
        }
      }
    }
  }
  
  // 4. 기본값은 development
  console.log('🏠 [Config] 개발환경으로 설정 (기본값)');
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
  if (currentEnv === 'production' && cwd !== ecosystemCwd) {
    console.log('🌐 [Config] 상용서버 감지, ecosystem cwd 사용:', ecosystemCwd);
    return path.join(ecosystemCwd, 'uploads/project/mj/registImage');
  }
  
  // 개발환경이거나 이미 올바른 디렉토리에 있는 경우
  return path.join(cwd, 'uploads/project/mj/registImage');
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
console.log('⚙️ [Config] 환경 설정 완료:', {
  environment: finalConfig.env,
  imageBaseUrl: finalConfig.imageBaseUrl,
  staticBaseUrl: finalConfig.staticBaseUrl,
  port: finalConfig.port,
  timezone: finalConfig.timezone,
  corsOrigin: finalConfig.corsOrigin,
  uploadPath: finalConfig.uploadPath
});

module.exports = finalConfig; 