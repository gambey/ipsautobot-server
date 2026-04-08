# ips_autobot_svr API

> Version 1.0.0

Admin and user auth, logs, recharge APIs. Multi-app zhiling/yifei — pass app where required. Password fields use RSA encryption (GET /api/public-key).


## Path Table

| Method | Path | Description |
| --- | --- | --- |
| GET | [/api/admin](#getapiadmin) | List admins (admin only) |
| POST | [/api/admin](#postapiadmin) | Create admin (admin only) |
| POST | [/api/admin/login](#postapiadminlogin) | Admin login |
| PUT | [/api/admin/password](#putapiadminpassword) | Change current admin password |
| DELETE | [/api/admin/{id}](#deleteapiadminid) | Delete admin (admin only) |
| GET | [/api/client-settings-yifei.zip](#getapiclient-settings-yifeizip) | Download yifei client settings archive |
| GET | [/api/client-settings.zip](#getapiclient-settingszip) | Download bundled client settings archive |
| GET | [/api/logs/admin-login](#getapilogsadmin-login) | List admin login logs (admin only) |
| GET | [/api/logs/user-login](#getapilogsuser-login) | List user login logs (admin only) |
| GET | [/api/public-key](#getapipublic-key) | Get RSA public key for password encryption |
| GET | [/api/recharge](#getapirecharge) | List recharge records (admin sees all, user sees own) |
| POST | [/api/recharge](#postapirecharge) | Create recharge record (admin or user) |
| POST | [/api/score/change](#postapiscorechange) | Increase or deduct user score (admin only) |
| GET | [/api/score/records](#getapiscorerecords) | List score records (admin sees all, user sees own) |
| GET | [/api/users](#getapiusers) | List users (admin only) |
| POST | [/api/users](#postapiusers) | Create user |
| POST | [/api/users/login](#postapiuserslogin) | User login (by phone or username) |
| GET | [/api/users/mac](#getapiusersmac) | Get bound MAC for current user or admin-specified user |
| PUT | [/api/users/mac](#putapiusersmac) | Bind or update MAC (globally unique) |
| POST | [/api/users/mac/verify](#postapiusersmacverify) | Verify MAC matches bound value (user JWT only) |
| GET | [/api/users/me](#getapiusersme) | Get current user profile |
| PUT | [/api/users/password](#putapiuserspassword) | Change password (no old password required; user self or admin for another user) |
| PUT | [/api/users/{id}](#putapiusersid) | Update user profile fields (admin only; normal admin has limited fields) |
| PUT | [/api/users/{id}/disable](#putapiusersiddisable) | Disable user (admin only) |
| DELETE | [/api/users/{id}/mac](#deleteapiusersidmac) | Unbind user MAC (super admin only) |

## Reference Table

| Name | Path | Description |
| --- | --- | --- |
| bearerAuth | [#/components/securitySchemes/bearerAuth](#componentssecurityschemesbearerauth) |  |

## Path Details

***

### [GET]/api/admin

- Summary  
List admins (admin only)

- Security  
bearerAuth  

#### Parameters(Query)

```typescript
page?: integer //default: 1
```

```typescript
limit?: integer //default: 20
```

```typescript
username?: string
```

#### Responses

- 200 Admin list (super admin only)

***

### [POST]/api/admin

- Summary  
Create admin (admin only)

- Security  
bearerAuth  

#### RequestBody

- application/json

```typescript
{
  username: string
  // 0=super admin, 1=normal admin
  admin_type?: enum[0, 1]
  passwordEncrypted: string
  phone?: string
}
```

#### Responses

- 201 Admin created (super admin only)

- 401 Unauthorized

***

### [POST]/api/admin/login

- Summary  
Admin login

#### RequestBody

- application/json

```typescript
{
  username: string
  // RSA encrypted password
  passwordEncrypted: string
}
```

#### Responses

- 200 Login success, returns JWT and admin info (includes admin_type)

- 401 Invalid credentials

***

### [PUT]/api/admin/password

- Summary  
Change current admin password

- Security  
bearerAuth  

#### RequestBody

- application/json

```typescript
{
  oldPasswordEncrypted: string
  newPasswordEncrypted: string
}
```

#### Responses

- 200 Password updated

- 401 Invalid old password

***

### [DELETE]/api/admin/{id}

- Summary  
Delete admin (admin only)

- Security  
bearerAuth  

#### Responses

- 200 Admin deleted

- 400 Cannot delete self or invalid id

- 404 Admin not found

***

### [GET]/api/client-settings-yifei.zip

- Summary  
Download yifei client settings archive

- Description  
Returns client_settings_yifei.zip from the application root (same folder as package.json). Requires user JWT in Authorization Bearer header; admin tokens are rejected.

- Security  
bearerAuth  

#### Responses

- 200 ZIP file

`application/zip`

```typescript
string
```

- 401 Missing, invalid, or expired token

- 403 User role required (admin JWT not allowed)

- 404 File not present on server

`application/json`

```typescript
{
  message?: string
}
```

***

### [GET]/api/client-settings.zip

- Summary  
Download bundled client settings archive

- Description  
Returns client_settings.zip from the application root (same folder as package.json), not process.cwd(). Requires user JWT in Authorization Bearer header; admin tokens are rejected.

- Security  
bearerAuth  

#### Responses

- 200 ZIP file

`application/zip`

```typescript
string
```

- 401 Missing, invalid, or expired token

- 403 User role required (admin JWT not allowed)

- 404 File not present on server

`application/json`

```typescript
{
  message?: string
}
```

***

### [GET]/api/logs/admin-login

- Summary  
List admin login logs (admin only)

- Security  
bearerAuth  

#### Parameters(Query)

```typescript
page?: integer //default: 1
```

```typescript
limit?: integer //default: 20
```

```typescript
username?: string
```

```typescript
success?: enum[0, 1]
```

#### Responses

- 200 Paginated admin login logs

***

### [GET]/api/logs/user-login

- Summary  
List user login logs (admin only)

- Security  
bearerAuth  

#### Parameters(Query)

```typescript
page?: integer //default: 1
```

```typescript
limit?: integer //default: 20
```

```typescript
phone?: string
```

```typescript
success?: enum[0, 1]
```

#### Responses

- 200 Paginated user login logs

***

### [GET]/api/public-key

- Summary  
Get RSA public key for password encryption

#### Responses

- 200 PEM public key

`text/plain`

```typescript
// PEM format public key
string
```

***

### [GET]/api/recharge

- Summary  
List recharge records (admin sees all, user sees own)

- Security  
bearerAuth  

#### Parameters(Query)

```typescript
app: enum[zhiling, yifei]
```

```typescript
page?: integer //default: 1
```

```typescript
limit?: integer //default: 20
```

```typescript
user_id?: integer
```

```typescript
result?: enum[0, 1]
```

```typescript
start_date?: string
```

```typescript
end_date?: string
```

#### Responses

- 200 Paginated recharge records

***

### [POST]/api/recharge

- Summary  
Create recharge record (admin or user)

- Security  
bearerAuth  

#### RequestBody

- application/json

```typescript
{
  // Client app for recharge table
  app: enum[zhiling, yifei]
  user_id?: integer
  // phone or username
  username?: string
  amount: number
  result?: enum[0, 1] //default: 1
}
```

#### Responses

- 201 Recharge record created

- 404 User not found

***

### [POST]/api/score/change

- Summary  
Increase or deduct user score (admin only)

- Security  
bearerAuth  

#### RequestBody

- application/json

```typescript
{
  // Client app for score columns and score_record
  app: enum[zhiling, yifei]
  // Target user id (or use phone)
  user_id?: integer
  // Target user phone (or use user_id)
  phone?: string
  // Score tier days
  tier_days: enum[30, 90, 180, 365]
  // Optional override amount; defaults to selected tier score from users table for this app
  score_change?: integer
  // 0=add, 1=deduct
  change_type: enum[0, 1]
}
```

#### Responses

- 201 Score changed and record created

- 400 Bad request or insufficient score

- 404 User not found

***

### [GET]/api/score/records

- Summary  
List score records (admin sees all, user sees own)

- Security  
bearerAuth  

#### Parameters(Query)

```typescript
app: enum[zhiling, yifei]
```

```typescript
page?: integer //default: 1
```

```typescript
limit?: integer //default: 20
```

```typescript
user_id?: integer
```

```typescript
username?: string
```

```typescript
phone?: string
```

```typescript
change_type?: enum[0, 1]
```

```typescript
start_date?: string
```

```typescript
end_date?: string
```

#### Responses

- 200 Paginated score records

***

### [GET]/api/users

- Summary  
List users (admin only)

- Security  
bearerAuth  

#### Parameters(Query)

```typescript
page?: integer //default: 1
```

```typescript
limit?: integer //default: 20
```

```typescript
username?: string
```

```typescript
phone?: string
```

```typescript
status?: enum[0, 1]
```

```typescript
created_at_from?: string
```

```typescript
created_at_to?: string
```

```typescript
last_login_from?: string
```

```typescript
last_login_to?: string
```

#### Responses

- 200 User list

`application/json`

```typescript
{
  code?: integer
  data: {
    items: {
      id?: integer
      username?: string
      phone?: string
      status?: integer
      created_at?: string
      last_login_at?: string
      // Per-app zhiling and yifei slices (MAC, score, tiers, member_type, member_expire_at)
      clients: {
        zhiling: {
        }
        yifei: {
        }
      }
    }[]
  }
}
```

***

### [POST]/api/users

- Summary  
Create user

#### RequestBody

- application/json

```typescript
{
  // User display name
  username?: string
  phone: string
  passwordEncrypted: string
  // Initial member_type for zhiling client only; yifei starts as 0
  member_type?: enum[0, 1]
}
```

#### Responses

- 201 User created; response includes clients.zhiling and clients.yifei defaults

- 409 Phone already registered

***

### [POST]/api/users/login

- Summary  
User login (by phone or username)

#### RequestBody

- application/json

```typescript
{
  // Phone number (use either phone or username)
  phone?: string
  // Username (use either phone or username)
  username?: string
  passwordEncrypted: string
}
```

#### Responses

- 200 Login success; user object has shared fields and clients.zhiling / clients.yifei

`application/json`

```typescript
{
  code?: integer
  data: {
    token?: string
    user: {
      id?: integer
      username?: string
      phone?: string
      status?: integer
      created_at?: string
      clients: {
      }
      last_login_at?: string
    }
  }
}
```

- 400 Phone or username and password required

- 401 Invalid credentials

***

### [GET]/api/users/mac

- Summary  
Get bound MAC for current user or admin-specified user

- Security  
bearerAuth  

#### Parameters(Query)

```typescript
app: enum[zhiling, yifei]
```

```typescript
userId?: integer
```

#### Responses

- 200 Current mac_addr for app or null

- 400 Missing userId for admin

***

### [PUT]/api/users/mac

- Summary  
Bind or update MAC (globally unique)

- Security  
bearerAuth  

#### RequestBody

- application/json

```typescript
{
  app: enum[zhiling, yifei]
  mac_addr: string
  // Admin only — target user id
  userId?: integer
}
```

#### Responses

- 200 MAC bound for app

- 400 Invalid MAC or missing userId for admin

- 409 MAC already used by another user

***

### [POST]/api/users/mac/verify

- Summary  
Verify MAC matches bound value (user JWT only)

- Security  
bearerAuth  

#### RequestBody

- application/json

```typescript
{
  app: enum[zhiling, yifei]
  mac_addr: string
}
```

#### Responses

- 200 matched true/false per app; unbound returns matched false

***

### [GET]/api/users/me

- Summary  
Get current user profile

- Security  
bearerAuth  

#### Responses

- 200 Current user profile

- 401 Unauthorized

***

### [PUT]/api/users/password

- Summary  
Change password (no old password required; user self or admin for another user)

- Security  
bearerAuth  

#### RequestBody

- application/json

```typescript
{
  newPasswordEncrypted: string
  // Admin only: target user id
  userId?: integer
}
```

#### Responses

- 200 Password updated

***

### [PUT]/api/users/{id}

- Summary  
Update user profile fields (admin only; normal admin has limited fields)

- Security  
bearerAuth  

#### RequestBody

- application/json

```typescript
{
  username?: string
  phone?: string
  status?: enum[0, 1]
  clients: {
    // Super-admin fields for zhiling; member_expire_at editable by admin
    zhiling: {
      member_type?: enum[0, 1]
      member_expire_at?: string
      member_expire_days?: integer
      member_reduce_days?: integer
      score?: integer
      30d_score?: integer
      90d_score?: integer
      180d_score?: integer
      365d_score?: integer
      mac_addr?: string
    }
    yifei: {
      member_type?: enum[0, 1]
      member_expire_at?: string
      member_expire_days?: integer
      member_reduce_days?: integer
      score?: integer
      30d_score?: integer
      90d_score?: integer
      180d_score?: integer
      365d_score?: integer
      mac_addr?: string
    }
  }
}
```

#### Responses

- 200 User updated; data includes clients

- 403 Admin required

***

### [PUT]/api/users/{id}/disable

- Summary  
Disable user (admin only)

- Security  
bearerAuth  

#### Responses

- 200 User disabled

- 404 User not found

***

### [DELETE]/api/users/{id}/mac

- Summary  
Unbind user MAC (super admin only)

- Security  
bearerAuth  

#### Parameters(Query)

```typescript
app: enum[zhiling, yifei]
```

#### Responses

- 200 MAC cleared for app

`application/json`

```typescript
{
  code?: integer
  data: {
    id?: integer
    mac_addr?: string
  }
}
```

- 403 Super admin required

- 404 User not found

## References

### #/components/securitySchemes/bearerAuth

```typescript
http
```