import { Stack, StackProps, Construct, CfnParameter } from '@aws-cdk/core';
import * as codeArtifact from '@aws-cdk/aws-codeartifact';

export interface CodeArtifactStackProps extends StackProps {
  codeArtifactDomain: CfnParameter;
}

export class CodeArtifactStack extends Stack {
  constructor(scope: Construct, id: string, props?: CodeArtifactStackProps) {
    super(scope, id, props);

    /* this is bucketname for directory */
    const orgName = props.codeArtifactDomain.valueAsString;
    const caDomain = new codeArtifact.CfnDomain(this, 'CA Domain', {
      domainName: orgName,
    });

    const publicRepo = new codeArtifact.CfnRepository(this, 'Public Repo', {
      domainName: caDomain.domainName,
      repositoryName: 'public-' + orgName,
      externalConnections: ['public:npmjs'],
    });
    publicRepo.addDependsOn(caDomain);

    const privateRepo = new codeArtifact.CfnRepository(this, 'Private Repo', {
      domainName: caDomain.domainName,
      repositoryName: 'private-' + orgName,
      upstreams: [publicRepo.repositoryName],
    });
    privateRepo.addDependsOn(publicRepo);
  }
}
