import { Stack, StackProps, Construct } from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3n from '@aws-cdk/aws-s3-notifications';
import { DatabaseStack } from './database-stack';
import { join } from 'path';
import { NodeLambdaFunc } from '../constructs';

interface ParserStackProp extends StackProps {
  database: DatabaseStack;
}

export class ParserStack extends Stack {
  constructor(scope: Construct, id: string, props: ParserStackProp) {
    const { database, ...stackProps } = props;
    super(scope, id, stackProps);

    const pathToCode = join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'dist',
      'apps',
      'parser'
    );

    const parserLambda = new NodeLambdaFunc(this, 'ParserHandlerFunc', {
      code: lambda.Code.fromAsset(pathToCode),
      environment: {
        DOMAIN: 'enron2',
      },
    }).LambdaFunction;

    database.grantReadAll(parserLambda);
    database.grantWrite(parserLambda, 'Package');
    database.grantWrite(parserLambda, 'Project');

    // BUG: ??? Something here creates a python function that handles notification, why can't attach directly????

    const bucket = new s3.Bucket(this, 'LockFileBucket', {
      // TODO: handle access control to allow uploads from certain sources
      bucketName: 'lock-file-bucket',
    });
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(parserLambda)
    );
    bucket.grantRead(parserLambda);
  }
}
