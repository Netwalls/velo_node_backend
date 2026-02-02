# Velo Backend Utilities API

This document outlines the API endpoints for the utility services in the Velo backend, including Airtime, Data, and Electricity. All utility routes are prefixed with their respective service names (e.g., `/airtime`) and require authentication via the `authMiddleware`.

---

## Airtime Utility (`/airtime`)

### 1. Purchase Airtime

- **Endpoint:** `POST /purchase`
- **Description:** Processes a new airtime purchase for the authenticated user.
- **Request Body:**
  ```json
  {
    "countryCode": "NG",
    "operatorId": "MTN_NG",
    "amount": 1000,
    "recipientPhone": "08012345678",
    "useVeloBalance": true
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Airtime purchase initiated successfully.",
    "purchase": {
      "purchaseId": "purchase_12345",
      "status": "pending",
      "amount": 1000
    }
  }
  ```
- **Error Response (400 Bad Request):**
  ```json
  {
    "success": false,
    "message": "Invalid operator ID."
  }
  ```
- **Feedback:**
    - **Success:** "Your airtime purchase of 1000 NGN for 08012345678 is being processed."
    - **Error:** "Failed to purchase airtime. Please check the details and try again."

### 2. Get Airtime Purchase History

- **Endpoint:** `GET /history`
- **Description:** Retrieves the airtime purchase history for the authenticated user.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "history": [
      {
        "purchaseId": "purchase_12345",
        "date": "2024-07-29T12:34:56Z",
        "operatorName": "MTN Nigeria",
        "recipientPhone": "08012345678",
        "amount": 1000,
        "status": "completed"
      }
    ]
  }
  ```
- **Feedback:**
    - **Success:** "Your airtime purchase history has been retrieved."
    - **Error:** "Could not retrieve your airtime history at this time."

### 3. Get Supported Airtime Options

- **Endpoint:** `GET /supported-options`
- **Description:** Returns a list of supported countries and operators for airtime purchases.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "options": [
      {
        "countryCode": "NG",
        "countryName": "Nigeria",
        "operators": [
          {
            "operatorId": "MTN_NG",
            "operatorName": "MTN Nigeria"
          }
        ]
      }
    ]
  }
  ```
- **Feedback:**
    - **Success:** "Supported airtime options loaded."
    - **Error:** "Could not load supported airtime options."

---

## Data Utility (`/data`)

### 1. Purchase Data Plan

- **Endpoint:** `POST /purchase`
- **Description:** Purchases a data plan for the authenticated user.
- **Request Body:**
  ```json
  {
    "planId": "MTN_NG_500MB_30D",
    "recipientPhone": "08012345678",
    "useVeloBalance": true
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Data plan purchase successful.",
    "purchase": {
      "purchaseId": "data_purchase_67890",
      "status": "completed",
      "planName": "500MB for 30 Days"
    }
  }
  ```
- **Feedback:**
    - **Success:** "Your data plan purchase was successful."
    - **Error:** "Failed to purchase data plan. Please try again."

### 2. Get Available Data Plans

- **Endpoint:** `GET /plans`
- **Description:** Retrieves available data plans, optionally filtered by country or operator.
- **Query Parameters:** `countryCode` (e.g., `NG`), `operatorId` (e.g., `MTN_NG`)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "plans": [
      {
        "planId": "MTN_NG_500MB_30D",
        "name": "500MB for 30 Days",
        "price": 500,
        "currency": "NGN"
      }
    ]
  }
  ```
- **Feedback:**
    - **Success:** "Available data plans loaded."
    - **Error:** "Could not load data plans."

---

## Electricity Utility (`/electricity`)

### 1. Pay Electricity Bill

- **Endpoint:** `POST /purchase`
- **Description:** Processes an electricity bill payment.
- **Request Body:**
  ```json
  {
    "disco": "IKEDC",
    "meterNumber": "1234567890123",
    "amount": 5000,
    "useVeloBalance": true
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Electricity payment successful.",
    "payment": {
      "paymentId": "elec_payment_abcde",
      "status": "completed",
      "token": "1234-5678-9012-3456"
    }
  }
  ```
- **Feedback:**
    - **Success:** "Your electricity payment was successful. Your token is 1234-5678-9012-3456."
    - **Error:** "Electricity payment failed. Please verify the meter number and try again."

### 2. Verify Meter Number

- **Endpoint:** `GET /verify-meter`
- **Description:** Verifies the details of a meter number.
- **Query Parameters:** `disco` (e.g., `IKEDC`), `meterNumber` (e.g., `1234567890123`)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "customer": {
      "name": "John Doe",
      "address": "123 Velo Street, Lagos"
    }
  }
  ```
- **Error Response (404 Not Found):**
  ```json
  {
    "success": false,
    "message": "Meter number not found or invalid."
  }
  ```
- **Feedback:**
    - **Success:** "Meter number verified for John Doe."
    - **Error:** "Invalid meter number. Please check and re-enter."
