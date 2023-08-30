require("isomorphic-fetch");
require("colors");
const diff = require('diff');
const { Client } = require("@microsoft/microsoft-graph-client");
const { TokenCredentialAuthenticationProvider } = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");
const { ClientSecretCredential } = require("@azure/identity");
const core = require('@actions/core');
const file = core.getInput('file');

function run() {
  const tenantId = core.getInput('tenant-id', {required: true});
  const clientId = core.getInput('client-id', {required: true});
  const clientSecret = core.getInput('client-secret', {required: true});
  const groups = core.getInput('group-names', {required: true}).split(',');
  
  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  const authProvider = new TokenCredentialAuthenticationProvider(credential, { scopes: ['.default'] });
  const client = Client.initWithMiddleware({
    debugLogging: true,
    authProvider,
  });

  groups.forEach((group_name) => { 
  const before_members = get_changes('before', group_name)
  const after_members = get_changes('after', group_name)
  const data = diff.diffArrays(before_members, after_members);

    data.forEach((part) => {
      const value = part.value.join('\n').replace(/['"]+/g, '');
      if(part.added) {
        client
          .api(`/users/${value}`)
          .select("displayName")
          .get()
          .then((res) => {
            console.log('+ '.green, res.displayName);
            core.setOutput('changes', res.displayName);
          })
          .catch((err) => {
            console.log(err);
          });
      } 
      else if(part.removed) {
        client
          .api(`/users/${value}`)
          .select("displayName")
          .get()
          .then((res) => {
            console.log('- '.red, res.displayName);
            core.setOutput('changes', res.displayName);
          })
          .catch((err) => {
            console.log(err);
          });
        } 
    });
  });
}

function get_changes(changeset, group_name) {
    const plan = require(file)
    return  plan.resource_changes
      .filter((change)=> change.address == `azuread_group.${group_name}`)[0]
      .change[changeset].members
}

run();