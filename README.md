## Solution Pattern: The Backend

### Knative Function on NodeJS Setup

1. **Installation of the OpenShift CLI Client (oc) and Knative CLI Client (kn):**
   Ensure that you have the OpenShift CLI (oc) and Knative CLI (kn) installed on your local machine. You can download them from the official OpenShift website.

2. **Authentication and Login:**
   Authenticate and log in to your OpenShift cluster using the following command from this link:
   `https://oauth-openshift.apps.sandbox-m3.1530.p1.openshiftapps.com/oauth/token/request`
   ```bash
   oc login --token=sha256~xxx --server=https://api.sandbox-m3.1530.p1.openshiftapps.com:6443

   ```

3. **Create a Serverless Function Instance:**
   Use the Knative CLI to create a serverless function instance:
   ```bash
   kn func create -c
   ```
   This command will guide you through the creation process, allowing you to specify details such as the runtime (NodeJS) and the function's entry point.

### Language Model (LLM) - ChatGPT Setup

1. **Create an Account with OpenAI:**
   To use ChatGPT, create an account on the OpenAI platform and obtain your secret API key.

2. **AstraDB Database Creation:**
   - Create an account with AstraDB.
   - Obtain the following details:
     - `ASTRA_DB_ID`
     - `ASTRA_DB_REGION`
     - `ASTRA_DB_APPLICATION_TOKEN`

### Github Integration

1. **Create a GitHub App:**
   - Create a GitHub App in your GitHub account settings.
   - Configure the app to listen to relevant events such as `installation_repositories` and `push`.
   - Set up necessary permissions for the app to access repositories.

2. **Obtain Personal Access Token:**
   - Generate a personal access token for the Octokit library. This token will be used to authenticate GitHub API requests made by your application.


Now, your AutoDocs AI application is set up with a backend powered by Knative Functions, leveraging ChatGPT for natural language processing, AstraDB for data storage, and GitHub for version control. The frontend is seamlessly served using Knative Serving, creating a cohesive and responsive documentation platform.

![AutoDocs Architectual Diagram](./AutoDocs%20AI%20(1).png)


# Node.js Cloud Events Function

Welcome to your new Node.js function project! The boilerplate function
code can be found in [`index.js`](./index.js). This function is meant
to respond to [Cloud Events](https://cloudevents.io/).

## Local execution

After executing `npm install`, you can run this function locally by executing
`npm run local`.

The runtime will expose three endpoints.

  * `/` The endpoint for your function.
  * `/health/readiness` The endpoint for a readiness health check
  * `/health/liveness` The endpoint for a liveness health check

The health checks can be accessed in your browser at
[http://localhost:8080/health/readiness]() and
[http://localhost:8080/health/liveness](). You can use `curl` to `POST` an event
to the function endpoint:

```console
curl -X POST -d '{"name": "Tiger", "customerId": "0123456789"}' \
  -H'Content-type: application/json' \
  -H'Ce-id: 1' \
  -H'Ce-source: cloud-event-example' \
  -H'Ce-type: dev.knative.example' \
  -H'Ce-specversion: 1.0' \
  http://localhost:8080
```

The readiness and liveness endpoints use
[overload-protection](https://www.npmjs.com/package/overload-protection) and
will respond with `HTTP 503 Service Unavailable` with a `Client-Retry` header if
your function is determined to be overloaded, based on the memory usage and
event loop delay.

## The Function Interface

The `index.js` file may export a single function or a `Function`
object. The `Function` object allows developers to add lifecycle hooks for
initialization and shutdown, as well as providing a way to implement custom
health checks.

The `Function` interface is defined as:

```typescript
export interface Function {
  // The initialization function, called before the server is started
  // This function is optional and should be synchronous.
  init?: () => any;

  // The shutdown function, called after the server is stopped
  // This function is optional and should be synchronous.
  shutdown?: () => any;

  // The liveness function, called to check if the server is alive
  // This function is optional and should return 200/OK if the server is alive.
  liveness?: HealthCheck;

  // The readiness function, called to check if the server is ready to accept requests
  // This function is optional and should return 200/OK if the server is ready.
  readiness?: HealthCheck;

  logLevel?: LogLevel;

  // The function to handle HTTP requests
  handle: CloudEventFunction | HTTPFunction;
}
```

## Handle Signature

CloudEvent functions are used in environments where the incoming HTTP request is a CloudEvent. The function signature is:

```typescript
interface CloudEventFunction {
  (context: Context, event: CloudEvent): CloudEventFunctionReturn;
}
```

Where the return type is defined as:

```typescript
type CloudEventFunctionReturn = Promise<CloudEvent> | CloudEvent | HTTPFunctionReturn;
type HTTPFunctionReturn = Promise<StructuredReturn> | StructuredReturn | ResponseBody | void;
```

The function return type can be anything that a simple HTTP function can return or a CloudEvent. Whatever is returned, it will be sent back to the caller as a response.

Where the `StructuredReturn` is a JavaScript object with the following properties:

```typescript
interface StructuredReturn {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: ResponseBody;
}
```

If the function returns a `StructuredReturn` object, then the `statusCode` and `headers` properties are used to construct the HTTP response. If the `body` property is present, it is used as the response body. If the function returns `void` or `undefined`, then the response body is empty.

The `ResponseBody` is either a string, a JavaScript object, or a Buffer. JavaScript objects will be serialized as JSON. Buffers will be sent as binary data.

### Health Checks

The `Function` interface also allows for the addition of a `liveness` and `readiness` function. These functions are used to implement health checks for the function. The `liveness` function is called to check if the function is alive. The `readiness` function is called to check if the function is ready to accept requests. If either of these functions returns a non-200 status code, then the function is considered unhealthy.

A health check function is defined as:

```typescript
/**
 * The HealthCheck interface describes a health check function,
 * including the optional path to which it should be bound.
 */
export interface HealthCheck {
  (request: Http2ServerRequest, reply: Http2ServerResponse): any;
  path?: string;
}
```

By default, the health checks are bound to the `/health/liveness` and `/health/readiness` paths. You can override this by setting the `path` property on the `HealthCheck` object, or by setting the `LIVENESS_URL` and `READINESS_URL` environment variables.

## Testing

This function project includes a [unit test](./test/unit.js) and an
[integration test](./test/integration.js). All `.js` files in the test directory
are run.

```console
npm test
```
