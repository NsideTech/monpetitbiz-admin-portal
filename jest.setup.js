// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock environment variables for tests
process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long-for-testing-purposes';
process.env.BACKEND_SERVICE_TOKEN = 'test-backend-token';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:9000';
