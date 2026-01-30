import { Duration, Stack, StackProps, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..', '..');

export class AnalyticsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const accessLogs = new LogGroup(this, 'ApiAccessLogs', {
      retention: RetentionDays.ONE_WEEK
    });

    const api = new apigw.RestApi(this, 'AnalyticsApi', {
      restApiName: 'GameAnalyticsApi',
      deployOptions: {
        stageName: 'dev',
        accessLogDestination: new apigw.LogGroupLogDestination(accessLogs),
        accessLogFormat: apigw.AccessLogFormat.clf(),
        metricsEnabled: true,
        loggingLevel: apigw.MethodLoggingLevel.INFO,
        dataTraceEnabled: true
      }
    });

    // DynamoDB: GameSessionData
    const sessionsTable = new dynamodb.Table(this, 'GameSessionData', {
      tableName: 'GameSessionData',
      partitionKey: { name: 'parentSessionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sessionStartTime', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: this.node.tryGetContext('removalPolicy') === 'retain' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      pointInTimeRecovery: false
    });

    // GSI: query sessions by gameName and sort by sessionStartTime
    const sessionsGsiName = 'ByGameNameStartTime';
    sessionsTable.addGlobalSecondaryIndex({
      indexName: sessionsGsiName,
      partitionKey: { name: 'gameName', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sessionStartTime', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // DynamoDB: GameTrialsData
    const trialsTable = new dynamodb.Table(this, 'GameTrialsData', {
      tableName: 'GameTrialsData',
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: this.node.tryGetContext('removalPolicy') === 'retain' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      pointInTimeRecovery: false
    });

    const commonFnProps: lambdaNode.NodejsFunctionProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: Duration.seconds(10),
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2020'
      },
      environment: {}
    };

    const ingestFn = new lambdaNode.NodejsFunction(this, 'IngestFn', {
      entry: path.join(packageRoot, 'lambdas', 'ingest.ts'),
      handler: 'handler',
      ...commonFnProps
    });

    const queryFn = new lambdaNode.NodejsFunction(this, 'QueryFn', {
      entry: path.join(packageRoot, 'lambdas', 'query.ts'),
      handler: 'handler',
      ...commonFnProps
    });

    // Wire env vars and permissions
    ingestFn.addEnvironment('SESSIONS_TABLE', sessionsTable.tableName);
    ingestFn.addEnvironment('TRIALS_TABLE', trialsTable.tableName);
    ingestFn.addEnvironment('SESSIONS_GSI', sessionsGsiName);
    queryFn.addEnvironment('SESSIONS_TABLE', sessionsTable.tableName);
    queryFn.addEnvironment('TRIALS_TABLE', trialsTable.tableName);
    queryFn.addEnvironment('SESSIONS_GSI', sessionsGsiName);

    sessionsTable.grantWriteData(ingestFn);
    sessionsTable.grantReadData(ingestFn); // allow Query for updateSession lookup
    trialsTable.grantWriteData(ingestFn);
    sessionsTable.grantReadData(queryFn);
    trialsTable.grantReadData(queryFn);

    const ingest = api.root.addResource('ingest');
    ingest.addCorsPreflight({
      allowOrigins: apigw.Cors.ALL_ORIGINS,
      allowMethods: ['POST', 'OPTIONS'],
      allowHeaders: apigw.Cors.DEFAULT_HEADERS
    });
    ingest.addMethod('POST', new apigw.LambdaIntegration(ingestFn));

    const query = api.root.addResource('query');
    query.addCorsPreflight({
      allowOrigins: apigw.Cors.ALL_ORIGINS,
      allowMethods: ['GET', 'OPTIONS'],
      allowHeaders: apigw.Cors.DEFAULT_HEADERS
    });
    query.addMethod('GET', new apigw.LambdaIntegration(queryFn));

    new CfnOutput(this, 'ApiBaseUrl', { value: api.url });
  }
}