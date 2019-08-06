
export interface Dependencies {
  devDependencies: {[index: string]: string};
  dependencies: {[index: string]: string};
  peerDependencies: {[index: string]: string};
  optionalDependencies: {[index: string]: string};
}

export const DEPENDENCIES: Dependencies = {
  devDependencies: {
    '@angular-builders/custom-webpack': '^8.1.0',
    '@atlaskit/css-reset': '^5.0.5',
    '@atlaskit/reduced-ui-pack': '^12.0.3',
    'atlassian-connect-express': '^3.5.1',
    sequelize: '^5.12.2',
    sqlite3: '^4.0.9',
    'body-parser': '^1.19.0',
    compression: '^1.7.4',
    'cookie-parser': '^1.4.4',
    errorhandler: '^1.5.1',
  },
  dependencies: {},
  peerDependencies: {},
  optionalDependencies: {}
};


