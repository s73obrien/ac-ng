# Ac-Ng
## Atlassian Connect Express (ACE) Angular Style
This library for Angular 7.x is designed to connect your Angular application to your JIRA instance out-of-the-box.  Under the hood, it splices the [atlassian-connect-express](https://bitbucket.org/atlassian/atlassian-connect-express/src/master/) library into your webpack-dev-server so developmental deployment is as simple as running ```ng serve``` after setting up your ```credentials.json``` file.  It also automatically inserts the [Atlassian Javascript API](https://developer.atlassian.com/cloud/jira/platform/about-the-javascript-api/) so your app can make cross-domain calls from inside its iframe.  On top of all that, this library provides a type-safe automatically-generated API service through which your app can make all necessary calls to the JIRA instance.

### Quickstart
Install prerequisites:
```
npm i jsdom @angular/cdk
```

On a fresh (or existing) Angular app, run
```
ng add ac-ng
```
Along with modifying your app's main module, index.html, and package.json files, this will copy several files into your project's root directory: ```webpack.config.js```, ```config.js```, ```credentials.json```, and ```atlassian-connect.json```.

The only file you need to edit right off-the-bat is ```credentials.json```
#### credentials.json
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
