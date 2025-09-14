const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyDisableDefaultRootMode: true,
      },
    },
    argv
  );

  // Force ES5 compilation for all modules to avoid import.meta
  config.module.rules.push({
    test: /\.js$/,
    include: /node_modules/,
    use: {
      loader: 'babel-loader',
      options: {
        presets: [
          ['@babel/preset-env', {
            targets: 'ie >= 11',
            modules: false
          }]
        ],
        plugins: [
          ['@babel/plugin-transform-modules-commonjs']
        ]
      }
    }
  });

  // Replace import.meta with safe fallbacks
  config.plugins.push(
    new config.webpack.DefinePlugin({
      'import.meta': 'undefined',
      'import.meta.hot': 'undefined',
      'import.meta.url': '""',
      'import.meta.env': '{}',
    })
  );

  return config;
};