ROLES={
 'admin':{'*'},
 'chief':{'task:create','task:read','task:update','report:read','memory:read','memory:write','agent:read'},
 'intel':{'research:read','research:write','claim:read','claim:write','source:read','source:write','memory:read','memory:write'},
 'security':{'security:read','security:write','agent:read'}
}

def allowed(role,permission):
    return '*' in ROLES.get(role,set()) or permission in ROLES.get(role,set())
