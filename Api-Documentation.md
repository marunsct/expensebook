# API Documentation

## Overview

This document provides an overview of all API endpoints for the ExpenseBook application, including request/response formats, authentication, and error handling. All endpoints require authentication unless otherwise specified.

---

## Base URL

```
http://localhost:3000
```

---

## Endpoints

### 1. User Authentication

#### POST /register
- **Description**: Registers a new user.
- **Request Body**:
  ```json
  {
    "first_name": "string",
    "last_name": "string",
    "username": "string",
    "email": "string (optional)",
    "phone": "string (optional)",
    "password": "string"
  }
  ```
- **Response**:
  - **201 Created**:
    ```json
    { "userId": 1 }
    ```
  - **400 Bad Request** / **409 Conflict**:
    ```json
    { "error": "..." }
    ```

#### POST /login
- **Description**: Authenticates a user and returns a token.
- **Request Body**:
  ```json
  {
    "email": "string (optional)",
    "phone": "string (optional)",
    "password": "string"
  }
  ```
- **Response**:
  - **200 OK**:
    ```json
    {
      "message": "Login successful.",
      "token": "string",
      "user": {
        "id": 1,
        "first_name": "John",
        "last_name": "Doe",
        "username": "johndoe",
        "email": "john@example.com",
        "phone": "1234567890",
        "gender": "Male",
        "date_of_birth": "1990-01-01",
        "country": "USA",
        "profile_picture": "http://...",
        "created_at": "2024-05-19T12:00:00.000Z"
      }
    }
    ```
  - **401 Unauthorized**:
    ```json
    { "error": "Invalid credentials." }
    ```

---

### 2. User Management

#### GET /users/:userId/details
- **Description**: Get details for a user.
- **Response**:
  ```json
  {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "phone": "1234567890",
    "gender": "Male",
    "date_of_birth": "1990-01-01",
    "country": "USA",
    "profile_picture": "http://...",
    "created_at": "2024-05-19T12:00:00.000Z",
    "updated_at": "2024-05-19T12:00:00.000Z",
    "updated_by": 1,
    "delete_flag": false,
    "deleted_at": null
  }
  ```

#### PUT /users/:userId
- **Description**: Update user details.
- **Request Body**: Any updatable user fields.
- **Response**: Same as GET /users/:userId/details.

#### DELETE /users/:userId/close-account
- **Description**: Soft delete a user account.
- **Response**:
  ```json
  {
    "id": 1,
    "email": "john@example.com",
    "delete_flag": true,
    "deleted_at": "2024-05-19T12:00:00.000Z",
    "updated_by": 1
  }
  ```

#### GET /users/:userId/all-data
#### GET /users/:userId/all-data-after/:date
- **Description**: Get all data for a user (optionally after a date). Includes deleted/settled expenses/splits, but not for deleted users.
- **Response**:
  ```json
  {
    "userDetails": {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "phone": "1234567890",
      "gender": "Male",
      "date_of_birth": "1990-01-01",
      "country": "USA",
      "profile_picture": "http://...",
      "created_at": "2024-05-19T12:00:00.000Z",
      "updated_at": "2024-05-19T12:00:00.000Z",
      "updated_by": 1,
      "delete_flag": false,
      "deleted_at": null
    },
    "Groups": [
      {
        "id": 1,
        "name": "Trip",
        "currency": "USD",
        "created_by": 1,
        "created_at": "2024-05-19T12:00:00.000Z",
        "updated_by": 1,
        "updated_at": "2024-05-19T12:00:00.000Z",
        "delete_flag": false,
        "deleted_at": null
      }
    ],
    "groupMembers": [
      {
        "group_id": 1,
        "user_id": 1,
        "first_name": "John",
        "last_name": "Doe",
        "username": "johndoe",
        "email": "john@example.com",
        "phone": "1234567890",
        "joined_at": "2024-05-19T12:00:00.000Z",
        "delete_flag": false
      }
    ],
    "expenses": [
      {
        "id": 1,
        "description": "Lunch",
        "currency": "USD",
        "amount": 100.00,
        "group_id": 1,
        "split_method": "equal",
        "paid_by_user": 1,
        "image_url": null,
        "flag": false,
        "created_by": 1,
        "created_at": "2024-05-19T12:00:00.000Z",
        "updated_by": 1,
        "updated_at": "2024-05-19T12:00:00.000Z",
        "delete_flag": false,
        "deleted_at": null
      }
    ],
    "expenseSplits": [
      {
        "id": 1,
        "expense_id": 1,
        "user_id": 1,
        "paid_to_user": 2,
        "share": 50.00,
        "counter": 0,
        "flag": false,
        "created_at": "2024-05-19T12:00:00.000Z",
        "updated_by": 1,
        "updated_at": "2024-05-19T12:00:00.000Z",
        "delete_flag": false,
        "deleted_at": null
      }
    ]
  }
  ```

