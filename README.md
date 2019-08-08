Ac-Ng
-----

### Atlassian Connect Express (ACE) Angular Style
**Features**
- Connects your Angular application to your JIRA instance out-of-the-box
- Seamlessly integrates with ```ng serve``` for a familiar development experience
- All of the benefits of [ACE](https://bitbucket.org/atlassian/atlassian-connect-express/src/master/), including automatic insertion of the [Atlassian Javascript API](https://developer.atlassian.com/cloud/jira/platform/about-the-javascript-api/) into your app's index.html
- Type-safe automatically-generated API service included for easy integration into your app

## Quickstart
Install prerequisites:
```
npm i jsdom @angular/cdk
```

On a fresh (or existing) Angular app, run
```
ng add ac-ng
```
Along with modifying your app's main module, index.html, and package.json files, this will copy several files into your project's root directory: `webpack.config.js`, `config.js`, `credentials.json`, and `atlassian-connect.json`.

The only file you need to edit right off-the-bat is `credentials.json`
credentials.json:
```json
{
  "hosts": {
    "your-instance-name.atlassian.net": {
      "product": "jira",
      "username": "Your username",
      "password": "Your API Token from https://id.atlassian.com/manage/api-tokens"
    }
  }
}
```
If you haven't already, go to https://id.atlassian.com/manage/api-tokens and register yourself a new API token, copy it and paste it into the `password` field.  You will also need to put the email address you use to access your Atlassian site in `username`.  Directly under `hosts`, change `your-instance-name.atlassian.net` to match the hostname of your instance.  Save this file.

Go to your instance's 'Manage Apps' page, click on the 'Settings' link directly underneath the 'User Installed Apps' table and enable 'Development Mode'.

Start your Angular dev server in the normal way
```
ng serve
```
And watch for the line that states that your plugin was registered successfully.

Now, if you go to your instance's home page, you should see your shiny new plugin link right above the 'Jira Settings' link!

Click on it and you should see your app!

## Integration With Your App

ac-ng includes api services that expose the [Jira Cloud platform REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v2/) to your application.

### Example
app.component.ts:
```typescript
import { Component } from '@angular/core';
import { ProjectsService } from 'ac-ng';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  projectNames = this.projectsService
  .searchProjects()
  .pipe(
    map(({values}) => {
      return values.map(project => project.name);
    })
  );

  constructor(public projectsService: ProjectsService) {}
}
```
app.component.html:
```html
<div ngFor='let name of projectNames | async'>
  {{{name}}}
</div>
```
