import {
  Stack,
  StackProps,
  Construct,
  CfnOutput,
  Duration,
  CfnParameter,
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
  GithubOrgName: CfnParameter;
  constructor(scope: Construct, id: string, props: HookStackProps) {
    super(scope, id, props);

    this.GithubOrgName = new CfnParameter(this, 'GithubOrgName', {
      type: 'String',
      description: 'Github Organization Name',
    });

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

    const codeArtifactDockerLambda = new lambda.DockerImageFunction(
      this,
      'codeartifact-docker',
      {
        functionName: 'codeArtifactDockerLambda',
        code: lambda.DockerImageCode.fromImageAsset(
          codeArtifactDockerLambdaAppPath,
          {
            entrypoint: ['/lambda-entrypoint.sh'],
          }
        ),
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

    new apiGw.LambdaRestApi(this, 'RESTEndpoint upload-codeartifact-api', {
      handler: codeArtifactDockerLambda,
    });

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

    const pipelineLambda = new lambda.Function(this, 'pipeline-lambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'main.handler',
      memorySize: 256,
      timeout: Duration.seconds(30),
      code: lambda.Code.fromAsset(pipelineAppPath),
      environment: {
        PARSER_LAMBDA: props.parserLambda.functionName,
        CODE_ARTIFACT_UPLOAD_LAMBDA: codeArtifactDockerLambda.functionName,
      },
    });
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
      'RESTEndpoint Pipeline Lambda',
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

    const pipelineLinkerLambda = new lambda.Function(
      this,
      'link-webhook-lambda',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'main.handler',
        memorySize: 256,
        timeout: Duration.seconds(10),
        code: lambda.Code.fromAsset(linkPipelineAppPath),
        environment: {
          ORG_NAME: this.GithubOrgName.valueAsString,
          WEBHOOK_URL: pipelineApi.url,
        },
      }
    );
    pipelineLinkerLambda.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('SecretsManagerReadWrite')
    );
    pipelineLinkerLambda.node.addDependency(pipelineApi);

    const pipelineLinkerApi = new apiGw.LambdaRestApi(this, 'RESTEndpoint', {
      handler: pipelineLinkerLambda,
      proxy: true,
      deployOptions: {
        stageName: props.stageName,
      },
      description: `REST endpoint for ${props.stageName}`,
    });

    new CfnOutput(this, 'PIPELINE_LINKER_URL', {
      value: pipelineLinkerApi.url ?? 'ERROR: No URL allocated',
    });

    this.pipelineLinkerApiURL = pipelineLinkerApi.url;
  }
}
