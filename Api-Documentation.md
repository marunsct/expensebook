# API Documentation

## Overview

This document provides an overview of the API endpoints available for the mobile application. It includes details on request and response formats, authentication, and error handling.

## Base URL

The base URL for the API is:

```
https://api.example.com/v1
```

## Endpoints

### 1. User Authentication

#### POST /auth/login

- **Description**: Authenticates a user and returns a token.
- **Request Body**:
  - `email`: string (required)
  - `password`: string (required)

- **Response**:
  - **200 OK**:
    ```json
    {
      "token": "string",
      "user": {
        "id": "string",
        "name": "string",
        "email": "string"
      }
    }
    ```
  - **401 Unauthorized**:
    ```json
    {
      "error": "Invalid credentials"
    }
    ```

### 2. Fetch User Profile

#### GET /user/profile

- **Description**: Retrieves the authenticated user's profile information.
- **Headers**:
  - `Authorization`: Bearer token (required)

- **Response**:
  - **200 OK**:
    ```json
    {
      "id": "string",
      "name": "string",
      "email": "string"
    }
    ```
  - **401 Unauthorized**:
    ```json
    {
      "error": "Unauthorized"
    }
    ```

### 3. Update User Profile

#### PUT /user/profile

- **Description**: Updates the authenticated user's profile information.
- **Headers**:
  - `Authorization`: Bearer token (required)
- **Request Body**:
  - `name`: string (optional)
  - `email`: string (optional)

- **Response**:
  - **200 OK**:
    ```json
    {
      "message": "Profile updated successfully"
    }
    ```
  - **400 Bad Request**:
    ```json
    {
      "error": "Invalid input"
    }
    ```

## Error Handling

All error responses will include an `error` field with a description of the issue.

## Conclusion

This API documentation serves as a guide for developers to understand how to interact with the backend services for the mobile application. For further details, please refer to the specific endpoint documentation above.