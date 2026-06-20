// 순수 로직(토큰/API/매핑) 테스트용 — ts-jest, RN 프리셋 불필요(secure-store/fetch는 inline 모킹)
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
};
