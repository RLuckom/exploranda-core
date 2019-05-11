
!["Build Status"](https://travis-ci.com/RLuckom/exploranda-core.svg?branch=master)

## Introduction

Exploranda is a powerful, flexible, and efficient nodejs library for fetching and
combining data from APIs. 

Exploranda-core is Exploranda's data-gathering module. It allows you to represent data from APIs
(such as compute instances from AWS or Google Cloud, records from Elasticsearch,
KV pairs from Vault, or anything else) as a dependency graph. Each individual
dependency is represented as:

 * an `accessSchema` object describing how to interact with the API
 * a set of parameters to use to generate calls to the API
 * optional values controlling the dependency's cache lifetime and postprocessing.

The parameters used to generate the API calls can be: 

 * literal values
 * runtime-generated values,
 * values computed from the results of other dependencies

Exploranda comes with [builtin `accessSchema` objects](docs/accessSchemas.md) 
for several popular APIs and allows you to define your own if what you're
looking for doesn't exist yet. PRs welcome!

I use exploranda:

* To "take notes" on deployed infrastructure by building dashboards to represent it
* To perform one-time or throwaway analysis tasks too complex for `curl` plus `jq`
* To explore new APIs
* To "test drive" monitoring ideas before investing the effort of integrating them into existing systems.

Exploranda is not designed for use cases that require modifying data in APIs
(such as PUT requests and many POST requests, etc.).

To get started creating a report, see the [Getting Started](docs/getting-started.md)
doc.

## Design

APIs come in all shapes and sizes. Some use HTTP, some use HTTPS. Some
return JSON, others HTML, XML, or unstructured plain text. Sometimes
the information you want isn't exposed on an API at all, and you need
to get it in some other way, like by SSH-ing into a machine. Exploranda's
goal is to provide in one library a flexible, unopinionated way to 
bring together data from any number of sources, regardless of differences
between them. 

To achieve this goal, Exploranda defines a series of object types. From a
library user's point of view, the following list reflects a gradient from the
simplest user-facing objects to the most complex internally-defined objects.
From a library contributor's point of view, it reflects a gradient from
the most domain-specific types to the most generic types.

### 1. Dependency Objects
A dependency object represents a specific piece of information that a 
user wants, such as "the list of all my compute instances" or "a set 
of records from elasticsearch." A dependency object references an `accessSchema`
for interacting with a particular data source, and the parameters required
by that `accessSchema` to get the requested data. The dependency object may
also include some bookkeeping settings such as how long responses should be
cached, etc. All library users will need to write dependency objects.

The parameters specified in a dependency object may be literal values,
values generated at runtime, or instructions for creating values based
on the results of other dependencies. The basic user-facing data access
concept is the graph of dependency objects, specified as "name:dependency object"
pairs. The [examples](examples/) directory includes a number of example reports.
The [Getting Started](docs/getting-started.md) tutorial describes the process
of building a dependency graph.

### 2. `accessSchema` Objects
`accessSchema` objects represent the generic information about how to
interact with a particular `dataSource`. In addition to specifying the 
`dataSource` they are designed for, They include details about how an API
is paginated, what its responses look like, and specific limits on calling
it. In cases where a special library is used to interact with an API,
such as the AWS and Google node SDKs, the `accessSchema` object includes
information about how to instantiate the SDK object required to make 
the request. Some library users may need to write `accessSchema` objects
and are encouraged to consider opening PRs to contribute useful ones
back upstream as builtins. For a complete list of builtin `accessSchema` objects,
see [accessSchemas.md](docs/accessSchemas.md). For complete documentation
of `accessSchema` fields, see the [`accessSchema`](#accessschema-objects)
section. For a tutorial on building your own, see [Creating Access Schemas](docs/creating-accessSchemas.md).

### 3. `recordCollector` Functions
`recordCollector` functions are responsible for asynchronously getting 
data from a `dataSource`. For each `dataSource`, a single `recordCollector`
function exists. This function's job is to parse an `accessSchema` and a set
of parameters, make calls to its `dataSource`, and send the results to a callback.
None of the previous object types in this hierarchy may make asynchronous
calls; the `recordCollector` and the subsequent objects do. Library users 
should not need to write their own `recordCollector` functions. The 
[`baseRecordCollector`](lib/baseRecordCollector.js) file includes a wrapper
function that builds a full-featured `recordCollector` object when given a `getAPI`
function as an argument; see the [`awsRecordCollector`](lib/awsRecordCollector.js),
[`gcpRecordCollector`](lib/gcpRecordCollector.js) and [`genericApiRecordCollector`](lib/genericApiRecordCollector.js)
for examples.

### 4. The `Gopher` object
The `Gopher` object contains the logic for reading a graph of dependency
objects, determining the correct order in which to fetch them, using
each dependency's specified `accessSchema`, parameters, and the `recordCollector`
specified by the access schema to collect the value from the `dataSource`,
and using the values collected to construct the parameters of subsequent
dependencies that require them. The `Gopher` object is defined in [lib/composer.js](lib/composer.js)

## Dependencies

The dependency graph is represented as a JavaScript Object. Its keys 
are the names of the "dependencies" to be  retrieved. Its values 
describe the data: where it comes from, what it looks like, and what 
parameters to use to get it. A very simple dependency object looks like this:

```javascript
const {kinesisStreams, kinesisStream} = require('exploranda').dataSources.AWS.kinesis;

const apiConfig = {region: 'us-east-1'};

const dataDependencies = {
  kinesisNames: {
    accessSchema: kinesisStreams,
    params: {apiConfig: {value: apiConfig}},
  },
  kinesisStreams: {
    accessSchema: kinesisStream,
    params: {
      apiConfig: {value: apiConfig},
      StreamName: {
        source: 'kinesisNames'
        formatter: ({kinesisNames}) => kinesisNames
      }
    }
  }
};
```

This object specifies two pieces of data: an array of AWS Kinesis Stream names and an array
of Kinesis Stream objects returned from the AWS API. 

Each dependency defines some attributes:

`accessSchema` : Object (required) The AccessSchema object describing how to access the type of data the 
                 dependency refers to. The intent is that there should already be an AccessSchema object
                 for whatever type of dependency you want, but if there isn't, see the AccessSchema
                 sections at the end of this document.

`params` : Object. Parameters to fulfill the requirements of the AccessSchema or override defaults.
          the `params` object allows you to specify a static value, a runtime-generated value, or a 
          value computed from another dependency. For the keys to specify on the `params` object, look
          at the `params` and `requiredParams` fields on the `accessSchema` object, and any associated
          documentation. For instance, the accessSchema `kinesisStream` in the example above specifies
          the way to use the aws `describeStreams` method, so the `params` for that dependency can include
          any parameter accepted by that method. The `StreamName` is a required parameter, so it
          must be specified. Note that the `apiConfig` parameter is _always_ required. It is an object that
          will be merged with the default arguments for the aws api constructor (e.g.`new AWS.ec2(apiConfig)`)
          so it is the place to pass `region`, `accessKeyId`, `secretAccessKey`, and `sessionToken` arguments
          to override the defaults. This allows you to specify region and aws account to use on a 
          per-dependency basis.

`formatter`: Function. Function to format the result of the dependency.
            For instance, the describeInstances AWS method always returns an array. If you filter for the
            ID of a single instance, it would make sense to use the formatter parameter to transform the
            result from an array of one instance to the instance record itself, for the convenience of
            referencing it elsewhere.

`cacheLifetime`: Number (optional), Amount of time, in ms, to keep the result of a call to this
                 dependency with a particular set of arguments cached. The arguments and dependencies
                 are resolved _before_ the `cacheLifetime` is evaluated, so a large cacheLifetime
                 value will _not_ short-circuit fetching any downstream dependencies--only the 
                 `cacheLifetime` values of those dependencies control their cache behavior.

`behaviors` : Object (optional), settings for how the results are fetched. The only setting currently
              used is `parallelLimit`, which controls how many parallel calls will be made at once
              for a given dependency in most situations ("tree" calls are the exception). The `behaviors`
              object will eventually also subsume the `cacheLifetime` setting and implement retry settings.

#### Dependency Params

The values on the `params` object can be used to specify a static value, a runtime-generated value, or
a value computed from the data returned in other dependencies. 

To specify a static value, set the `value` attribute to the value you want to use:

```javascript
const {kinesisStream} = require('exploranda').dataSources.AWS.kinesis;
const apiConfig = {region: 'us-east-1'};

const dataDependencies = {
  myKinesisStream: {
    accessSchema: kinesisStream,
    params: {
      apiConfig: {value: apiConfig},
      StreamName: {
        value: 'my-stream-name'
      }
    }
  }
};
```

To specify a runtime-generated value, set the `generate` attribute to a function that will generate the value
for the parameter. This example is a bit silly, but the ability to generate values is useful when a metrics API
needs to be given a time range: 

```javascript
const {kinesisStream} = require('exploranda').dataSources.AWS.kinesis;
const apiConfig = {region: 'us-east-1'};

const dataDependencies = {
  myKinesisStream: {
    accessSchema: kinesisStream,
    params: {
      apiConfig: {value: apiConfig},
      StreamName: {
        generate: () => `my-stream-name-${Date.now()}`
      }
    }
  }
};
```

To specify a parameter based on the result of another dependency, provide the source dependency name
as the `source` attribute, and an optional `formatter` function to transform the source value into
the shape required by the call. In the following example, the `kinesisStreams` dependency will get the
list of stream names received as the result of the `kinesisNames` dependency, filtered to only include
those that include the substring `foo`. Note that the `formatter` is passed an object with the 
`source` dependencies keyed by their names:

```javascript
const {kinesisStreams, kinesisStream} = require('exploranda').dataSources.AWS.kinesis;
const apiConfig = {region: 'us-east-1'};

const dataDependencies = {
  kinesisNames: {
    accessSchema: kinesisStreams,
    params: {apiConfig: {value: apiConfig}},
  },
  kinesisStreams: {
    accessSchema: kinesisStream,
    params: {
      apiConfig: {value: apiConfig},
      StreamName: {
        source: 'kinesisNames',
        formatter: ({streamNames}) => streamNames.filter((s) => s.indexOf('foo') !== -1)
      }
    }
  }
};
```

Note that `formatter` functions should be prepared to deal with cases when the data they expect is not
available.

In addition, there are parameters that are specific to dependencies
that use the `GENERIC_API` accessSchema objects. The `apiConfig` parameter
specifies metadata abount how to talk to the API. Certain paths on the `apiConfig`
parameter are treated specially by the `GENERIC_API` `recordCollector`:

`apiConfig.host` : The host to which to make the request (cannot include protocol, should include port if neccessary)

`apiConfig.path`: path part of the URL. See `path` above.

`apiConfig.method`: HTTP method. See `method` above. defaults to `GET`

`apiConfig.protocol`: protocol string. See `protocol` above. defaults to `https://`

`apiConfig.ca` : If provided, sets a CA for request to use when validating 
                 the server certificate.

`apiConfig.cert`: If provided, a client certificate to use in the request

`apiConfig.key`: If provided, a client certificate key to use in the request

`apiConfig.passphrase`: If provided, a passphrase to unlock the client certificate key to use in the request

`apiConfig.user`: If provided, a username to use in the request auth

`apiConfig.pass`: If provided, a password to use in the request auth

`apiConfig.token`: If provided, a bearer token to use in the request auth.
                   This will override user:pass auth if both are provided.

`apiConfig.pathParamKeys`: If provided, will be concatenated with the sourceSchema's `pathParamKeys`
                           array described above.

`apiConfig.queryParamKeys`: If provided, will be concatenated with the sourceSchema's 
                            `queryParamKeys` array described above.

`apiConfig.headerParamKeys`: If prsovided, will be concatenated with the sourceSchema's 
                             `headerParamKeys` array described above.

`apiConfig.bodyParamKeys`: If provided, will be concatenated with the sourceSchema's `bodyParamKeys`
                           array described above.

### Dependency Automagic

The dependency objects originated as an abstraction layer over AWSs APIs, which, while impressive
in their depth, completeness and documentation, can also be maddeningly inconsistent and edge-case-y.
Specifically, I wanted a simple way to get all of the objects associated with a particular AWS
resource type, like all kinesis streams or all the services in an ECS cluster, without always having to
account for the quirks and inconsistencies between the APIs for different services. So the dependencies stage
can do a couple of things you might not expect if you're familliar with the underlying APIs, such
as getting a list of resources even if they have to be fetched individually or in batches.

For example, take the case where you want to get the descriptions of every service in a cluster.
Your `dataDependencies` object could have as few as two entries:

```javascript
const {serviceArnsByCluster, servicesByClusterAndArnArray} = require('exploranda').dataSources.AWS.ecs;
const apiConfig = {region: 'us-east-1'};

const dataDependencies = {
  serviceArns: {
    accessSchema: serviceArnsByCluster,
    params : {
      apiConfig: {value: apiConfig},
      cluster: {
        value: 'my-cluster-name'
      }
    }
  },
  services: {
    accessSchema: servicesByClusterAndArnArray,
    params: {
      apiConfig: {value: apiConfig},
      cluster : {
        value: 'my-cluster-name'
      },
      services: {
        source: 'serviceArns',
        formatter: ({serviceArns}) => serviceArns
      }
    },
  }
};
```

The data returned for these dependencies will include the ARN of _every_ service in the cluster
(`serviceArns`) and the description of _every_ service in the cluster (`services`).

If you're familliar with the AWS API, you might notice that the `listServices` method used to get
the ARNs of services in a cluster only returns up to 10 services per call. Part of the 
`serviceArnsByCluster` `accessSchema` object specifies this, and the framework automatically
recognizes when there are more results and fetches them. It also merges the results of all of the 
calls into a single array of just the relevant objects--the value gathered for the `serviceArns` 
dependency is simply an array of service ARN strings.

The other big feature of the dependency stage is the ability to handle parameters in the way
that is most convenient for the report implementer. For instance, the `serviceArns` array can be
arbitrarily long--it could be a list of 53 services in a cluster. But the `describeServices` AWS
API method requires that the `services` parameter be an array of no more than 10 service ARNs.
Here, the `servicesByClusterAndArnArray` `accessSchema` object includes this requirement, and the
framework internally handles the process of chunking an arbitrary number of services into
an appropriate number of calls. 

The general pattern of the `dataDependencies` object is that, for any type of resource, you can pass
an arbitrary array of the resource-specific "ID" value for that resource and expect to get back the
(full) corresponding array of resources without worrying about the specifics of parameterization or
pagination. Likewise, for "list" endpoints, you can expect to get back the full list of relevant 
resources. This frees you from having to understand the specifics of the AWS API, but does require
a little thought about how many results you expect a particular dependency to generate. When the AWS
API provides a mechanism for filtering on the server side, it's often a good idea to use it. And some 
`accessSchema` objects intentionally do not specify the way to get all of the results, such as the
CloudWatchLogs accessSchemas, which would probably need to fetch gigabytes or terabytes if they
tried to fetch everything. 

As an additional bonus, dependencies are fetched concurrently whenever possible, so load times tend 
not to be too bad. When given the choice between optimizing performance or optimizing ease-of-development,
however, I've consistently picked ease-of-development.

And speaking of ease-of-development, I also noticed that a lot of the `dataDependency` objects turn
out to be boilerplate, so most of them have associated builder functions that just take the parts
that usually change. The `dataDependency` above can also be implemented as:

```javascript
const {clusterServiceArnsBuilder, servicesInClusterBuilder} = require('exploranda').dataSources.AWS.ecs;
const apiConfig = {region: 'us-east-1'};

const dataDependencies = {
  serviceArns: clusterServiceArnsBuilder(apiConfig, {value: 'my-cluster-name'}),
  services: servicesInClusterBuilder(apiConfig,
    {value: 'my-cluster-name'},
    {source: 'serviceArns'}
  )
};
```

These builder functions are fairly ad-hoc at the moment and I'm loathe to introduce yet another
abstraction layer and data structure, so it may be best to regard those that exist as unstable.
However, it is often convenient to implement such builders yourself in the context of a specific
report.

## AccessSchema Objects

AccessSchema objects live one step closer to the center of this library than the 
dependency, objects, and so they are also one step more
general, re-usable, and, unfortunately, complicated. This tool consists of a very
small core of relatively gnarly code (`libs/composer`, `libs/reporter`, 
`libs/baseRecordCollector`) which is in total about a third of the
size of the documentation. Surrounding that is a layer of standard-but-numerous
accessSchema objects, which are themselves more complex than I would like a casual
user to have to deal with. The design goal is that it should be simple for many
people working in parallel to add any accessSchema objects as they are needed, and
more casual users should usually find that the accessSchema object they want already
exists or can be created and merged quickly.

At the top level, each `accessSchema` must have a `dataSource` attribute
identifying the reoprter function that knows how to fulfill requests 
using that schema; other than that, the layout of each type of 
accessSchema is determined by the requirements of the reporter function.

### SDK Access Schemas

The intent of the SDK accessSchema is to describe everything needed to interact with
an SDK method. For examples of AWS AccessSchema objects, look in the 
`lib/dataSources/aws` directory. For examples of the GCP AccessSchema objects,
look in the `lib/dataSources/gcp` directory.

#### Simple fields

`dataSource` (required) : must be exactly `'AWS'` for AWS AccessSchemas
and exactly `'GOOGLE'` for GCP AccessSchemas.

`name` (required) : A name expressing the data source, used in error messages

`apiMethod` (required) : the API method whose interface this accessSchema describes.
This field differs between the AWS and GCP AccessSchemas. For AWS, it is the string
name of the method on the relevand SDK object. For GCP, it is an array with the
parts of the API namespace after the first. For instance, the apiMethod
for the `compute.instanceGroups.list` API is `['instanceGroups', 'list']`. For
Kubernetes, the `apiMethod` is the url path not including the host, with ES6 string
interpolations for path parameters. For instance. the `apiMethod` for the
[endpoint to get a single pod](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.13/#-strong-read-operations-pod-v1-core-strong-) is `/api/v1/namespaces/${namespace}/pods/${name}`,
and the `namespace` and `name` values from the `params` object will be substituted into
the path.

`incompleteIndicator` (optional) : a way to tell if the results from a call to this 
API are incomplete and we need to get more. If this is a string or number, it is
treated as a path on the result object (e.g. if `nextToken` exists, this result is
incomplete). If specified as a function, it will be passed the result object and
can return a truthy value to indicate that this result is incomplete.

`nextBatchParamConstructor` (optional) : a function to construct the parameters
for the next call to the API when the `incompleteIndicator` shows that this is a
partial result. This function is called with two arguments: the parameters used
for the most recent call and the result of the most recent call. its return value
should be the parameters to use in the next call. This field must be specified if
the `incompleteIndicator` is specified. If this function returns an array, the 
objects in the array will each be treated as params to a separate call.

`mergeOperator` (optional) : Function to merge the results of multiple successive
calls to get the complete results. This function is called after _every_ call after
the first with the running total of the results as the first argument and the current
set of results as the second. If this function is not specified, `lodash.concat` is used.
Note that the `mergeOperator` function is only used to merge responses in the case where
the response from a _single_ call is incomplete, and further calls must be made to
get the remainder of the results. In cases when more than one call needs to be made
based on the params provided (including, for now, if the params need to be chunked into
smaller groupings), the results of those calls will be merged with the `mergeIndividual`
function. If the `nextBatchParamConstructor` function returns an array, the arguments
to the `mergeOperator` function will be the results of the current call and an array containing
the results of _all_ downstream calls.

`onError` (optional) : In extremely rare cases, SDK APIs require you to make a call before
you know whether it can succeed. The only example of this so far is the AWS `getBucketPolicy` S3
method, which can return a `NoSuchBucketPolicy` error when a bucket policy does not exist, even
though there is no other way to check for the policy's existence beforehand. In this kind of situation
you can provide an `onError` field in the accessSchema, which will be passed the error and
result of the SDK call. This parameter must return an object with `err` and `res` fields, which
will be treated as if they were the error and response that had been returned by the API.

`mergeIndividual` (optional) : Function to merge the results of multiple calls to an API
_not_ triggered by the `incompleteIndicator`. For instance, if you pass an array of IDs
as a parameter to a dependency whose accessSchema only takes a single ID, `mergeIndividual`
will be used to merge the results of the individual calls to the API for each ID. But if
you pass no params to a dependency whose accessSchema lists a resource, and the result from
the API is incomplete and requires subsequent requests to get all of the results, the results
of the list calls will be merged with `mergeOperator`. 

The `mergeIndividual` function will be passed an array of response arrays from successive requests
to the resource. The default `mergeIndividual` behavior is [`_.flatten`](https://lodash.com/docs/4.17.5#flatten).
To preserve the array of arrays, use `_.identity` or `(x) => x`.

#### The `namespaceDetails` field

The `namespaceDetails` member contains information about the namespace on the
SDK where the apiMethod specified is found. It has two fields:

`name` (String, required) : the exact SDK namespace, e.g. `'EC2'` for AWS or `compute` for GCP.

`constructorArgs` (Object, required) : defaults to pass to the namespace constructor.
Right now this almost always includes `region: 'us-east-1'`, but this will change
as the region will need to be configurable. The API version can also be specified.

#### The `value` field

The `value` field describes the type of value returned by this API. This is required
internally for building parameters for API calls and consolidating the results. It
is also used to construct clear error messages.

`path` (required) : (String|Number) or function to get the _actual_ objects off of
the results returned from the API, which invariably returns the actual cluster /
instances / AMIs / whatever wrapped in some kind of API bookkeeping struct.

`sortBy` (optional) : a selector or function to use to sort the results.

#### The `params` field

This field consists of literal key-value pairs to use as default values in calls
to this endpoint. Do not confuse this with the `params` specified on the dependency
objects--those are _not_ literal values, and need to specify more metadata. 

#### The `requiredParams`  and `optionaParams` fields

The `requiredParams` object specifies the values that _must_ be filled in at runtime in order for
a call to this SDK method to succeed. The keys on this object are the keys that will
be passed to the method. The values on this object provide metadata about how to 
treat the values provided at runtime.

The `optionalParams` object is structured exactly like the `requiredParams` object,
but exploranda will not throw an error if these params aren't specified at runtime.
You can still pass arbitrary parameters even if they are not specified in the
`optionalParams` object--this object simply allows you to specify metatdata about
the parameters.

`max` (Number) : if the length of the array is limited by the SDK,
`max` specifies the maximum number of values allowed per call. 

`description` (String) : Description of the param for the docs.

`defaultSource` (AccessSchema) : in the fairly rare cases where you have a `describe`
API that takes an ID value and returns an object, _and_ there exists a `list` API that
has no required parameters and returns a list of the IDs, you can attach the `accessSchema`
of the `list` API as the `defaultSource` of the ID `requiredParam` object on the `describe`
API. Then, if no specific parameter is specified for the ID in the `dependencies` stage, 
the accessSchema will get the full list of IDs from the `list` API and then use them to get
the full list of resources.

`detectArray` (Function) : A function that, when passed the parameter vaue, returns `true`
if the value is actually an array of parameters for a series of separate calls rather than
a parameter for a single call. For instance, the CloudWatch metrics method requires a set
of "Dimensions" for each call. These Dimensions are specified as an array of Dimension
objects. This makes it impossible for the code doing the requests to determine from the
parameters whether what it sees is "an array of Dimension objects, to be sent as the
Dimensions parameter in a single call" or "an array of _arrays_ of Dimension objects,
meant to be the arguments to _multiple_ calls".

### AccessSchema Object Extensions for Generic Request-Based APIs

For many common APIs it is simpler to just use https://github.com/request/request[request js] 
as the base SDK and build accessSchema objects to provide a natural pattern
for interacting with the resources and access methods exposed by the API.

To accomodate this use case, there is a `GENERIC_API` data source function
that wraps `request`. `GENERIC_API` accessSchema objects may set all the
fields allowed on ordinary SDK accessSchema objects (defined above) and may
also set the following fields to configure how requests to their API should be made:

`path`: the path part of the URL. May be specified as a JS template
        string to be rendered with parameter values, e.g. `'/api/v1/users/${userName}`

`method`: the HTTP method to use in the request. Defaults to `GET`

`host`: the host and port to which to make the request, e.g. `google.com:443`
        The port need not be specified if it is the default for the protocol.

`protocol`: the protocol string. Defaults to `https://`

`pathParamKeys`: Generic APIs may specify the path part of their url as a
                 JS template string, e.g. `'/api/v1/users/${userName}'`.
                 The `pathParamKeys` accessSchema field is an array
                 of the names of parameters to be used as values in that
                 template, e.g. `['userName']`.

`queryParamKeys`: an array of the names of parameters to be used as key / value
                  pairs in the request querystring

`bodyParamKeys`: an array of the names of parameters to be used as key / value
                  pairs in the request body.

`headerParamKeys`: an array of the names of parameters to be used as the request headers.

`urlBuilder`: A function that will construct the URL given the
              parameters specified in the `pathParamKeys` array.
              If not specified, defaults to a function that
              uses the params to render the `params.path || sourceSchema.params.path`
              as if it was a JS template string.

`requestQueryBuilder`: A function that will construct the URL query object
              given the parameters specified in the `queryParamKeys` array.
              If not specified, defaults to `_.identity`

`requestBodyBuilder`: A function that will construct the URL body
              given the parameters specified in dthe `bodyParamKeys` array.
              If not specified, defaults to `_.identity`

`requestHeadersBuilder`: A function that will construct the URL headers object
              given the parameters specified in the `headerParamKeys` array.
              If not specified, defaults to `_.identity`

`detectErrors`: A function that is given the error, response, and body after
              a call. Anything it returns is treated as an error object.

### Request AccessSchema Objects

This accessSchema type describes a basic way to talk to HTTP / HTTPS APIs. It is
much less mature than the SDK schema and should be expected to change. For an example
of its use, see `lib/dataSources/elasticsearch/elasticsearch.js`

#### Simple fields

`dataSource` (required) : must be exactly `'REQUEST'`

`generateRequest` (required) : Function to generate the request. Will be passed the 
params specified on the dependency object as the only argument.

`ignoreErrors` (boolean) : if truthy, will simply return undefined on errors.

`defaultResponse` : if `ignoreErrors` is truthy, a response to use when there is an
error; a sensible empty value.

`incomplete` (Function) : detect if the response is incomplete. Analogous to 
`incompleteIndicator` from the SDK access schema.

`mergeResponses` (Function) : merge the responses of successive calls when the results
required more than one call. Analagous to `mergeOperator`.

`nextRequest` (Function): generate the parameters for the next request if the current
results are incomplete. Analagous to `nextBatchParamConstructor`.

### Synthetic AccessSchema Objects

This accessSchema type provides a way to encapsulate a transformation
of another dependency or set of dependencies that should be cached for 
use in multiple downstream dependencies. 

#### Fields

`dataSource`: (required) : must be exactly `'SYNTHETIC'`

`transformation`: (required) : Function, passed the resolved params
                               as an object `{paramName: <value>`}`.
                               The return value of this function is
                               used as the value of this dependency.
