const {Gopher} = require('./lib/gopher');
const dataSources = require('./lib/dataSources');

module.exports = {
  dataSources,
  Gopher,
  helpers: {kubernetes: require('./lib/dataSources/kubernetes/accessSchemaBuilder')},
};
