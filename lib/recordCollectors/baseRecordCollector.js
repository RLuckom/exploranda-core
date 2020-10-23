const _ = require('lodash');
const async = require('async');

function createParallelFunction(parallelLimit) {
  if (parallelLimit) {
    return function(asyncFunctions, callback) {
      return async.parallelLimit(asyncFunctions, parallelLimit, callback);
    }
  } else {
    return async.parallel;
  }
}

function paramsToParamArray(sourceSchema, params) {
  //TODO: add support for `chunk` field on parameter that preprocesses
  // the parameter. For instance if the API takes a date range
  // like `2018-01-01:2018-08-08`, but the range isn't allowed to exceed
  // one month, allow the accessSchema to specify a `chunk` function
  // that would break the range down into an array of ranges.
  // The `chunk` function could be called before the `detectArray`.
  const individualCallParams = [];
  // This `each` block handles the case where the value for a given param
  // is actually an array of values necessitating multiple requests. In this
  // case, we begin to construct a series of parameters for the calls.
  _.each(sourceSchema.requiredParams, (paramDescription, paramName) => {
    const detectArray = paramDescription.detectArray || _.isArray;
    let param = params[paramName];
    if (!param) {
      let errorString = `Problem creating individual call params for ${sourceSchema.name}. looking for ${paramName}, but did not find it in params`;
      if (process.env.EXPLORANDA_DEBUG) {
        errorString = `Problem creating individual call params for ${sourceSchema.name}. looking for ${paramName}, but did not find it in params ${JSON.stringify(params)}`;
      }
      throw new Error(errorString);
    }
    // `needSplitForMax` will be true in the case where logically,
    // we are only asking for one group of resources,
    // but the number of resources in the group happens to be larger
    // than the maximum we are allowed to request at one time.
    const needSplitForMax = !detectArray(param) && param.length > paramDescription.max;
    param = needSplitForMax ? _.chunk(params[paramName], paramDescription.max) : params[paramName];
    if (detectArray(param) || needSplitForMax) {
      if (individualCallParams.length !== 0 && param.length != individualCallParams.length) {
        let errorString = `Problem constructing parameters for schema ${sourceSchema.name}: when passing multiple arrays of parameters, they must be the same length`;
        if (process.env.EXPLORANDA_DEBUG) {
          errorString = `Problem constructing parameters for schema ${sourceSchema.name}: when passing multiple arrays of parameters, they must be the same length ${JSON.stringify(params)}`;
        }
        throw new Error(errorString);
      }
      _.each(param, (paramValue, index) => {
        individualCallParams[index] = _.assign({},
          sourceSchema.params,
          individualCallParams[index] || params,
          {[paramName]: (paramDescription.formatter || _.identity)(paramValue)}
        );
      });
    }
  });
  _.each(sourceSchema.optionalParams, (paramDescription, paramName) => {
    const detectArray = paramDescription.detectArray || _.isArray;
    let param = params[paramName];
    if (param) {
      // `needSplitForMax` will be true in the case where logically,
      // we are only asking for one group of resources,
      // but the number of resources in the group happens to be larger
      // than the maximum we are allowed to request at one time.
      const needSplitForMax = !detectArray(param) && param.length > paramDescription.max;
      param = needSplitForMax ? _.chunk(params[paramName], paramDescription.max) : params[paramName];
      if (detectArray(param) || needSplitForMax) {
        if (individualCallParams.length !== 0 && param.length != individualCallParams.length) {
          let errorString = `Problem constructing parameters for schema ${sourceSchema.name}: when passing multiple arrays of parameters, they must be the same length`;
          if (process.env.EXPLORANDA_DEBUG) {
            errorString = `Problem constructing parameters for schema ${sourceSchema.name}: when passing multiple arrays of parameters, they must be the same length ${JSON.stringify(params)}`;
          }
          throw new Error(errorString);
        }
        _.each(param, (paramValue, index) => {
          individualCallParams[index] = _.assign({},
                                                 sourceSchema.params,
          individualCallParams[index] || params,
          {[paramName]: (paramDescription.formatter || _.identity)(paramValue)}
                                                );
        });
      }
    }
  });
  // This `each` block handles the case where the value for a given param
  // is a single value, NOT an array of values requiring multiple calls.
  // in this case, we either create a set of parameters for that call, or add
  // this value to the existing parameter set(s).
  _.each(sourceSchema.requiredParams, (paramDescription, paramName) => {
    const detectArray = paramDescription.detectArray || _.isArray;
    const param = params[paramName];
    const needSplitForMax = !detectArray(param) && param.length > paramDescription.max;
    if (!detectArray(param) && !needSplitForMax) {
      if (individualCallParams.length === 0) {
        individualCallParams.push(_.assign({}, sourceSchema.params, params));
      }
      _.each(individualCallParams, (icParam) => {
        icParam[paramName] = _.isFunction(param) ? param :  _.cloneDeep((paramDescription.formatter || _.identity)(param));
      });
    }
  });
  // This `each` block handles the case where the value for a given param
  // is a single value, NOT an array of values requiring multiple calls.
  // in this case, we either create a set of parameters for that call, or add
  // this value to the existing parameter set(s).
  _.each(sourceSchema.optionalParams, (paramDescription, paramName) => {
    const detectArray = paramDescription.detectArray || _.isArray;
    const param = params[paramName];
    if (param) {
      const needSplitForMax = !detectArray(param) && param.length > paramDescription.max;
      if (!detectArray(param) && !needSplitForMax) {
        if (individualCallParams.length === 0) {
          individualCallParams.push(_.assign({}, sourceSchema.params, params));
        }
        _.each(individualCallParams, (icParam) => {
          icParam[paramName] = _.cloneDeep((paramDescription.formatter || _.identity)(param));
        });
      }
    }
  });
  if (individualCallParams.length === 0) {
    if (_.keys(sourceSchema.requiredParams).length !== 0) {
      return [];
    }
    individualCallParams.push(_.assign({}, sourceSchema.params, params));
  }
  return individualCallParams;
}

