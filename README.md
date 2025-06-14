# ntfy action

Version of [https://github.com/NiNiyas/ntfy-action](https://github.com/NiNiyas/ntfy-action) that fixes some issues

Send GitHub/Gitea action notifications to [ntfy.sh](https://ntfy.sh) or custom url.

This is currently only available for `push`, `release`, `schedule`, `workflow`, `repository_dispatch` and `workflow_dispatch` events.

## Inputs

```yaml
url:
  description: "Server URL."
  required: true
  default: "https://ntfy.sh"
topic:
  description: "NTFY topic."
  required: true
  default: "ntfy_action"
tags:
  description: "Tags for the message seperated by commas."
  required: false
  default: ""
title:
  description: "NTFY message title."
  required: false
  default: "GitHub Action"
basic_auth:
  description: "Authentication using basic method, should just be the secret value."
  required: false
  default: ""
token_auth:
  description: "Authentication using token method, should just be the secret value."
  required: false
  default: ""
details:
  description: "Additional text after the notification message."
  required: false
  default: ""
priority:
  description: "Message priority."
  required: false
  default: 0
server_type:
  description: "Type of server the actions is used on, values: github or gitea."
  required: false
  default: "github"
debug:
  description: "Prints debug information for dev/troubleshooting."
  required: false
  default: false
simple_message:
  description: "Reduces the message size in the notification and removes any action buttons."
  required: false
  default: false
```

**Note**: If you are using CloudFlare infront of your ntfy server, you should turn off `Bot Fight Mode` in `Security->Bots`. Otherwise you probably will get 503 status.

## Example Usage

```yaml
- name: ntfy-notifications
  uses: floppyman/ntfy_action@main
  with:
    url: 'https://ntfy.sh' or ${{ secrets.NTFY_URL }}
    topic: 'test' or ${{ secrets.NTFY_TOPIC }}
```

### Send with headers

```yaml
- name: ntfy-notifications
  uses: floppyman/ntfy_action@main
  with:
    url: 'https://ntfy.sh' or ${{ secrets.NTFY_URL }}
    topic: 'test' or ${{ secrets.NTFY_TOPIC }}
    basic_auth: "123456" or ${{ secrets.NTFY_BASIC_AUTH }}
```

### Send with tags, priority and details

#### Success

```yaml
- name: ntfy-success-notifications
  uses: floppyman/ntfy_action@main
  if: success()
  with:
    url: 'https://ntfy.sh' or ${{ secrets.NTFY_URL }}
    topic: 'test' or ${{ secrets.NTFY_TOPIC }}
    priority: 4
    basic_auth: "123456" or ${{ secrets.NTFY_BASIC_AUTH }}
    tags: +1,partying_face,action,successfully,completed
    details: Workflow has been successfully completed!
```

#### Failed

```yaml
- name: ntfy-failed-notifications
  uses: floppyman/ntfy_action@main
  if: failure()
  with:
    url: 'https://ntfy.sh' or ${{ secrets.NTFY_URL }}
    topic: 'test' or ${{ secrets.NTFY_TOPIC }}
    priority: 5
    basic_auth: "123456" or ${{ secrets.NTFY_BASIC_AUTH }}
    tags: +1,partying_face,action,failed
    details: Workflow has failed!
```

#### Cancelled

```yaml
- name: ntfy-cancelled-notifications
  uses: floppyman/ntfy_action@main
  if: cancelled()
  with:
    url: 'https://ntfy.sh' or ${{ secrets.NTFY_URL }}
    topic: 'test' or ${{ secrets.NTFY_TOPIC }}
    priority: 3
    basic_auth: "123456" or ${{ secrets.NTFY_BASIC_AUTH }}
    tags: +1,partying_face,action,cancelled
    details: Workflow has been cancelled!
```
