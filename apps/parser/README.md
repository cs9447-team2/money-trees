# Parser

- Parser lambda that will be invoked by other lambdas
- Inserts the data into database correctly based on the file given
  - Invoke with link to github repository
  - Download `package-lock.json` with `Octokit`
  - Do parsing logic
  - Save to database
- Currently only supports `package-lock.json` file generated by `npm`
- Requires domain to be defined as environment variable, this is the same value as your CodeArtifact domain
