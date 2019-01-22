const _ = require('lodash');
const {docker} = require('../lib/dataSources');
const exploranda = require('../index');

const repos = [
  'library/elasticsearch',
  'library/ubuntu',
  'library/alpine',
];

const dependencies = {
  dockerAuth: docker.authBuilder(
    {
      value: {
        host: 'auth.docker.io',
        path: '/token',
      },
    },
    {
      value: _.map(repos, (r) => `repository:${r}:pull`)
    },
    {value: 'registry.docker.io'}
  ),
  tags: docker.tagsBuilder(
    {
      source: 'dockerAuth',
      formatter: ({dockerAuth}) => _.map(_.zip(repos, _.map(dockerAuth, 'body')), ([r, auth]) => {
         const ret = _.merge({
          host: 'registry-1.docker.io',
          path: `/v2/${r}/tags/list`
        }, auth);
        console.log(ret);
        return ret;
      })
    },
  ),
};

exploranda.Gopher(dependencies).report();
