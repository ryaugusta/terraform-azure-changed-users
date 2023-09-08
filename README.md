# Terraform Azure Changes
This action will run a terraform plan and output the changes to be digestable and added to a pull request comment.
The current states supports `azuread_group` integration, and will lookup what groups were added, removed, or changed, as well as what users were added, removed, or changed from the provided azuread groups.



## Inputs
It is recommended you use this action along with the [azure/login](https://github.com/Azure/login) action, as it requires you to set the `ARM` environment variables: (`ARM_CLIENT_ID`, `ARM_TENANT_ID`, `ARM_CLIENT_SECRET`).  If you do not provide these variables, you will need to provide them as inputs to this action.

*Note:* The only required input is `group_names`. All other inputs are optional and will be pulled from the environment variables if not provided as long as you have the `ARM` environment variables set. 
| Name      | Description | Required|
| :----------     | :----   | :----:
| `client-id`     | ClientId of the Azure Service principal created.| _no_ |
| `tenant-id`| TenantId of the Azure Service principal created.  | _no_ |
| `client-secret`| ClientSecret of the Azure Service principal created. | *no*
| `group_names` | List of `azuread_group` names, multi-line. | *yes*

## Outputs
| Name      | Description  | 
| :-------- | :----------  |
| `changes` | List of changes to be added to a pull request comment. |
| `tfplan` | Terraform plan output. |

## Example usage
```yaml

on: 
  pull_request:
    types: 
      ...
 
 ...
  - name: Prep plan for comment
    id: get_changes
    uses: ryaugusta/terraform-azure-changed-users@v1
    with: 
      group-names: |
        github_engineers
        github_owners

  - name: Create PR comment
    uses: peter-evans/create-or-update-comment@v3
    with:
    issue-number: ${{ github.event.number }}
    body: |
        ```diff
        ${{ steps.get_changes.outputs.tfplan }}
        ```
        
        ```diff
        ${{ steps.get_changes.outputs.changes }}
        ```
    reactions: 'rocket' 
```

### License
[MIT](https://github.com/ryaugusta/pr-add-reviewers-action/blob/main/LICENSE)



