const { get } = require('follow-redirects').https;
const HttpsProxyAgent = require('https-proxy-agent');
const { createWriteStream, readFileSync, writeFileSync } = require('fs');
const { parse } = require('url');
const { fork } = require('child_process');
const { resolve } = require('path');
const tmp = require('tmp');

tmp.file({}, (err, path, fd) => {
  const file = createWriteStream('', { fd });
  const request = get({
    ...parse('https://developer.atlassian.com/cloud/jira/platform/swagger.v3.json'),
    agent: new HttpsProxyAgent(process.env.http_proxy)
  }, r => {
    r.pipe(file);
    console.log(path);
    file.on('finish', () => {
      file.close();
      trimIds(path);
      fork('node_modules/@openapitools/openapi-generator-cli/bin/openapi-generator', [
        'generate',
        '--skip-validate-spec',
        '--remove-operation-id-prefix',
        '--model-name-suffix',
        'Model',
        '-i',
        `"${path}"`,
        '-o',
        `"${resolve(__dirname, 'projects/ng-ace/src/api')}"`,
        '-g',
        'typescript-angular'
      ]);
    });
  });
});

function trimIds(path) {
  o = JSON.parse(readFileSync(path));
  o.servers[0].url = 'http://dummyserver.ng-ace';
  Object.keys(o.paths).forEach(p => {
    Object.keys(o.paths[p]).forEach(method => {
      if (o.paths[p][method]['x-atlassian-connect-scope'] == 'INACCESSIBLE') {
        console.log(`${method} for ${p} is inaccessible.  Skipping...`);
        delete o.paths[p][method];
      } else {
        const id = o.paths[p][method].operationId;
        const e = id.split('.').slice(-1)[0];
        const newId = e.split('_')[0];
        console.log(`Rewriting ${id} to ${newId}`);
        o.paths[p][method].operationId = newId;
      }
    })
  })

  writeFileSync(path, JSON.stringify(o));
}