function getArgOrder(params, sourceSchema) {
  return _.get(params, 'apiConfig.argumentOrder') || _.get(sourceSchema, 'argumentOrder')
}

function getCallable(params, sourceSchema) {
  const apiObject = _.get(params, 'apiConfig.apiObject')
  if (!apiObject) {
    console.warn('apiObject is falsy, this likely indicates a mistake in sourceSchema or dependency construction')
  }
  if (_.isFunction(apiObject)) {
    return apiObject
  } else {
    const path = _.get(params, 'apiConfig.apiMethod') || _.get(sourceSchema, 'apiMethod.name')
    if (!path) {
      console.warn('apiObject is not a function and path is falsy, this may indicate a mistake in sourceSchema or dependency construction')
    }
    const api = _.get(apiObject, path)
    if (!api) {
      console.warn(`api is falsy, this likely indicates a mistake in sourceSchema or dependency construction. Path is ${path}, apiObject has keys ${_.keys(apiObject)}`)
    }
    return api
  }
}

function getSameValue(paramsArray, path, errText) {
  return _.reduce(paramsArray, (acc, v) => {
    const curVal = _.get(v, path)
    if (acc !== curVal) {
      throw new Error(errText)
    }
    return _.get(v, path)
  }, _.get(paramsArray[0], path))
}

