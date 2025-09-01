#!/usr/bin/env node

// 로컬 이미지 설정 테스트 스크립트
console.log('🧪 [Local Test] 로컬 이미지 설정 테스트 시작...\n');

try {
  // config 로드
  const config = require('./config/config');
  
  console.log('✅ [Local Test] Config 로드 성공!');
  console.log('📋 [Local Test] 현재 설정:');
  console.log('  - 환경:', config.env);
  console.log('  - 이미지 URL:', config.imageBaseUrl);
  console.log('  - 정적 URL:', config.staticBaseUrl);
  console.log('  - 업로드 경로:', config.uploadPath);
  console.log('  - 상용서버 여부:', config.isProduction);
  console.log('  - 개발서버 여부:', config.isDevelopment);
  
  // 업로드 경로 테스트
  console.log('\n📁 [Local Test] 업로드 경로 테스트:');
  const fs = require('fs');
  const path = require('path');
  
  // 업로드 경로 존재 여부 확인
  if (fs.existsSync(config.uploadPath)) {
    console.log('  ✅ 업로드 경로 존재:', config.uploadPath);
    
    // 파일 목록 확인
    try {
      const files = fs.readdirSync(config.uploadPath);
      console.log('  📄 파일 개수:', files.length);
      if (files.length > 0) {
        console.log('  📄 첫 번째 파일:', files[0]);
        
        // 첫 번째 파일 상세 정보
        const firstFilePath = path.join(config.uploadPath, files[0]);
        if (fs.existsSync(firstFilePath)) {
          const stats = fs.statSync(firstFilePath);
          console.log('  📄 첫 번째 파일 전체 경로:', firstFilePath);
          console.log('  📄 첫 번째 파일 크기:', stats.size, 'bytes');
          console.log('  📄 첫 번째 파일 권한:', stats.mode.toString(8));
        }
      }
    } catch (err) {
      console.log('  ❌ 파일 목록 읽기 실패:', err.message);
    }
  } else {
    console.log('  ❌ 업로드 경로 없음:', config.uploadPath);
    
    // 상위 디렉토리 확인
    const parentDir = path.dirname(config.uploadPath);
    if (fs.existsSync(parentDir)) {
      console.log('  📁 상위 디렉토리 존재:', parentDir);
      const parentFiles = fs.readdirSync(parentDir);
      console.log('  📄 상위 디렉토리 내용:', parentFiles);
    } else {
      console.log('  ❌ 상위 디렉토리도 없음:', parentDir);
    }
  }
  
  // 현재 작업 디렉토리 확인
  console.log('\n🔍 [Local Test] 경로 정보:');
  console.log('  - 현재 작업 디렉토리:', process.cwd());
  console.log('  - __dirname:', __dirname);
  console.log('  - server 폴더 포함 여부:', process.cwd().includes('server'));
  
  // 환경 감지 테스트
  console.log('\n🔍 [Local Test] 환경 감지 테스트:');
  const os = require('os');
  console.log('  - 호스트명:', os.hostname());
  console.log('  - 플랫폼:', os.platform());
  
  // 네트워크 인터페이스 확인
  const networkInterfaces = os.networkInterfaces();
  console.log('\n🌐 [Local Test] 네트워크 인터페이스:');
  for (const name of Object.keys(networkInterfaces)) {
    for (const interface of networkInterfaces[name]) {
      if (interface.family === 'IPv4') {
        console.log(`  - ${name}: ${interface.address} (내부: ${interface.internal})`);
      }
    }
  }
  
  console.log('\n🎉 [Local Test] 모든 테스트 완료!');
  
} catch (error) {
  console.error('❌ [Local Test] Config 로드 실패:', error.message);
  process.exit(1);
} 