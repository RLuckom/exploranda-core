const _ = require('lodash');
const {kinesisStreams, kinesisStream, kinesisStreamMetrics} = require('../../lib/dataSources/aws/kinesis');
const {awsMock} = require('../awsMock');
const {requestMock} = require('../requestMock');
const genericApiRecordCollector = require('../../lib/recordCollectors/genericApiRecordCollector');
const { Gopher } = require('../../lib/gopher.js');

const genericApiLookupRecords = genericApiRecordCollector.lookUpRecords;

function executeBasicTestSuite(suiteName, testCases) {
  describe(suiteName, function() {
    let awsMockBuilder, mockBuilders, oldExecRecordRequest, oldRequestRequest, oldVaultRequest;

    function buildMocks() {
      awsMockBuilder = awsMock();
      requestMockBuilder = requestMock();
      genericApiMockBuilder = requestMock();
      mockBuilders = {
        AWS: awsMockBuilder,
        GENERIC_API: genericApiMockBuilder,
        SYNTHETIC: {registerExpectation: _.noop, verifyExpectations: _.noop},
      };
    }
    let resetAws, resetNeedle

    function setMocks(gopher) {
      resetAws = gopher.recordCollectors.AWS.replaceDependency('AWS', awsMockBuilder.getMock());
      resetNeedle = gopher.recordCollectors.GENERIC_API.replaceDependency('needle', {request: genericApiMockBuilder.getMock()});
    }

    _.each(testCases, function({name, dataDependencies, namedMocks, implicitMocks}) {
      it(name, function(done) {
        buildMocks();
        const expectedResult = {};
        function register({source, sourceConfig}) {
          if (_.isArray(sourceConfig)) {
            _.each(sourceConfig, mockBuilders[source].registerExpectation);
          } else {
            mockBuilders[source].registerExpectation(sourceConfig);
          }
        }
        _.each(namedMocks, (mockSchema, dependencyName) => {
          register(mockSchema);
          expectedResult[dependencyName] = _.cloneDeep(mockSchema.expectedValue);
        });
        _.each(implicitMocks, (mockSchema) => {
          register(mockSchema);
        });
        const gopher = Gopher(dataDependencies)
        setMocks(gopher);
        gopher.report((err, response) => {
          expect(response).toEqual(expectedResult);
          _.each(mockBuilders, (mb) => {
            mb.verifyExpectations();
          });
          done();
        });
      });
    });
  });
}

function executeCachingTestSuite(suiteName, testCases) {
  describe(suiteName, function() {
    let awsMockBuilder, mockBuilders, oldExecRecordRequest, oldRequestRequest, oldVaultRequest;

    function buildMocks() {
      awsMockBuilder = awsMock();
      requestMockBuilder = requestMock();
      genericApiMockBuilder = requestMock();
      mockBuilders = {
        AWS: awsMockBuilder,
        GENERIC_API: genericApiMockBuilder,
      };
    }
    let resetAws, resetNeedle


    function setMocks(gopher) {
      resetAws = gopher.recordCollectors.AWS.replaceDependency('AWS', awsMockBuilder.getMock());
      resetNeedle = gopher.recordCollectors.GENERIC_API.replaceDependency('needle', {request: genericApiMockBuilder.getMock()});
    }

    function compareCache(gopherCache, expectedCache) {
      expect(_.keys(gopherCache).length).toEqual(_.keys(expectedCache).length, 'different number of cache keys');
      _.each(expectedCache, (valuesArray, name) => {
        expect(valuesArray.length).toEqual(_.get(gopherCache, `${name}.length`));
        const foundValues = [];
        _.each(valuesArray, (value) => {
          const matchFromCache = _.find(gopherCache[name], (gopherValue) => {
            return _.isEqual(value.r, gopherValue.r) && _.isEqual(value.collectorArgs, gopherValue.collectorArgs) && foundValues.indexOf(gopherValue) === -1;
          });
          if (matchFromCache) {
            foundValues.push(matchFromCache)
          } else {
            console.log(`FAILURE: could not find ${JSON.stringify(value)} in ${JSON.stringify(gopherCache[name])}`);
          }
          expect(matchFromCache).toBeTruthy();
        });
      });
    }

    _.each(testCases, function({name, dataDependencies, inputs, phases}) {
      it(name, function(done) {
        let phasesFinished = 0;
        const gopher = new Gopher(dataDependencies, inputs);
        _.each(phases, ({time, mocks, inputs, expectedValues, expectedError, target, inputOverrides, preCache, postCache, preInputs, postInputs}) => {
          setTimeout(() => {
            console.log(`starting phase ${phasesFinished + 1}`);
            buildMocks();
            _.each(mocks, (mockSchema, name) => {
              register(mockSchema);
            });
            setMocks(gopher);
            if (preCache) {
              compareCache(gopher.getCache(), preCache);
            }
            if (preInputs) {
              expect(preInputs).toEqual(gopher.getInputs());
            }
            _.each(inputs, (value, path) => {
              gopher.setInput(path, value);
            });
            function testAssertionCallback(err, response) {
              expect(err).toEqual(expectedError);
              expect(response).toEqual(expectedValues);
              _.each(mockBuilders, (mb) => {
                mb.verifyExpectations();
              });
              if (postCache) {
                compareCache(gopher.getCache(), postCache);
              }
              if (postInputs) {
                expect(postInputs).toEqual(gopher.getInputs());
              }
              phasesFinished = phasesFinished + 1;
              console.log(`finished phase ${phasesFinished} out of ${phases.length} at ${Date.now()}`);
              if (phasesFinished === phases.length) {
                done();
              }
            }
            return gopher.report(target, inputOverrides, testAssertionCallback);
          }, time);
        });
        function register({source, sourceConfig}) {
          if (_.isArray(sourceConfig)) {
            _.each(sourceConfig, mockBuilders[source].registerExpectation);
          } else {
            mockBuilders[source].registerExpectation(sourceConfig);
          }
        }
      });
    });
  });
}

const keys = {
  accessKeyId: "AWS_ACCESS_KEY_ID",
  secretAccessKey: "AWS_SECRET_ACCESS_KEY",
  sessionToken: "AWS_SESSION_TOKEN"
};

module.exports = {executeBasicTestSuite, executeCachingTestSuite, keys};