function execParamDrivenRequest(sourceSchema, paramsArray, behaviors, callback) {
  if (sourceSchema.isSync || getSameValue(paramsArray, 'apiConfig.isSync', 'All the params in a paramsArray must have the same isSync boolean-ness')) {
    async.series(_.map(paramsArray, (params) => {
      return function(seriesCallback) {
        const argOrder = getArgOrder(params, sourceSchema)
        if (argOrder) {
          const args = _.map(argOrder, (a) => params[a])
          setTimeout(() => {
            try {
              seriesCallback(null, getCallable(params, sourceSchema)(...args))
            } catch (e) {
              seriesCallback(e)
            }
          }, 0)
        } else {
          const api = getCallable(params, sourceSchema)
          delete params.apiConfig
          setTimeout(() => {
            try {
              seriesCallback(null, api(params))
            } catch (e) {
              seriesCallback(e)
            }
          }, 0)
        }
      }
    }), callback)
    return
  } else if (_.get(sourceSchema, 'namespaceDetails.parallel')) {
    // TODO collapse these? they seem very similar
    const parallelFunction = createParallelFunction(_.get(behaviors, 'parallelLimit'))
    parallelFunction(_.map(paramsArray, (params) => {
      return function(parallelCallback) {
        const argOrder = getArgOrder(params, sourceSchema)
        if (argOrder) {
          const args = _.map(argOrder, (a) => params[a])
          args.push(parallelCallback)
          getCallable(params, sourceSchema)(...args)
          return
        } else {
          const api = getCallable(params, sourceSchema)
          delete params.apiConfig
          api(params, parallelCallback)
        }
      }
    }), callback)
    return
  } else {
    async.series(_.map(paramsArray, (params) => {
      return function(seriesCallback) {
        const argOrder = getArgOrder(params, sourceSchema)
        if (argOrder) {
          const args = _.map(argOrder, (a) => params[a])
          args.push(seriesCallback)
          getCallable(params, sourceSchema)(...args)
          return
        } else {
          const api = getCallable(params, sourceSchema)
          delete params.apiConfig
          api(params, seriesCallback)
        }
      }
    }), callback)
    return
  }
}

function buildFetchAndMerge(getApi, dependencyMap) {
  return function fetchAndMergeAllResults(sourceSchema, paramSet, behaviors, callback) {
    const api = getApi(sourceSchema, paramSet, behaviors);
    if (!api) {
      throw new Error(`Could not find API for source schema ${sourceSchema.name} and params supplied`)
    }
    let currentParams = paramSet;
    function fetchAndMergeAll(collector, err, res) {
      const onError = _.get(behaviors, 'onError') || sourceSchema.onError
      if (err && _.isFunction(onError)) {
        const errAndRes = onError(err, res);
        err = errAndRes.err;
        res = errAndRes.res;
      }
      if (err) {
        let errorString = `Error fetching results for schema ${sourceSchema.name} Error ${err}`;
        if (process.env.EXPLORANDA_DEBUG) {
          errorString = `Error fetching results for schema ${sourceSchema.name} with params ${JSON.stringify(currentParams)} Error ${err}`;
        }
        return callback(new Error(errorString));
      }
      let results;
      if (_.isFunction(_.get(sourceSchema, 'value.path'))) {
        results = sourceSchema.value.path(res);
      } else {
        results = _.get(sourceSchema, 'value.path') ? _.get(res, sourceSchema.value.path) : res;
      }
      if (!results) {
        let errorString = `${sourceSchema.name} specifies path as ${sourceSchema.value.path} but that path is not present on the response}`
        if (process.env.EXPLORANDA_DEBUG) {
          errorString = `${sourceSchema.name} specifies path as ${sourceSchema.value.path} but that path is not present on ${JSON.stringify(res)}`
        }
        return callback(new Error(errorString));
      }
      collector = collector ? (sourceSchema.mergeOperator || _.concat)(collector, results) : results;
      const incompleteIndicatorFunction = _.isFunction(sourceSchema.incompleteIndicator) ? sourceSchema.incompleteIndicator : (x) => _.get(x, sourceSchema.incompleteIndicator);
      if (incompleteIndicatorFunction(res)) {
        const previousParams = _.cloneDeep(currentParams);
        currentParams = sourceSchema.nextBatchParamConstructor(_.cloneDeep(currentParams), _.cloneDeep(res));
        if (_.isArray(currentParams)) {
          return createParallelFunction(_.get(behaviors, 'parallelLimit'))(_.map(currentParams, (individualParamSet) => {
            return (parallelCallback) => fetchAndMergeAllResults(sourceSchema, individualParamSet, behaviors, parallelCallback)
          }), (e, r) => {
            if (!e) {
              collector = (sourceSchema.mergeOperator || _.concat)(collector, r);
              return callback(e, collector);
            } else {
              return callback(e);
            }
          });
        } else {
          retryRequest(currentParams, api, fetchAndMergeAll, behaviors, sourceSchema, collector);
          return
        }
      } else {
        return callback(err, collector);
      }
    }
    retryRequest(currentParams, api, fetchAndMergeAll, behaviors, sourceSchema, null);
    return
  };
}

