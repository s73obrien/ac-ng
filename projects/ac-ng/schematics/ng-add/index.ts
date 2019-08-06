import {
  Rule,
  SchematicContext,
  Tree,
  SchematicsException,
  apply,
  url,
  chain,
  mergeWith,
  template,
  forEach
} from '@angular-devkit/schematics';

import {
  addModuleImportToRootModule,
  getProjectFromWorkspace,
  getProjectStyleFile,
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
import { Schema as AcNgOptions } from './schema';
import { DEPENDENCIES } from './dependencies';
import { pairs } from 'rxjs';
import { map, concatMap } from 'rxjs/operators';
import { JSDOM } from 'jsdom';
import { red, italic } from '@angular-devkit/core/src/terminal';

export function ngAdd(options: AcNgOptions): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    return chain([
      changeBuilders(options),
      modifyIndexHtml(options),
      addPackageJsonDependencies(),
      copyTemplateFiles(options),
      addImportsToAppModule(options),
      addStylesToProject(options),
      installDependencies(),
    ]);
  };
}

function changeBuilders(options: AcNgOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
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

    if (!serve) {
      throw new SchematicsException('Could not find serve command options');
    }

    serve.builder = '@angular-builders/custom-webpack:dev-server';
    serve.options = {
      ...serve.options,
      browserTarget: `${options.project}:build`
    };

    tree.overwrite('/angular.json', JSON.stringify(workspace, undefined, 2));

    return tree;
  };
}

function addStylesToProject(options: AcNgOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const workspace = getWorkspace(tree);
    const project = getProjectFromWorkspace(workspace, options.project);
    const styleFilePath = getProjectStyleFile(project);

    if (!styleFilePath) {
      context.logger.warn(red(`Could not find the default style file for the project.`));
      context.logger.warn(red(`The AtlasKit css bundles (css-reset and reduced-ui-pack) will not be included.`));
      return;
    }

    const buffer = tree.read(styleFilePath);
    if (!buffer) {
      context.logger.warn(red(`Could read the default style file for the project ${italic(styleFilePath)}`));
      context.logger.warn(red(`The AtlasKit css bundles will not be included.`));
      return;
    }

    const content = buffer.toString();
    const linesToInsert = `\n@import '~@atlaskit/css-reset/dist/bundle.css';\n` +
    `@import '~@atlaskit/reduced-ui-pack/dist/bundle.css';`;

    if (!content.includes(linesToInsert)) {
      const recorder = tree.beginUpdate(styleFilePath);
      recorder.insertLeft(content.length, linesToInsert);
      tree.commitUpdate(recorder);
    }

    return tree;
  };
}

function copyTemplateFiles(options: AcNgOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    function skipIfExists(): Rule {
      return forEach(entry => {
        if (tree.exists(entry.path)) {
          context.logger.info(`${entry.path} already exists. Skipping.`);
          return null;
        } else {
          return entry;
        }
      });
    }

    const templateSource = apply(
      url('./files'),
      [
        template({
          ...strings,
          ...options
        }),
        skipIfExists()
      ]
    );

    return mergeWith(templateSource);
  };
}

function installDependencies(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    context.addTask(new NodePackageInstallTask());
    return tree;
  };
}

function modifyIndexHtml(options: AcNgOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const workspace = getWorkspace(tree);
    const project = getProjectFromWorkspace(workspace, options.project);
    if (!project.architect) {
      throw new SchematicsException('No architect entry found');
    }

    if (project.projectType !== 'application') {
      throw new SchematicsException('ac-ng is intended only for use with applications');
    }

    // tslint:disable-next-line: no-string-literal
    const build = project.architect['build'];
    if (!build.options.index) {
      throw new SchematicsException('Could not find index.html entry in angular.json');
    }

    const indexHtmlBuffer = tree.read(build.options.index);
    if (!indexHtmlBuffer) {
      throw new SchematicsException(`Could not load ${build.options.index} from disk`);
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

    tree.overwrite(build.options.index, jsdom.serialize());
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

function addImportsToAppModule(options: AcNgOptions): Rule {
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