---

### 3. Group Management

#### POST /groups
- **Description**: Creates a new group.
- **Request Body**:
  ```json
  {
    "name": "string",
    "currency": "string"
  }
  ```
- **Response**:
  ```json
  {
    "id": 1,
    "name": "Trip",
    "currency": "USD",
    "created_by": 1,
    "created_at": "2024-05-19T12:00:00.000Z",
    "updated_by": 1,
    "updated_at": "2024-05-19T12:00:00.000Z",
    "delete_flag": false,
    "deleted_at": null
  }
  ```

#### POST /groups/:groupId/users
- **Description**: Adds a user to a group.
- **Request Body**:
  ```json
  {
    "userId": 2
  }
  ```
- **Response**:
  ```json
  { "message": "User successfully added to the group." }
  ```

#### DELETE /groups/:groupId/users/:userId
- **Description**: Deletes a user from a group after checking for open expenses.
- **Response**:
  ```json
  { "message": "User successfully deleted from the group." }
  ```

---

### 4. Expense Management

#### POST /expenses
- **Description**: Creates a new expense.
- **Request Body**:
  ```json
  {
    "description": "Lunch",
    "currency": "USD",
    "amount": 100.00,
    "group_id": 1,
    "split_method": "equal",
    "contributors": [
      { "userId": 1, "amount": 100.00 }
    ],
    "splits": [
      { "userId": 2, "amount": 50.00, "counter": 0 }
    ],
    "image": null
  }
  ```
- **Response**:
  ```json
  {
    "id": 1,
    "description": "Lunch",
    "currency": "USD",
    "amount": 100.00,
    "group_id": 1,
    "split_method": "equal",
    "image": null,
    "created_by": 1,
    "created_at": "2024-05-19T12:00:00.000Z",
    "updated_by": 1,
    "updated_at": "2024-05-19T12:00:00.000Z",
    "delete_flag": false,
    "deleted_at": null,
    "splits": [
      {
        "id": 1,
        "user_id": 2,
        "paid_to_user": 1,
        "share": 50.00,
        "counter": 0,
        "flag": false,
        "created_at": "2024-05-19T12:00:00.000Z",
        "updated_by": 1,
        "updated_at": "2024-05-19T12:00:00.000Z",
        "delete_flag": false,
        "deleted_at": null
      }
    ]
  }
  ```

#### GET /expenses
- **Description**: Retrieves all expenses.
- **Response**:
  ```json
  [
    {
      "id": 1,
      "description": "Lunch",
      "currency": "USD",
      "amount": 100.00,
      "group_id": 1,
      "split_method": "equal",
      "paid_by_user": 1,
      "image": null,
      "created_by": 1,
      "created_at": "2024-05-19T12:00:00.000Z",
      "updated_by": 1,
      "updated_at": "2024-05-19T12:00:00.000Z",
      "delete_flag": false,
      "deleted_at": null,
      "splits": [
        {
          "user_id": 2,
          "paid_to_user": 1,
          "share": 50.00
        }
      ]
    }
  ]
  ```

#### POST /expenses/settle-up
- **Description**: Settles up all expenses between two users.
- **Request Body**:
  ```json
  {
    "userId": 1,
    "otherUserId": 2
  }
  ```
- **Response**:
  ```json
  { "message": "Expenses settled successfully." }
  ```

---

### 5. Group Images

#### POST /groups/:groupId/images
- **Description**: Uploads an image for a group.
- **Request Body**:
  ```json
  {
    "image_url": "http://..."
  }
  ```
- **Response**:
  ```json
  { "groupId": 1, "image_url": "http://..." }
  ```

#### GET /groups/:groupId/images
- **Description**: Retrieves all images for a group.
- **Response**:
  ```json
  [
    { "groupId": 1, "image_url": "http://..." }
  ]
  ```

---

### 6. API Keys

#### POST /generate-api-key
- **Description**: Generate a new API key.
- **Request Body**:
  ```json
  {
    "consumer_name": "string"
  }
  ```
- **Response**:
  ```json
  { "api_key": "string" }
  ```

#### POST /api-keys/retrieve
- **Description**: Retrieve an API key by consumer name (requires JWT authentication).
- **Request Body**:
  ```json
  {
    "consumer_name": "string"
  }
  ```
- **Response**:
  ```json
  { "api_key": "string" }
  ```

---

## Error Handling

All error responses will include an `error` field with a description of the issue.

---

## Conclusion

This API documentation serves as a guide for developers to understand how to interact with the backend services for the mobile application. For further details, please refer to the specific endpoint documentation above.