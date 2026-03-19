# ips_autobot_svr API

> Version 1.0.0

Admin and user auth, logs, recharge APIs. Password fields use RSA encryption (GET /api/public-key).


## Path Table

| Method | Path | Description |
| --- | --- | --- |
| GET | [/api/admin](#getapiadmin) | List admins (admin only) |
| POST | [/api/admin](#postapiadmin) | Create admin (admin only) |
| POST | [/api/admin/login](#postapiadminlogin) | Admin login |
| PUT | [/api/admin/password](#putapiadminpassword) | Change current admin password |
| DELETE | [/api/admin/{id}](#deleteapiadminid) | Delete admin (admin only) |
| GET | [/api/logs/admin-login](#getapilogsadmin-login) | List admin login logs (admin only) |
| GET | [/api/logs/user-login](#getapilogsuser-login) | List user login logs (admin only) |
| GET | [/api/public-key](#getapipublic-key) | Get RSA public key for password encryption |
| GET | [/api/recharge](#getapirecharge) | List recharge records (admin sees all, user sees own) |
| POST | [/api/recharge](#postapirecharge) | Create recharge record (admin or user) |
| GET | [/api/users](#getapiusers) | List users (admin only) |
| POST | [/api/users](#postapiusers) | Create user |
| POST | [/api/users/login](#postapiuserslogin) | User login (by phone or username) |
| PUT | [/api/users/password](#putapiuserspassword) | Change password (no old password required; user self or admin for another user) |
| PUT | [/api/users/{id}/disable](#putapiusersiddisable) | Disable user (admin only) |

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

- 200 Admin list

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
  passwordEncrypted: string
  phone?: string
}
```

#### Responses

- 201 Admin created

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

- 200 Login success, returns JWT and admin info

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
  // 0=normal 1=paid
  member_type?: enum[0, 1]
}
```

#### Responses

- 201 User created

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

- 200 Login success, returns JWT and user info

- 400 Phone or username and password required

- 401 Invalid credentials

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

### [PUT]/api/users/{id}/disable

- Summary  
Disable user (admin only)

- Security  
bearerAuth  

#### Responses

- 200 User disabled

- 404 User not found

## References

### #/components/securitySchemes/bearerAuth

```typescript
http
```