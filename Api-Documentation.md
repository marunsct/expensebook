Here is the updated API documentation reflecting the changes made to the API:

---

# **API Documentation**

## **Overview**

This document provides an overview of the API endpoints available for the mobile application. It includes details on request and response formats, authentication, and error handling.

---

## **Base URL**

The base URL for the API is:

```
http://localhost:3000
```

---

## **Endpoints**

### **1. User Authentication**

#### **POST /register**

- **Description**: Registers a new user.
- **Request Body**:
  - `first_name`: string (required)
  - `last_name`: string (required)
  - `username`: string (required)
  - `email`: string (optional)
  - `phone`: string (optional)
  - `password`: string (required)

- **Response**:
  - **201 Created**:
    ```json
    {
      "userId": "number"
    }
    ```
  - **400 Bad Request**:
    ```json
    {
      "error": "Email or phone number is required."
    }
    ```
  - **409 Conflict**:
    ```json
    {
      "error": "User already exists with the provided email or phone number."
    }
    ```

#### **POST /login**

- **Description**: Authenticates a user and returns a token.
- **Request Body**:
  - `email`: string (optional)
  - `phone`: string (optional)
  - `password`: string (required)

- **Response**:
  - **200 OK**:
    ```json
    {
      "message": "Login successful.",
      "token": "string",
      "user": {
        "id": "number",
        "first_name": "string",
        "last_name": "string",
        "username": "string",
        "email": "string",
        "phone": "string",
        "gender": "string",
        "date_of_birth": "string",
        "country": "string",
        "profile_picture": "string",
        "created_at": "string"
      }
    }
    ```
  - **401 Unauthorized**:
    ```json
    {
      "error": "Invalid credentials."
    }
    ```

---

### **2. Group Management**

#### **POST /groups**

- **Description**: Creates a new group.
- **Headers**:
  - `Authorization`: Bearer token (required)
- **Request Body**:
  - `name`: string (required)
  - `currency`: string (required)
  - `created_by`: number (required)

- **Response**:
  - **201 Created**:
    ```json
    {
      "id": "number",
      "name": "string",
      "currency": "string",
      "created_by": "number"
    }
    ```
  - **500 Internal Server Error**:
    ```json
    {
      "error": "Error creating group."
    }
    ```

#### **POST /groups/:groupId/users**

- **Description**: Adds a user to a group.
- **Headers**:
  - `Authorization`: Bearer token (required)
- **Request Body**:
  - `userId`: number (required)
  - `created_by`: number (required)

- **Response**:
  - **201 Created**:
    ```json
    {
      "message": "User successfully added to the group."
    }
    ```
  - **400 Bad Request**:
    ```json
    {
      "error": "Group ID or User ID is missing."
    }
    ```

#### **DELETE /groups/:groupId/users/:userId**

- **Description**: Deletes a user from a group after checking for open expenses.
- **Headers**:
  - `Authorization`: Bearer token (required)

- **Response**:
  - **200 OK**:
    ```json
    {
      "message": "User successfully deleted from the group."
    }
    ```
  - **400 Bad Request**:
    ```json
    {
      "error": "The user has open expenses in the group and cannot be removed."
    }
    ```

---

### **3. Expense Management**

#### **POST /expenses**

- **Description**: Creates a new expense.
- **Headers**:
  - `Authorization`: Bearer token (required)
- **Request Body**:
  - `description`: string (required)
  - `currency`: string (required)
  - `amount`: number (required)
  - `group_id`: number (optional)
  - `split_method`: string (required)
  - `contributors`: array of objects (required)
    - `userId`: number
    - `amount`: number
  - `splits`: array of objects (required)
    - `userId`: number
    - `amountToRepay`: number
  - `image`: string (optional)
  - `created_by`: number (required)

- **Response**:
  - **201 Created**:
    ```json
    {
      "id": "number",
      "description": "string",
      "currency": "string",
      "amount": "number",
      "groupId": "number",
      "splitMethod": "string",
      "image": "string",
      "createdBy": "number",
      "splits": [
        {
          "userId": "number",
          "paidToUser": "number",
          "share": "number"
        }
      ]
    }
    ```
  - **400 Bad Request**:
    ```json
    {
      "error": "Missing required fields for creating the expense."
    }
    ```

#### **GET /expenses**

- **Description**: Retrieves all expenses.
- **Headers**:
  - `Authorization`: Bearer token (required)

- **Response**:
  - **200 OK**:
    ```json
    [
      {
        "id": "number",
        "description": "string",
        "currency": "string",
        "amount": "number",
        "groupId": "number",
        "splitMethod": "string",
        "paidByUser": "number",
        "image": "string",
        "createdBy": "number",
        "createdAt": "string",
        "splits": [
          {
            "userId": "number",
            "paidToUser": "number",
            "share": "number"
          }
        ]
      }
    ]
    ```

#### **POST /expenses/settle-up**

- **Description**: Settles up all expenses between two users.
- **Headers**:
  - `Authorization`: Bearer token (required)
- **Request Body**:
  - `userId`: number (required)
  - `otherUserId`: number (required)

- **Response**:
  - **200 OK**:
    ```json
    {
      "message": "Expenses settled successfully."
    }
    ```
  - **500 Internal Server Error**:
    ```json
    {
      "error": "Error settling up expenses."
    }
    ```

---

### **4. Group Images**

#### **POST /groups/:groupId/images**

- **Description**: Uploads an image for a group.
- **Headers**:
  - `Authorization`: Bearer token (required)
- **Request Body**:
  - `image_url`: string (required)

- **Response**:
  - **201 Created**:
    ```json
    {
      "groupId": "number",
      "image_url": "string"
    }
    ```

#### **GET /groups/:groupId/images**

- **Description**: Retrieves all images for a group.
- **Headers**:
  - `Authorization`: Bearer token (required)

- **Response**:
  - **200 OK**:
    ```json
    [
      {
        "groupId": "number",
        "image_url": "string"
      }
    ]
    ```

---

## **Error Handling**

All error responses will include an `error` field with a description of the issue.

---

## **Conclusion**

This API documentation serves as a guide for developers to understand how to interact with the backend services for the mobile application. For further details, please refer to the specific endpoint documentation above.