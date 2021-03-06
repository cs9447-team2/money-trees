import {
  Stack,
  StackProps,
  Construct,
  CfnOutput,
  Duration,
} from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apiGw from '@aws-cdk/aws-apigateway';
import * as iam from '@aws-cdk/aws-iam';
import { join } from 'path';

interface HookStackProps extends StackProps {
  stageName: string;
  parserLambda: lambda.Function;
}

export class HookStack extends Stack {
  pipelineLinkerApiURL: string;
  constructor(scope: Construct, id: string, props: HookStackProps) {
    super(scope, id, props);

    // codeArtifactDockerLambda
    const codeArtifactDockerLambdaAppPath = join(
      __dirname,
      '..',
      '..',
      '..',
      'hooks',
      'pipeline',
      'code-artifact-docker'
    );

    const namesapce = this.node.tryGetContext('CodeArtifactNamespace');
    if (!namesapce) throw new Error('CodeArtifactNamespace context undefined');

    const codeArtifactDockerLambda = new lambda.DockerImageFunction(
      this,
      `${props.stageName}-codeartifact-docker`,
      {
        functionName: `${props.stageName}codeArtifactDockerLambda`,
        code: lambda.DockerImageCode.fromImageAsset(
          codeArtifactDockerLambdaAppPath,
          {
            entrypoint: ['/lambda-entrypoint.sh'],
          }
        ),
        environment: {
          NAMESPACE: namesapce,
        },
        timeout: Duration.seconds(90),
        memorySize: 8192,
      }
    );
    // attach policy
    codeArtifactDockerLambda.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('SecretsManagerReadWrite')
    );
    codeArtifactDockerLambda.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCodeArtifactAdminAccess')
    );
    codeArtifactDockerLambda.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AWSLambda_FullAccess')
    );

    new apiGw.LambdaRestApi(
      this,
      `${props.stageName}RESTEndpoint upload-codeartifact-api`,
      {
        handler: codeArtifactDockerLambda,
      }
    );

    // Pipeline
    const pipelineAppPath = join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'dist',
      'apps',
      'hooks',
      'pipeline'
    );

    const pipelineLambda = new lambda.Function(
      this,
      `${props.stageName}-pipeline-lambda`,
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'main.handler',
        memorySize: 256,
        timeout: Duration.seconds(30),
        code: lambda.Code.fromAsset(pipelineAppPath),
        environment: {
          PARSER_LAMBDA: props.parserLambda.functionName,
          CODE_ARTIFACT_UPLOAD_LAMBDA: codeArtifactDockerLambda.functionName,
        },
      }
    );
    pipelineLambda.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('SecretsManagerReadWrite')
    );
    // add AWSLambda_FullAccess
    pipelineLambda.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AWSLambda_FullAccess')
    );
    props.parserLambda.grantInvoke(pipelineLambda);
    codeArtifactDockerLambda.grantInvoke(pipelineLambda);

    const pipelineApi = new apiGw.LambdaRestApi(
      this,
      `${props.stageName}RESTEndpoint Pipeline Lambda`,
      {
        handler: pipelineLambda,
        proxy: true,
        deployOptions: {
          stageName: props.stageName,
        },
        description: `REST endpoint for ${props.stageName}`,
      }
    );

    // Setup webhook
    const linkPipelineAppPath = join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'dist',
      'apps',
      'hooks',
      'link-webhook'
    );

    const orgName = this.node.tryGetContext('GithubOrgName');
    if (!orgName) throw new Error('GithubOrgName context undefined');
    const pipelineLinkerLambda = new lambda.Function(
      this,
      `${props.stageName}-link-webhook-lambda`,
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'main.handler',
        memorySize: 256,
        timeout: Duration.seconds(10),
        code: lambda.Code.fromAsset(linkPipelineAppPath),
        environment: {
          ORG_NAME: orgName,
          WEBHOOK_URL: pipelineApi.url,
        },
      }
    );
    pipelineLinkerLambda.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('SecretsManagerReadWrite')
    );
    pipelineLinkerLambda.node.addDependency(pipelineApi);

    const pipelineLinkerApi = new apiGw.LambdaRestApi(
      this,
      `${props.stageName}-RESTEndpoint`,
      {
        handler: pipelineLinkerLambda,
        proxy: true,
        deployOptions: {
          stageName: props.stageName,
        },
        description: `REST endpoint for ${props.stageName}`,
      }
    );

    new CfnOutput(this, `${props.stageName}PipelineLinkerURL`, {
      value: pipelineLinkerApi.url ?? 'ERROR: No URL allocated',
    });

    this.pipelineLinkerApiURL = pipelineLinkerApi.url;
  }
}
