process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';
process.env.REQUIRE_EMAIL_VERIFICATION = 'true';
process.env.ENABLE_JOBS = 'false';
process.env.CORS_ORIGINS = '';
process.env.STORAGE_DRIVER = 'local';
process.env.UPLOAD_DIR = require('path').join(require('os').tmpdir(), `teknoortak-test-uploads-${process.pid}`);
process.env.SERVE_FRONTEND = 'false';
