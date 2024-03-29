const _ = require('lodash');
const asyncLib = require('async');

let safeProcess

try {
  safeProcess = process
} catch(e) {
  safeProcess = {env: window}
}

//simple function to display the error or retrieved dependencies
function display(error, dependencies) {
  if (error) {
    console.log(`error: ${error}`);
    console.log(error.stack)
  } else {
    console.log(JSON.stringify(dependencies, null, 2));
  }
}

function validateSourceToDeps(dependencyName, source, dataDependencies) {
  if (source) {
    if (_.isString(source) || _.isNumber(source)) {
      if (!dataDependencies[source]) {
        throw new Error(`${dependencyName} has an invalid parameter source: ${source} not in ${JSON.stringify(dataDependencies)}`);
      }
    } else if (_.isArray(source)) {
      _.each(source, (sourceMember) => {
        if (!dataDependencies[sourceMember]) {
          throw new Error(`${dependencyName} has an invalid parameter source: ${sourceMember} not in ${JSON.stringify(dataDependencies)}`);
        }
      });
    } else {
      throw new Error(`source ${source} has invalid type ${typeof source}`)
    }
  }
}

function validateInputExists(inputName, input, inputs) {
  if (input) {
    if (_.isString(input) || _.isNumber(input)) {
      if (_.isUndefined(_.get(inputs, input))) {
        throw new Error(`${inputName} has an invalid input: ${input} not in ${JSON.stringify(inputs)}`);
      }
    } else if (_.isArray(input)) {
      _.each(input, (inputMember) => {
        if (_.isUndefined(_.get(inputs, inputMember))) {
          throw new Error(`${inputName} has an invalid input: ${inputMember} not in ${JSON.stringify(inputs)}`);
        }
      });
    } else {
      throw new Error(`input ${input} has invalid type ${typeof input}`)
    }
  }
}

function validate(dataDependencies, inputs, target) {
  if (_.isString(target)) {
    target = [target]
  }
  _.each(dataDependencies, ({params}, name) => {
    if (!_.isArray(target) || target.indexOf(name) !== -1) {
      _.each(params, ({source, input}, paramName) => {
        validateSourceToDeps(name, source, dataDependencies);
        validateInputExists(name, input, inputs);
      });
    }
  });
}

