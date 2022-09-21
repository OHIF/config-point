const path = require('path');
const pkg = require('../package.json');

const outputFile = 'index.js';
const rootDir = path.resolve(__dirname, '../');
const outputFolder = path.join(__dirname, '../dist/');

const config = {
  mode: 'development',
  entry: rootDir + '/' + pkg.module,
  devtool: 'source-map',
  output: {
    path: outputFolder,
    filename: outputFile,
    library: pkg.name,
    libraryTarget: 'umd',
    globalObject: 'this',
    umdNamedDefine: true,
  },
  module: {
    rules: [
      {
        test: /(\.jsx|\.js|\.tsx|\.ts)$/,
        loader: 'babel-loader',
        exclude: /(node_modules|test)/,
        resolve: {
          extensions: ['.js', '.jsx', '.ts', '.tsx',],
        },
      },
    ],
  },
  resolve: {
    modules: [path.resolve('./node_modules'), path.resolve('./src')],
    extensions: ['.json', '.js', '.jsx', '.tsx', '.ts',],
  },
};

module.exports = config;
