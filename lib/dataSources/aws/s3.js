const _ = require('lodash');

const namespaceDetails = {
  name: 'S3',
  constructorArgs: {}
};

const listBuckets = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 's3BucketList',
  value: {
    path: 'Buckets',
  },
  apiMethod: 'listBuckets',
  incompleteIndicator: 'NextToken',
  nextBatchParamConstructor: (params, {NextToken}) => {
    return _.merge({}, params, {NextToken});
  },
};

function listBucketBuilder(apiConfig) {
  return {
    accessSchema: listBuckets,
    params: {
      apiConfig: {value: apiConfig}
    }
  };
}

const getBucketAcl = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 's3BucketAcl',
  value: {
    path: _.identity
  },
  apiMethod: 'getBucketAcl',
  requiredParams: {
    Bucket: {}
  },
};

function getBucketAclBuilder(apiConfig, bucketParam) {
  return {
    accessSchema: getBucketAcl,
    params: {
      apiConfig: {value: apiConfig},
      Bucket: bucketParam
    }
  };
}

const getBucketPolicy = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 's3BucketPolicy',
  value: {
    path: _.identity
  },
  apiMethod: 'getBucketPolicy',
  requiredParams: {
    Bucket: {}
  },
  onError: (err, res) => {
    if (err.name === 'NoSuchBucketPolicy') {
      return {err: null, res: {Policy: '{}'}};
    }
    return {err, res};
  }
};

function getBucketPolicyBuilder(apiConfig, bucketParam) {
  return {
    accessSchema: getBucketPolicy,
    params: {
      apiConfig: {value: apiConfig},
      Bucket: bucketParam
    },
    formatter: (policies) => {
      _.each(policies, (p) => {p.Policy = JSON.parse(p.Policy)});
      return policies;
    }
  };
}

const listObjects = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 'listObjectsInBucket',
  value: {
    path: 'Contents',
  },
  apiMethod: 'listObjectsV2',
  requiredParams: {
    Bucket: {}
  },
  optionalParams: {
    Prefix: {}
  },
  mergeIndividual: _.identity,
  incompleteIndicator: 'IsTruncated',
  nextBatchParamConstructor: (params, {NextContinuationToken}) => {
    return _.merge({}, params, {ContinuationToken: NextContinuationToken});
  }
};

const copyObject = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 'copyObject',
  value: {
    path: _.identity,
  },
  apiMethod: 'copyObject',
  requiredParams: {
    Bucket: {},
    CopySource: {},
    Key: {},
  },
};

const getObject = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 'getObject',
  value: {
    path: _.identity,
  },
  apiMethod: 'getObject',
  requiredParams: {
    Bucket: {},
    Key: {},
  },
  optionalParams: {
    Range: {}
  }
};

const putObject = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 'putObject',
  value: {
    path: _.identity,
  },
  apiMethod: 'putObject',
  requiredParams: {
    Bucket: {},
    Body: {},
    Key: {},
  },
  optionalParams: {
    CacheControl: {},
    ContentDisposition: {},
    ContentEncoding: {},
    ContentLanguage: {},
    ContentLength: {},
    ContentMD5: {},
    ContentType: {},
    ExpectedBucketOwner: {},
    Expires: {},
    GrantFullControl: {},
    GrantRead: {},
    GrantReadACP: {},
    GrantWriteACP: {},
    Metadata: {},
    ObjectLockLegalHoldStatus: {},
    ObjectLockMode: {},
    ObjectLockRetainUntilDate: {},
    RequestPayer: {},
    SSECustomerAlgorithm: {},
    SSECustomerKey: {}, 
    SSECustomerKeyMD5: {},
    SSEKMSEncryptionContext: {},
    SSEKMSKeyId: {},
    ServerSideEncryption: {},
    StorageClass: {},
    Tagging: {},
    WebsiteRedirectLocation: {}
  }
};

const putObjectTagging = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 'putObjectTagging',
  value: {
    path: _.identity,
  },
  apiMethod: 'putObjectTagging',
  requiredParams: {
    Bucket: {},
    Tagging: {},
    Key: {},
  },
};

const deleteObject = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 'deleteObject',
  value: {
    path: _.identity,
  },
  apiMethod: 'deleteObject',
  requiredParams: {
    Bucket: {},
    Key: {},
  },
};

function listObjectsBuilder(apiConfig, bucketParam) {
  return {
    accessSchema: listObjects,
    params: {
      apiConfig: {value: apiConfig},
      Bucket: bucketParam
    }
  };
}

module.exports = {
  listBuckets, listBucketBuilder,
  getBucketAcl, getBucketAclBuilder,
  getBucketPolicy, getBucketPolicyBuilder,
  listObjects, listObjectsBuilder,
  copyObject, deleteObject, getObject, putObject, putObjectTagging
};
