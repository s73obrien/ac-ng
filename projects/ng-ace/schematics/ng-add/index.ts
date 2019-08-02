import {
  Rule,
  SchematicContext,
  Tree,
  SchematicsException,
  apply,
  url,
  chain,
  mergeWith,
  template
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { experimental, strings } from '@angular-devkit/core';
import { Schema as NgAceOptions } from './schema';

export function ngAdd(options: NgAceOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.addTask(new NodePackageInstallTask());

    const workspaceConfig = tree.read('/angular.json');
    if (!workspaceConfig) {
      throw new SchematicsException('Could not find Angular workspace configuration');
    }

    const workspace: experimental.workspace.WorkspaceSchema = JSON.parse(workspaceConfig.toString());
    if (!options.project) {
      options.project = workspace.defaultProject;
    }

    const project = workspace.projects[options.project as string];

    if (!project.architect) {
      throw new SchematicsException('No architect entry found');
    }

    // tslint:disable-next-line: no-string-literal
    const build = project.architect['build'];
    // tslint:disable-next-line: no-string-literal
    const serve = project.architect['serve'];

    if (!build) {
      throw new SchematicsException('Could not find build command options');
    }

    build.builder = '@angular-builders/custom-webpack:browser';
    build.options = {
      ...build.options,
      baseHref: options.baseHref,
      customWebpackConfig: {
        path: './webpack.config.js'
      }
    };

    if (!serve) {
      throw new SchematicsException('Could not find serve command options');
    }

    serve.builder = '@angular-builders/custom-webpack:dev-server';
    serve.options = {
      ...serve.options,
      browserTarget: `${options.project}:build`
    };

    const templateSource = apply(
      url('./files'),
      [
        template({
          ...strings,
          ...options
        })
      ]
    );

    tree.overwrite('/angular.json', JSON.stringify(workspace, undefined, 2));

    const packageContent = tree.read('/package.json');
    if (!packageContent) {
      throw new SchematicsException('No package.json found');
    }

    const packageObject = JSON.parse(packageContent.toString());
    packageObject.dependencies = {
      ...packageObject.dependencies,
      '@angular-builders/custom-webpack': '^8.1.0',
      '@angular/common': '^8.0.0',
      '@angular/core': '^8.0.0',
      '@atlaskit/css-reset': '^5.0.5',
      '@atlaskit/reduced-ui-pack': '^12.0.3',
      'atlassian-connect-express': '^3.5.1',
      'sequelize': '^5.12.2',
      'sqlite3': '^4.0.9'
    };

    
    return chain([
      mergeWith(templateSource)
    ]);
  };
}