function retryRequest(currentParams, api, fetchAndMergeAll, behaviors, sourceSchema, collector) {
  return async.retry(
    _.get(behaviors, 'retryParams') || {times: 1}, 
    (cb) => {
      function errorDetection(e, r) {
        const errorDetector = _.get(behaviors, 'detectErrors') || sourceSchema.detectErrors || _.get(api, 'detectErrors') || _.identity;
        return cb(errorDetector(e, r, currentParams), r);
      } 
      api(currentParams, errorDetection);
      // Ordinarily I'd return the above, but I'm fairly sure that if 
      // api returns a promise, async will do something weird with it that
      // can cause the rest of the process not to execute.
      return
    },
    _.partial(fetchAndMergeAll, collector)
  );
}

// request a specific record or series of records based on a source
// schema and complete set of parameters.
function buildExecRecordsRequest(fetchAndMergeAllResults) {
  return function execRecordRequest(sourceSchema, params, behaviors, callback) {
    const paramsArray = paramsToParamArray(sourceSchema, params);
    if (_.get(sourceSchema, 'namespaceDetails.paramDriven')) {
      execParamDrivenRequest(sourceSchema, paramsArray, behaviors, callback)
      return
    } else {
      return createParallelFunction(_.get(behaviors, 'parallelLimit'))(_.map(paramsArray, (paramSet) => {
        return function(parallelCallback) {
          return fetchAndMergeAllResults(sourceSchema, paramSet, behaviors, parallelCallback);
        };
      }), (e, r) => {callback(e, (sourceSchema.mergeIndividual || _.flatten)(r));});
    };
  }
}

function sufficientParams(sourceSchema, params) {
  return _.reduce(sourceSchema.requiredParams, (collector, unused, paramName) => {
    return collector && _.has(params, paramName);
  }, true);
}

function buildRecordLookup(updateDefaultSourceParams, execRecordRequest) {
// recursive descent to get the records identified by the sourceSchema and the params
  return function lookUpRecords(sourceSchema, params, behaviors, callback) {
    if (!sourceSchema) {
      throw new Error('sourceSchema must be defined')
    }
    const requiredParams = _.get(sourceSchema, 'requiredParams');
    // base case--there are no required params needed or else we've already
    // gotten what we need--send the request to get the results.
    if (!requiredParams || sufficientParams(sourceSchema, params)) {
      return execRecordRequest(sourceSchema, _.cloneDeep(params || {}), behaviors, callback);
    } else {
      // recursion case--the parameters we need for this request require that we look up
      // the records that coorrespond to _other_ sourceSchemas and parameters. In this case,
      // create a map like: 
      // 
      //   {
      //     parameterName: (async.js standard callback function) to get the data
      //     ...
      //   }
      //
      // and pass that map to [async.auto](http://caolan.github.io/async/docs.html#auto),
      // which is a perfect expression of the Tao of JavaScript.
      return async.auto(_.reduce(sourceSchema.requiredParams, (collector, {defaultSource}, paramName) => {
        if (!params[paramName]) {
          if (!defaultSource) {
            throw new Error(`No acceptable value provided for the ${paramName} parameter in the ${sourceSchema.name} schema. An acceptable value must be an object with a "value" member containing the literal value, or a "source" or "input" member containing the name of the source`);
          }
          collector[paramName] = _.partial(lookUpRecords, defaultSource, updateDefaultSourceParams(defaultSource, params), behaviors);
        }
        return collector;
      }, {}), 
        // This callback is executed after the `async.auto` call completes. `res` is a map with the
        // same keys as the map we passed in to `auto`, but the values are the results of the
        // asynchronous calls.
        (err, res) => {
          // Since the `res` consisted of the parameters we needed, we just merge it with the params
          // we started with and try the lookup again
          return lookUpRecords(sourceSchema, _.merge({}, params, res), behaviors, callback);
        }
      );
    }
  };
}

