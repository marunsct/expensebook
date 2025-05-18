Based on the provided code information, here's a detailed API documentation for the service in your project:

## **API Documentation**

### **Overview**
This document outlines the API endpoints, request/response formats, and authentication mechanisms for the ExpenseBook backend service, which is a Node.js Express application designed to manage personal and group expenses.

### **Base URL**
`http://localhost:3000`

### **Authentication**
- **API Key**: Required for all protected routes. Include in the `x-api-key` header.
- **JWT Token**: Required for routes that need user authentication. Include in the `Authorization` header as `Bearer <token>`.

### **Endpoints**

#### **1. User Authentication**

- **POST /register**
  - **Description**: Register a new user.
  - **Request Body**:
    ```json
    {
      "first_name": "John",
      "last_name": "Doe",
      "username": "johndoe",
      "email": "john.doe@example.com",
      "phone": "1234567890",
      "password": "password123"
    }
    ```
  - **Response**:
    ```json
    {
      "userId": 1
    }
    ```

- **POST /login**
  - **Description**: Login an existing user.
  - **Request Body**:
    ```json
    {
      "email": "john.doe@example.com",
      "password": "password123"
    }
    ```
  - **Response**:
    ```json
    {
      "message": "Login successful.",
      "token": "jwt_token_here",
      "user": {
        "id": 1,
        "first_name": "John",
        "last_name": "Doe",
        "username": "johndoe",
        "email": "john.doe@example.com",
        "phone": "1234567890",
        ...
      }
    }
    ```

#### **2. Group Management**

- **POST /groups**
  - **Description**: Create a new group.
  - **Request Body**:
    ```json
    {
      "name": "Friends Group",
      "currency": "USD",
      "created_by": 1
    }
    ```
  - **Response**:
    ```json
    {
      "id": 1,
      "name": "Friends Group",
      "currency": "USD",
      "created_by": 1
    }
    ```

- **POST /groups/:groupId/users**
  - **Description**: Add a user to a group.
  - **Request Body**:
    ```json
    {
      "userId": 2,
      "created_by": 1
    }
    ```
  - **Response**:
    ```json
    {
      "message": "User successfully added to the group."
    }
    ```

- **DELETE /groups/:groupId/users/:userId**
  - **Description**: Remove a user from a group.
  - **Response**:
    ```json
    {
      "message": "User successfully deleted from the group."
    }
    ```

#### **3. Expense Management**

- **POST /expenses**
  - **Description**: Create a new expense.
  - **Request Body**:
    ```json
    {
      "description": "Dinner",
      "currency": "USD",
      "amount": 100,
      "group_id": 1,
      "split_method": "equal",
      "contributors": [1, 2],
      "created_by": 1,
      "splits": [
        {"userId": 1, "amountToRepay": 50},
        {"userId": 2, "amountToRepay": 50}
      ]
    }
    ```
  - **Response**:
    ```json
    {
      "id": 1,
      "description": "Dinner",
      "currency": "USD",
      "amount": 100,
      "group_id": 1,
      "split_method": "equal",
      "created_by": 1,
      ...
    }
    ```

- **GET /expenses**
  - **Description**: Get all expenses.
  - **Response**:
    ```json
    [
      {
        "id": 1,
        "description": "Dinner",
        ...
      },
      ...
    ]
    ```

- **POST /expenses/settle-up**
  - **Description**: Settle up expenses between two users.
  - **Request Body**:
    ```json
    {
      "userId": 1,
      "otherUserId": 2
    }
    ```
  - **Response**:
    ```json
    {
      "message": "Expenses settled successfully."
    }
    ```

### **Error Handling**
The service uses standard HTTP status codes to indicate the success or failure of API requests. Common status codes include:
- `200 OK`: The request was successful.
- `201 Created**: A new resource was successfully created.
- `400 Bad Request**: The request was invalid or missing data.
- `401 Unauthorized**: Authentication is required and has failed or has not been provided.
- `403 Forbidden**: The request was valid, but the server is refusing action.
- `404 Not Found**: The requested resource could not be found.
- `500 Internal Server Error**: A generic error message, given when an unexpected condition was encountered.

### **Conclusion**
This API documentation provides a comprehensive overview of the endpoints available in the ExpenseBook backend service. Developers can use this document to understand how to interact with the service and integrate it into their applications.