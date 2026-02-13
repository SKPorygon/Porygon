module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    moduleFileExtensions: ["ts", "js"],
    testMatch: ["**/*.test.ts"], // Ensure it looks for .test.ts files
    rootDir: ".", // Set root directory for tests
  };