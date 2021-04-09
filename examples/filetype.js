const exploranda = require('../index');
const _ = require('lodash');
const fs = require('fs')

const buf = fs.readFileSync(`${__dirname}/gh.png`)

const dependencies = {
  filetype: {
    accessSchema: exploranda.dataSources.FILE_TYPE.fromBuffer,
    params: {
      file: { value: buf}
    }
  }
}
const reporter = exploranda.Gopher(dependencies);

reporter.report();
