import 'dotenv/config';
import { App } from 'aws-cdk-lib';
import { AnalyticsStack } from '../lib/analytics-stack.js';

const app = new App();

const account = process.env.AWS_ACCOUNT_ID ?? process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.AWS_REGION ?? process.env.CDK_DEFAULT_REGION;

new AnalyticsStack(app, 'AnalyticsStack', {
  env: {
    account,
    region
  }
});