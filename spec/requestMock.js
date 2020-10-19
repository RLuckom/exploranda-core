const _ = require('lodash');
const { addQueryStringToUrl } = require('../lib/recordCollectors/genericApiRecordCollector.js')

function makeNeedleParams(consolidatedParameters) {
  const configOnlyParams = _.cloneDeep(consolidatedParameters)
  delete configOnlyParams.method
  delete configOnlyParams.url
  delete configOnlyParams.qs
  delete configOnlyParams.body
  return [consolidatedParameters.method, addQueryStringToUrl(consolidatedParameters.url, consolidatedParameters.qs), consolidatedParameters.body, configOnlyParams] 
}

function requestMock() {
  const requestExpectations = [];

  function mockRequest(method, urlWithParams, data, params, callback) {
    const parametersReceived = _.cloneDeep(Array.prototype.slice.call(arguments));
    const callbackReceived = parametersReceived[parametersReceived.length - 1];
    const nonCallbackParams = _.cloneDeep(parametersReceived.slice(0, parametersReceived.length - 1));
    const expectation = _.find(requestExpectations, ({args}) => _.isEqual(nonCallbackParams, args));
    if (!expectation) {
      const expected = JSON.stringify(_.map(requestExpectations, 'args'));
      throw new Error(`Unexpected args for needle: ${JSON.stringify(nonCallbackParams)}, config keys: ${_.keys(params)}, expected ${expected}, keys: ${_.map(requestExpectations, ({args}) => _.keys(args))}`);
    }
    expectation.timesCalled = expectation.timesCalled ? expectation.timesCalled + 1 : 1;
    if (!_.isFunction(callbackReceived)) {
      throw new Error(`Last argument for request was not a function: ${callbackReceived}`);
    }
    return setTimeout(() => {
      const result = _.cloneDeep(expectation.results[expectation.timesCalled - 1]);
      callbackReceived(
        _.cloneDeep(result.error), 
        _.cloneDeep(result.response),
        _.cloneDeep(result.body)
      );
    });
  }

  function registerExpectation({callParameters, error, response, body}) {
    const needleParams = makeNeedleParams(callParameters)
    let expectation = _.find(requestExpectations, ({args}) => _.isEqual(needleParams, args));
    if (!expectation) {
      expectation = _.cloneDeep({
        timesCalled: 0,
        timesExpected: 0,
        args: needleParams,
        results: [{
          error,
          response,
          body
        }]
      });
      requestExpectations.push(expectation);
    } else {
      expectation.results.push(_.cloneDeep({error, response, body}));
    }
    expectation.timesExpected++;
  }

  function verifyExpectations() {
    _.each(requestExpectations, ({args, timesExpected, timesCalled}) => {
      s = `request with params ${JSON.stringify(args)} -- expected: ${timesExpected} got: ${timesCalled}`;
      console.log(s);
      if (timesExpected !== timesCalled) {
        throw new Error(s);
      }
    });
  }
  
  return {
    getMock: () => mockRequest,
    registerExpectation,
    verifyExpectations
  };
}

module.exports = {requestMock};
