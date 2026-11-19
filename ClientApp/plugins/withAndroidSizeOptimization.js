const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

const withAndroidSizeOptimization = (config) => {
  config = withGradleProperties(config, (gradleConfig) => {
    gradleConfig.modResults = gradleConfig.modResults.filter(
      (item) => item.type !== 'property' || !['reactNativeArchitectures', 'android.enableR8.fullMode'].includes(item.key)
    );

    gradleConfig.modResults.push(
      {
        type: 'property',
        key: 'reactNativeArchitectures',
        value: 'arm64-v8a,armeabi-v7a',
      },
      {
        type: 'property',
        key: 'android.enableR8.fullMode',
        value: 'true',
      }
    );

    return gradleConfig;
  });

  config = withAppBuildGradle(config, (gradleConfig) => {
    let contents = gradleConfig.modResults.contents;

    if (!contents.includes('project.ext.vectoricons')) {
      contents = `project.ext.vectoricons = [\n    iconFontNames: [ 'MaterialCommunityIcons.ttf' ]\n]\n\n` + contents;
    }

    if (contents.includes('def enableProguardInReleaseBuilds = false')) {
      contents = contents.replace(
        'def enableProguardInReleaseBuilds = false',
        'def enableProguardInReleaseBuilds = true'
      );
    }

    gradleConfig.modResults.contents = contents;
    return gradleConfig;
  });

  return config;
};

module.exports = withAndroidSizeOptimization;
