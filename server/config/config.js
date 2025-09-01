const config = {
  development: {
    imageBaseUrl: 'http://localhost:5000/images',
    staticBaseUrl: 'http://localhost:5000',
    uploadPath: 'uploads/project/mj/registImage'
  },
  production: {
    imageBaseUrl: process.env.IMAGE_BASE_URL || 'https://yourdomain.com/images',
    staticBaseUrl: process.env.STATIC_BASE_URL || 'https://yourdomain.com',
    uploadPath: 'uploads/project/mj/registImage'
  }
};

const currentEnv = process.env.NODE_ENV || 'development';
const currentConfig = config[currentEnv];

module.exports = {
  ...currentConfig,
  env: currentEnv,
  isProduction: currentEnv === 'production',
  isDevelopment: currentEnv === 'development'
}; 