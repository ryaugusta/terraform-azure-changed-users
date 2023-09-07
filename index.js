require("isomorphic-fetch");
const diff = require('diff');
const { Client } = require("@microsoft/microsoft-graph-client");
const { TokenCredentialAuthenticationProvider } = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");
const { ClientSecretCredential } = require("@azure/identity");
const core = require('@actions/core');
const filePath = core.getInput('file-path');
const { execSync }  = require('child_process'); 

async function run() {

  terraform();

  const tenantId = process.env.ARM_TENANT_ID ||  core.getInput('tenant-id');
  const clientId = process.env.ARM_CLIENT_ID || core.getInput('client-id');
  const clientSecret = process.env.ARM_CLIENT_SECRET || core.getInput('client-secret') 
  const groups = core.getInput('group-names').split(',');
  
  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  const authProvider = new TokenCredentialAuthenticationProvider(credential, { scopes: ['.default'] });
  const client = Client.initWithMiddleware({
    debugLogging: true,
    authProvider,
  });

  let groupNames = groups.map((group_name) => {
    const group_id = get_group_id('after', group_name)
    const before_members = get_changes('before', group_name)
    const after_members = get_changes('after', group_name)
    const data = diff.diffArrays(before_members, after_members);

    return client.api(`/groups/${group_id}`)
      .select("displayName")
      .get()
      .then((res) => {
        return {
          group_id: group_id,
          display_name: res.displayName,
          data: data
        }
      }
    );
  });

  let group_data = await Promise.all(groupNames)
  let users = []

  group_data.forEach((group_obj) => {
    group_obj.data.forEach((part)=> {
      const value = part.value.join('\n').replace(/['"]+/g, '');
      if(part.added) {
        users.push(
          client
            .api(`/users/${value}`)
            .select("displayName")
            .get()
            .then((res) => {
              console.log(`+ ${res.displayName} to ${group_obj.display_name}`);
              return `+ ${res.displayName} to ${group_obj.display_name})`
            })
            .catch((err) => {
              console.log(err);
            })
          )
        } 
      else if(part.removed) {
        users.push(
          client
            .api(`/users/${value}`)
            .select("displayName")
            .get()
            .then((res) => {
              console.log(`- ${res.displayName} from ${group_obj.display_name}`);
              return `- ${res.displayName} from ${group_obj.display_name}`
            })
            .catch((err) => {
              console.log(err);
            })
          )
        } 
      })
    });
  let changes = await Promise.all(users)
  core.setOutput('changes', changes.join('\n'));
}
  
function get_changes(changeset, group_name) {
  const plan = require(filePath)
  return  plan.resource_changes
    .filter((change)=> change.address == `azuread_group.${group_name}`)[0]
    .change[changeset].members
}

function get_group_id(changeset, group_name) {
  const plan = require(filePath)
  return plan.resource_changes
    .filter((change => change.address == `azuread_group.${group_name}`))[0]
    .change[changeset].id
}

function terraform() {
  try {
    execSync('terraform show -no-color -json plan.tfplan > plan.json');
    console.log(execSync('terraform show -no-color plan.tfplan').toString());
    core.setOutput('tfplan', execSync('terraform show -no-color plan.tfplan').toString());
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();