function buildSDKCollector({getApi, dependencyMap}) {
  if (!dependencyMap) {
    console.warn('dependencyMap not supplied for SDK--no dependencies will be available to the recordcollector')
  }
  const suppliedDependencies = {}
  let missing = []
  _.each(dependencyMap, (v, k) => {
    try {
      suppliedDependencies[k] = require(v)
    } catch(e) {
      missing.push(v)
    }
  })
  if (missing.length === 0) { 
    const fetchAndMergeAllResults = buildFetchAndMerge(_.partial(getApi, suppliedDependencies));
    const execRecordRequest = buildExecRecordsRequest(fetchAndMergeAllResults);
    const recordLookup = buildRecordLookup(updateDefaultSourceParams, execRecordRequest);
    const lookUpRecords = function(sourceSchema, params, behaviors, callback) {
      return recordLookup(sourceSchema, params, behaviors, (e, r) => {
        if (e) {return callback(e);}
        const results = _.get(sourceSchema, 'value.sortBy') ? _.sortBy(r, _.get(sourceSchema, 'value.sortBy')) : r;
        return callback(e, results);
      });
    }
    lookUpRecords.replaceDependency = function(name, newDependency) {
      const oldDependency = suppliedDependencies[name]
      suppliedDependencies[name] = newDependency
      return () => {
        suppliedDependencies[name] = oldDependency
      }
    }
    return lookUpRecords
  } else {
    return function() {
      throw new Error(`Missing dependencies. Use 'npm install ${missing.join(' ')}' to install them`)
    }
  }
}

/* One slightly baroque feature of exploranda is its ability to iteratively
 * GET objects without being explicitly told how to list them first.
 * For example, the AWS API for Kinesis has a DescribeStream method
 * that retrieves metadata for a Kinesis Stream. The stream name is
 * a required argument to the DescribeStream method. There is a separate
 * ListStreams method that returns a paginated list of stream names.
 *
 * That means that if you want to
 * determine which of your Kinesis Streams have a specific feature
 * in their metadata, you need to list the streams, accounting for
 * pagination, collect the results, and call DescribeStream separately
 * for each stream.
 *
 * Exploranda represents both ListStreams and DescribeStream as schema
 * objects. the ListStreams schema object in exploranda includes
 * the information on how the API is paginated, allowing exploranda
 * to automatically get all the streams. The ListStreams method
 * has no required parameters other than AWS credentials. Therefore,
 * the ListStreams schema object is set as the defaultSource for the
 * streamNames parameter on the DescribeStream schema object; if you
 * add a DescribeStream requirement to your plan without specifying
 * where the list of streams comes from, exploranda will automatically
 * use the ListStreams schema object to collect the complete list
 * of available streams and call DescribeStream on all of them.
 *
 * However, just as with getApi above, the fact that we need to specify
 * region and credentials per-request means that the ListStreams
 * default source needs to be told about those things at runtime.
 * The updateDefaultSourceParams method copies the credentials, region,
 * and other bookkeeping information from the intended (e.g. DescribeStream)
 * request to the incidental (e.g. ListStreams) request being called
 * as the default.
 */
function updateDefaultSourceParams(defaultSource, params) {
  return _.merge({}, defaultSource.params, {apiConfig: _.get(params, 'apiConfig')});
}

module.exports = {
  paramsToParamArray,
  buildFetchAndMerge,
  buildRecordLookup,
  sufficientParams,
  buildSDKCollector,
  buildExecRecordsRequest
};
