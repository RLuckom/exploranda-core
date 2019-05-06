const _ = require('lodash');

const read = {
  name: 'vaultPolicy',
  dataSource:'GENERIC_API',
  headerParamKeys: ['X-Vault-Token'],
  requiredParams: {
    apiConfig: {
      description: 'requires `.host`'
    },
    'X-Vault-Token': {
      description: 'vault token'
    },
    name: {
      description: 'policy name'
    },
  },
  value: {path: 'body.data'},
  pathParamKeys: ["name"],
  path: "/v1/sys/policy/${name}",
  params: {},
};

const list = {
  name: 'vaultPolicyList',
  dataSource:'GENERIC_API',
  headerParamKeys: ['X-Vault-Token'],
  requiredParams: {
    apiConfig: {
      description: 'requires `.host`'
    },
    'X-Vault-Token': {
      description: 'vault token'
    },
  },
  value: {path: 'body.data'},
  path: "/v1/sys/policy",
  params: {},
};

module.exports = {list, read};