function Gopher(defaultRecordCollectors, dataDependencies, initialInputs) {
  const recordCollectors = _.cloneDeep(defaultRecordCollectors)

  const cache = {};

  const internalInputs = _.cloneDeep(initialInputs) || {};

  function setInput(path, val) {
    _.set(internalInputs, path, val);
  }

  function getInput(path) {
    return _.cloneDeep(_.get(internalInputs, path));
  }

  function getInputs() {
    return _.cloneDeep(internalInputs);
  }

  function addToAutoArgs(autoArgs, inputOverrides, metrics, {accessSchema, formatter, params, behaviors}, name) {
    if (autoArgs[name]) {
      return autoArgs;
    }
    const paramNamesToRequirements = {};
    const formatters = {};
    const cacheLifetime = _.get(behaviors, 'cacheLifetime');
    let requirements;
    try {
      requirements = _.reduce(params, function(collector, {source, input, formatter}, paramName) {
        if (source) {
          paramNamesToRequirements[paramName] = source;
          if (_.isString(source) || _.isNumber(source)) {
            if (collector.indexOf(source) === -1) {
              collector.push(source);
              // This ensures that when a call to `addToAutoArgs` succeeds,
              // the dependency _and_ all of its transitive dependencies 
              // have been added to the autoArgs. This allows downstream
              // consumers to isolate the effects of unavailable resources
              // to only the specific elements that rely on those resources
              addToAutoArgs(autoArgs, inputOverrides, metrics, dataDependencies[source], source);
            }
          } else if (_.isArray(source)) {
            _.each(source, (sourceMember) => {
              if (collector.indexOf(sourceMember) === -1) {
                collector.push(sourceMember);
                // See note above.
                addToAutoArgs(autoArgs, inputOverrides, metrics, dataDependencies[sourceMember], sourceMember);
              }
            });
          }
        }
        let requiredInputs = {}
        if (input) {
          if (_.isString(input) || _.isNumber(input)) {
            const override = _.get(inputOverrides, input);
            const priorityInput =  _.isUndefined(override) ? getInput(input) : override;
            requiredInputs[input] = priorityInput
          } else if (_.isArray(input)) {
            requiredInputs = _.reduce(
              input, 
              (acc, i) => {
                if (_.isString(i) || _.isNumber(i)) {
                  const override = _.get(inputOverrides, i);
                  acc[i] = _.isUndefined(override) ? getInput(i) : override;
                } else {
                  throw new Error(`input ${i} has invalid type ${typeof i}`);
                }
                return acc;
              },
              {}
            );
          }
        }
        formatters[paramName] = formatter ? _.partialRight(formatter, requiredInputs) : _.identity;
        return collector;
      }, []);
    } catch(err) {
      let errorString = `Problem getting results for ${name} with accessSchema ${accessSchema.name}. error: ${err}`;
      if (safeProcess.env.EXPLORANDA_DEBUG) {
        errorString = `Problem getting results for ${name} with accessSchema ${accessSchema.name} and params: ${JSON.stringify(params, null, 2)}. error: ${err}`;
      }
      throw new Error(errorString);
    }
    const literals = _.reduce(params, (collector, {value}, paramName) => {
      if (!_.isUndefined(value)) {
        collector[paramName] = value;
      }
      return collector;
    }, {});
    const inputs = _.reduce(params, function(collector, {source, input, formatter}, paramName) {
      if (!_.isUndefined(input) && _.isUndefined(source)) {
        if (_.isString(input) || _.isNumber(input)) {
          const override = _.get(inputOverrides, input);
          const priorityInput =  _.isUndefined(override) ? getInput(input) : override;
          collector[paramName] = (formatter || _.identity)({[input]: priorityInput});
        } else if (_.isArray(input)) {
          collector[paramName] = (formatter || _.identity)(_.reduce(
            input, 
            (acc, i) => {
              if (_.isString(i) || _.isNumber(i)) {
                const override = _.get(inputOverrides, i);
                acc[i] = _.isUndefined(override) ? getInput(i) : override;
              } else {
                throw new Error(`input ${i} has invalid type ${typeof i}`);
              }
              return acc;
            },
            {}
          ));
        }
      }
      return collector;
    }, {});
    const generated = _.reduce(params, (collector, {generate}, paramName) => {
      if (generate) {
        collector[paramName] = generate();
      }
      return collector;
    }, {});

    function returnValueBookkeeping(cache, name, collectorArgs, callback) {
      return function(e, r, metrics) {
        if (e) {
          e.dependencyName = name
        }
        cacheInsert(cache, name, cacheLifetime, collectorArgs, e, r);
        const formattedResults = formatter ? formatter(r, _.cloneDeep(_.merge({}, getInputs(), inputOverrides))) : r;
        return callback(e, formattedResults, metrics);
      };
    }

    function guardCallback(callback) {
      return function(e, r, callMetrics) {
        try {
          const key = `${name}.${_.get(accessSchema, 'dataSource')}.${_.get(accessSchema, 'name')}`
          metrics[key] = callMetrics
          callback(e, r)
        } catch(err) {
          console.error("error in provided callback:")
          console.error(err)
        }
      }
    }

    function getRecords() {
      const args = Array.prototype.slice.call(arguments);
      if (args.length === 1) {
        const callback = guardCallback(args[0])
        const collectorArgs = _.merge({}, literals, inputs, generated);
        const timelyCachedResult = getTimelyCachedResult(cache, name, collectorArgs, cacheLifetime);
        if (timelyCachedResult) {
          return setTimeout(() => {returnValueBookkeeping(cache, null, null, callback)(timelyCachedResult.e, _.cloneDeep(timelyCachedResult.r), {cached: 1})}, 0);
        }
        return recordCollectors[accessSchema.dataSource](accessSchema, collectorArgs, behaviors, returnValueBookkeeping(cache, name, collectorArgs, callback));
      }
      const callback = guardCallback(args[1])
      const dependencies = _.reduce(paramNamesToRequirements, (collector, source, paramName) => {
        paramDeps = _.cloneDeep(_.at(args[0], source));
        const sourceNames = _.isString(source) ? [source] : source;
        collector[paramName] = formatters[paramName](_.fromPairs(_.zip(sourceNames, paramDeps)));
        return collector;
      }, {});
      const collectorArgs = _.merge({}, literals, inputs, generated, dependencies);
      const timelyCachedResult = getTimelyCachedResult(cache, name, collectorArgs, cacheLifetime);
      if (timelyCachedResult) {
        return setTimeout(() => {returnValueBookkeeping(cache, null, null, callback)(timelyCachedResult.e, _.cloneDeep(timelyCachedResult.r), {cached: 1})}, 0);
      }
      return recordCollectors[accessSchema.dataSource](accessSchema, collectorArgs, behaviors, returnValueBookkeeping(cache, name, collectorArgs, callback));
    }

    requirements.push(getRecords);
    autoArgs[name] = requirements.length === 1 ? requirements[0] : requirements;
    return autoArgs;
  }

  // TODO: the cache tries to be memory-efficient by replacing older cached
  // results with newer ones. However, it identifies relevant cached results
  // using the name of the dependency and the parameters passed to the dependency.
  // And it does not explicitly clear expired cached items except by replacing them
  // with newer items that match both name and params. This means that the cache for
  // items that include a constantly-changing param, for instance the current time,
  // will continually expand.
  function cacheInsert(cache, name, cacheLifetime, collectorArgs, e, r) {
    if (name && cacheLifetime && r && !e) {
      cache[name] = cache[name] || [];
      const existingCachedResult = _.find(cache[name], (result) => {
        return _.isEqual(result.collectorArgs, collectorArgs);
      });
      if (existingCachedResult) {
        existingCachedResult.time = Date.now();
        existingCachedResult.e = e;
        existingCachedResult.r = _.cloneDeep(r);
        return;
      } else {
        return cache[name].push({
          collectorArgs: _.cloneDeep(collectorArgs),
          time: Date.now(),
          e, r
        });
      }
    }
  }

  function getTimelyCachedResult(cache, name, collectorArgs, cacheLifetime) {
    if (!_.isNumber(cacheLifetime)) {return;}
    return _.find(cache[name], (item) => {
      return _.isEqual(collectorArgs, item.collectorArgs) && (Date.now() - item.time) < cacheLifetime;
    });
  }

  function report(...selfArgs) {
    const metrics = {}
    const hasCallback = _.isFunction(selfArgs[selfArgs.length - 1])
    const inputOverrides = selfArgs[1] && !_.isFunction(selfArgs[1]) ? selfArgs[1] : null;
    const target = _.isString(selfArgs[0]) || _.isArray(selfArgs[0]) ? selfArgs[0] : null;
    const callback = hasCallback ? selfArgs[selfArgs.length - 1] : display;
    try {
      validate(dataDependencies, _.merge({}, inputOverrides, getInputs()), target);
    } catch(e) {
      callback(e, undefined, metrics)
      return
    }
    autoArgs = {};
    if (!target) {
      try {
        _.each(dataDependencies, _.partial(addToAutoArgs, autoArgs, inputOverrides, metrics));
        return asyncLib.auto(autoArgs, (e, r) => callback(e, r, metrics));
      } catch(e) {
        callback(e, undefined, metrics)
        return
      }
    }
    if (!_.isArray(target) && (!_.isString(target) && !_.isNumber(target))) {
      callback(new Error(`Bad target: ${target} for dataDependencies: ${dataDependencies}`), undefined, metrics);
      return
    } else if (_.isArray(target)) {
      try {
        _.each(target, (t) => addToAutoArgs(autoArgs, inputOverrides, metrics, dataDependencies[t], t));
      } catch(e) {
        callback(e, undefined, metrics)
        return
      }
    } else {
      try {
        addToAutoArgs(autoArgs, inputOverrides, metrics, dataDependencies[target], target);
      } catch(e) {
        callback(e, undefined, metrics)
        return
      }
    }
    return asyncLib.auto(autoArgs, (e, r) => callback(e, r, metrics));
  }

  function getCache() { return _.cloneDeep(cache); }

  return {report, getCache, setInput, getInput, getInputs, recordCollectors};
}

module.exports = {
  Gopher
};
