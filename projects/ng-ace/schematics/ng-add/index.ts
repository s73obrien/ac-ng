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
import { NodeDependency, NodeDependencyType, addPackageJsonDependency } from '@schematics/angular/utility/dependencies';

import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { experimental, strings } from '@angular-devkit/core';
import { Schema as NgAceOptions } from './schema';
import { DEPENDENCIES } from './dependencies';
import { pairs } from 'rxjs';
import { map, concatMap } from 'rxjs/operators';
import { JSDOM } from 'jsdom';

export function ngAdd(options: NgAceOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
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

    if (project.projectType !== 'application') {
      throw new SchematicsException('ng-ace is intended only for use with applications');
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
      modifyIndexHtml(options.baseHref as string, build.options.index),
      addPackageJsonDependencies(),
      installDependencies(),
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

function modifyIndexHtml(baseHref: string, indexLocation: string): Rule {
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

    // let baseHrefEl = document.head.querySelector('base[href]');
    // if (!baseHrefEl) {
    //   context.logger.info('New base element created');
    //   baseHrefEl = document.createElement('base');
    //   document.head.appendChild(baseHrefEl);
    // }
    // baseHrefEl.setAttribute('href', `${baseHref}`);
    // context.logger.info(`Base href set to ${baseHref} in ${indexLocation}`);

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
