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

import {
  addModuleImportToRootModule,
  getProjectFromWorkspace,
} from '@angular/cdk/schematics';

import {
  NodeDependency,
  NodeDependencyType,
  addPackageJsonDependency,
} from '@schematics/angular/utility/dependencies';

import {
  getWorkspace
} from '@schematics/angular/utility/config';

import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { strings } from '@angular-devkit/core';
import { Schema as NgAceOptions } from './schema';
import { DEPENDENCIES } from './dependencies';
import { pairs } from 'rxjs';
import { map, concatMap } from 'rxjs/operators';
import { JSDOM } from 'jsdom';

export function ngAdd(options: NgAceOptions): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    const workspace = getWorkspace(tree);
    if (!options.project) {
      options.project = workspace.defaultProject;
    }

    const project = getProjectFromWorkspace(workspace, options.project);
    if (!project.architect) {
      throw new SchematicsException('No architect entry found');
    }

    if (project.projectType !== 'application') {
      throw new SchematicsException('ac-ng is intended only for use with applications');
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
      customWebpackConfig: {
        path: './webpack.config.js'
      }
    };

    if (!build.options.index) {
      throw new SchematicsException('Could not find index.html entry in angular.json');
    }

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

    return chain([
      modifyIndexHtml(build.options.index),
      addPackageJsonDependencies(),
      installDependencies(),
      addImportsToAppModule(options),
      mergeWith(templateSource)
    ]);
  };
}

function installDependencies(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.addTask(new NodePackageInstallTask());
    context.logger.debug('Dependencies installed');
  };
}

function modifyIndexHtml(indexLocation: string): Rule {
  return (tree: Tree, context: SchematicContext) => {
    if (!indexLocation) {
      throw new SchematicsException('No index.html file found');
    }
    const indexHtmlBuffer = tree.read(indexLocation);
    if (!indexHtmlBuffer) {
      throw new SchematicsException(`Could not load ${indexLocation} from disk`);
    }

    const indexHtml = indexHtmlBuffer.toString();
    const jsdom = new JSDOM(indexHtml, {
      contentType: 'text/html'
    });
    const document = jsdom.window.document;

    let scriptEl =
      document.querySelector('script[src="https://connect-cdn.atl-paas.net/all.js"]') ||
      document.querySelector('script[src="https://connect-cdn.atl-paas.net/all-debug.js"]');

    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.setAttribute('src', 'https://connect-cdn.atl-paas.net/all-debug.js');
      scriptEl.setAttribute('data-options', 'sizeToParent:true');
      document.head.appendChild(scriptEl);
    }

    tree.overwrite(indexLocation, jsdom.serialize());
    return tree;
  };
}

function addPackageJsonDependencies(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    return pairs(DEPENDENCIES).pipe(
      concatMap(([key, obj]) => pairs<string>(obj)),
      map(([name, version]) => {
        const dependency: NodeDependency = {
          type: NodeDependencyType.Dev,
          name,
          version,
          overwrite: false
        };
        addPackageJsonDependency(tree, dependency);
        context.logger.info(`Added dependency ${name} => ${version}`);
        return tree;
      })
    );
  };
}

function addImportsToAppModule(options: NgAceOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const workspace = getWorkspace(tree);
    const project = getProjectFromWorkspace(workspace, options.project);

    addModuleImportToRootModule(tree, 'AcNgModule.forRoot()', 'ac-ng', project);
    context.logger.info('Imported AcNgModule into root');
    addModuleImportToRootModule(tree, 'HttpClientModule', '@angular/common/http', project);
    context.logger.info('Imported HttpClientModule into root module');

    return tree;
  };
}
