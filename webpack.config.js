module.exports = {
  entry: {
    exploranda: './browserIndex.js'
  },
  output: {
    library: {
      name: 'exploranda',
      type: 'window'
    },
    filename: 'exploranda-browser.js'
  },
  externals: {
    "aws-sdk": 'aws-sdk',
  },
};
