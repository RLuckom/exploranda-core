const _ = require('lodash');
const {buildSDKCollector} = require('./baseRecordCollector.js');
const url = require('url');

function addQueryStringToUrl(qs, url, queryArgs) {
  if (_.keys(queryArgs).length === 0) {
    return url
  }
  return `${url}?${qs.stringify(queryArgs)}`
}

function addUserAuthIfProvided(apiConfig, requestParams) {
  if (_.get(apiConfig, 'user') && _.get(apiConfig, 'pass')) {
    requestParams.username = apiConfig.user
    requestParams.password = apiConfig.pass
  }
  return requestParams;
}

function addBearerAuthIfProvided(apiConfig, headerParams) {
  if (_.get(apiConfig, 'token')) {
    headerParams.Authorization = `Bearer ${apiConfig.token}`;
  }
  return headerParams;
}

function addCAIfProvided(apiConfig, requestParams) {
  if (_.get(apiConfig, 'ca')) {
    requestParams.ca = apiConfig.ca;
  }
  return requestParams;
}

function addClientCertIfProvided(apiConfig, requestParams) {
  if (_.get(apiConfig, 'cert')) {
    requestParams.cert = apiConfig.cert;
  }
  if (_.get(apiConfig, 'key')) {
    requestParams.key = apiConfig.key;
  }
  if (_.get(apiConfig, 'passphrase')) {
    requestParams.passphrase = apiConfig.passphrase;
  }
  return requestParams;
}

function urlBuilder(path) {
  return _.template('${__exp_protocol}//${__exp_host}' + (_.startsWith(path, '/') ? path : '/' + (path || '')));
}

function annotateHeaders(headers) {
  if (_.get(headers, 'link')) {
    headers.link = parseLinkHeader(headers.link);
    _.each(headers.link, (values, name) => {
      const parsed = url.parse(values.url);
      parsed.protocol = parsed.protocol + (parsed.slashes ? '//' : '');
      headers.link[name].url = parsed;
    });
  }
  return headers;
}

function getPathParams(apiConfig, sourceSchema, params, parsedUrl) {
  const host = _.get(parsedUrl, 'host') || _.get(apiConfig, 'host') || sourceSchema.host;
  const protocol = _.get(parsedUrl, 'protocol') || _.get(apiConfig, 'protocol') || sourceSchema.protocol || 'https:';
  const internalParams = {
    __exp_protocol: protocol,
    __exp_host: host,
  };
  const pathParamKeys = _.concat(sourceSchema.pathParamKeys, _.get(params, 'apiConfig.pathParamKeys'));
  return {...internalParams, ..._.pick(params, pathParamKeys)};
}

function genericRequestApi({needle, qs, parseLinkHeader}, sourceSchema) {
  function api(params, callback) {
    const url = _.get(params, 'apiConfig.url') || _.get(params, 'apiConfig.uri') || _.get(sourceSchema, 'url') || _.get(sourceSchema, 'uri');
    const parsedUrl = url ? new URL(url) : null
    const host = _.get(parsedUrl, 'host') || _.get(params, 'apiConfig.host') || _.get(sourceSchema, 'host');
    if (!host) {
      let errorString = `Host not found in API params for call to ${sourceSchema.name}. for more detail set EXPLORANDA_DEBUG=true`;
      if (process.env.EXPLORANDA_DEBUG) {
        errorString = `Host not found in API params ${JSON.stringify(params)} for call to ${sourceSchema.name}`;
      }
      throw new Error(errorString);
    }
    const apiConfig = _.get(params, 'apiConfig');
    // Assume json but allow it to be set false explicitly
    const requestParams = {
      json: _.isUndefined(sourceSchema.json) ? true : sourceSchema.json,
      multipart: !!(sourceSchema.multipart || _.get(apiConfig, 'multipart')),
    };
    const method =_.get(apiConfig, 'method') || _.get(sourceSchema, 'method') || 'GET'
    addCAIfProvided(apiConfig, requestParams);
    addClientCertIfProvided(apiConfig, requestParams);
    // the order here determines precedence--bearer overrides user:pass
    addUserAuthIfProvided(apiConfig, requestParams);
    const urlBuilderFunction = sourceSchema.urlBuilder || urlBuilder(_.get(parsedUrl, 'pathname') || _.get(params, 'apiConfig.path') || sourceSchema.path);
    const requestQueryBuilderFunction = sourceSchema.requestQueryBuilder || _.identity;
    const requestBodyBuilderFunction = sourceSchema.requestBodyBuilder || _.identity;
    const requestHeadersBuilderFunction = sourceSchema.requestHeadersBuilder || _.identity;
    const pathParams = getPathParams(apiConfig, sourceSchema, params, parsedUrl);
    const urlQueries = {}
    if (parsedUrl) {
      parsedUrl.searchParams.forEach((v, k) => urlQueries[k] = v)
    }
    const queryParams = {..._.pick(params, _.concat(sourceSchema.queryParamKeys, _.get(params, 'apiConfig.queryParamKeys'))), ...urlQueries};
    const bodyParams = (sourceSchema.bodyParamKeys || _.get(params, 'apiConfig.bodyParamKeys')) ? _.pick(params, _.concat(sourceSchema.bodyParamKeys, _.get(params, 'apiConfig.bodyParamKeys'))) : void(0);
    const headerParams = _.pick(params, _.concat(sourceSchema.headerParamKeys, _.get(params, 'apiConfig.headerParamKeys')));
    addBearerAuthIfProvided(apiConfig, headerParams);
    const queryObject = requestQueryBuilderFunction(queryParams)
    const requestUrl =  addQueryStringToUrl(qs, urlBuilderFunction(pathParams), queryObject)
    const requestData = requestBodyBuilderFunction(bodyParams)
    const mergedRequestParams = _.merge({
      headers: requestHeadersBuilderFunction(headerParams),
    }, _.cloneDeep(requestParams));

    return needle.request(method, requestUrl, _.keys(requestData).length > 0 ? requestData : void(0),
      mergedRequestParams,
      (e, r, b) => {
        callback(e, 
                 {
          body: b,
          statusCode: _.get(r, 'statusCode'),
          headers: annotateHeaders(_.get(r, 'headers'))
        });
      }
    );
  }
  api.detectErrors = detectErrors;
  return api;
}

function detectErrors(e, {body, statusCode, headers}, params) {
  const statusCodeFailure = (200 > statusCode) || (300 <= statusCode);
  if (statusCodeFailure) {
    if (process.env.EXPLORANDA_DEBUG) {
      return e || `Status code ${statusCode} received for request ${JSON.stringify(params)} with responseBody ${JSON.stringify(b)} and error ${e}`
    } else {
      return e || `Status code ${statusCode} received for request. To see more detail re-run with EXPLORANDA_DEBUG=true in the environment.`
    }
  }
}

module.exports = {
  addQueryStringToUrl,
  lookUpRecords: buildSDKCollector({
      getApi: genericRequestApi, 
      dependencyMap: {
        needle: 'needle',
        qs: 'qs',
        parseLinkHeader: 'parse-link-header'
      }
    }
  )
};
