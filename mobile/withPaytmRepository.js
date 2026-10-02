const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withPaytmRepository(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const mavenUrl = `maven { url "https://artifactory.paytm.in/libs-release-local" }`;
      if (!config.modResults.contents.includes(mavenUrl)) {
        config.modResults.contents = config.modResults.contents.replace(
          /allprojects\s*\{\s*repositories\s*\{/,
          `allprojects {\n    repositories {\n        ${mavenUrl}`
        );
      }
    }
    return config;
  });
};
