# Toolmin Planning

Techstack:

- go1.23 or later
- embedded tcl for scripting
- web server
  - huma rest framework with go's httpmux
  - static web pages in web/
  - htmx loading templates in
  - setup an spa server that basically rewrites paths like /settings to load in the templates/settigns.html
- sqlite3 for persistence
  - sqlc for queries 
  - goose for migrations
  - store control panel pages in database
  - store tcl scripts in database
  - secrets will be stored with column level encryption crypt/aes 256, AES-GCM
    - keys will be derived with Argon2
- basic "httpasswd" like session auth wiht remote_user
  
## Theory of Operation

A user will login, create a control panel page and add tools. Tools are written in TCL, saved
to the database.

## Milestones

### Initial Setup

Initial setup is a web server that can serve pages.  We'll start with a tool listing pages
that will list the scripts stored in the database, and a page to create or edit them. 
The editing page will have a text area, and a way to test the script. This page should let them define variables to be passed in to the tcl script and to execute it. 

- cmd/main.go will be the entry point
- pkg/server will run the web server
- database/ contains the sqlc schema and queries
- pkg/appdb will contain the generated schema


### Tables


A user can run scripts, but not edit them
Admin can do anything
On startup, if there is no pre-existing users, we should create one with admin:admin

users:
    - id
    - username
    - email
    - password (hashed)
    - role: enum[admin, user]
    - created 
    - updated
    - lastlogin
  
Some scripts can be made publicly available
Most can be ran by any logged in user (default)
Some can only be ran by admin

only admin can create scripts
scripts:
    - id
    - created
    - updated
    - name (unique)
    - access leveL: public, user, admin (default: user)
    - content
  
only admin can create and set vars
vars:
    - id
    - created
    - updated
    - key
    - value

secrets:
    - id
    - created
    - updated
    - key
    - value

For secrets, we will want to encrypt (crypt/aes) the on insert and extract
Only admin can modify secrets


### Web and API

Some files have been copied over from another project. The existing server.go worked as an entry point in the prior project, but needs refactored. Mainly we want the spa server to work for web pages.

The spaserver should continue as is. If web-content-dir is set, it will use the dynamic content of web/.  But if not, then we'll be using the embed filesystem (ensuring the content ships with the binary).

I would like to have a dynamic route /tools/{name} where the name will match the name of the tcl script in the database. That tcl script will be executed and the output will typically be text or html.

The plan is that somewhere in our web site will be a page with div ids and on load, it will call the scripts. Their default "GET" style output will be html that htmx loads into the div.


