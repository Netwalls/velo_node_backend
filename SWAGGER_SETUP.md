# Swagger Documentation - Quick Reference

## ✅ What Was Implemented

1. **Swagger Configuration** - `/src/config/swagger.ts`
   - OpenAPI 3.0 specification
   - JWT Bearer authentication
   - Reusable schemas (User, Company, WalletAddress, etc.)
   - All API tags and descriptions

2. **Auth Endpoints Documentation** - `/src/swagger/auth.yaml`
   - Complete documentation for all auth routes
   - Request/response examples
   - Error responses
   - Security requirements

3. **Server Integration** - `/src/server.ts`
   - Swagger UI served at `/api-docs`
   - OpenAPI JSON at `/api-docs.json`
   - Custom styling

4. **Dependencies Installed:**
   - `swagger-ui-express` - Serves Swagger UI
   - `swagger-jsdoc` - Generates OpenAPI spec
   - TypeScript types for both

## 🚀 Access Your API Documentation

### Start the server:

```bash
npm run dev
```

### Open Swagger UI:

```
http://localhost:5500/api-docs
```

### Features Available:

✅ Interactive API explorer
✅ Try out endpoints directly in browser
✅ Automatic request/response validation
✅ Authentication with JWT tokens
✅ Example values for all fields
✅ Export OpenAPI spec

## 📝 How to Use Swagger UI

### Testing Protected Endpoints:

1. **Login first:**
   - Go to `POST /auth/login`
   - Click "Try it out"
   - Enter email and password
   - Execute
   - Copy the `accessToken` from response

2. **Authorize:**
   - Click the green "Authorize" button at the top
   - Enter: `Bearer <paste-your-token-here>`
   - Click "Authorize"

3. **Test protected endpoint:**
   - Go to any endpoint with a 🔒 lock icon
   - Click "Try it out"
   - Execute

## 🔄 Adding More Endpoints

### Method 1: YAML Files (Recommended)

Create new files in `/src/swagger/` directory:

```yaml
# src/swagger/wallet.yaml
/wallet/balance:
  get:
    tags:
      - Wallet
    summary: Get wallet balances
    security:
      - bearerAuth: []
    responses:
      200:
        description: Success
```

### Method 2: JSDoc Comments

Add to route files:

```typescript
/**
 * @swagger
 * /wallet/balance:
 *   get:
 *     tags:
 *       - Wallet
 *     summary: Get wallet balances
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/balance", authMiddleware, WalletController.getBalance);
```

## 📊 Currently Documented

✅ Company Registration
✅ Employee Registration  
✅ Individual Registration
✅ Login
✅ Email Verification (OTP)
✅ Password Reset
✅ Token Refresh
✅ Logout (single & all devices)
✅ Get Company Employees

## 🎯 Next Steps

To complete full documentation, create YAML files for:

1. **Wallet endpoints** - `/src/swagger/wallet.yaml`
2. **Payment endpoints** - `/src/swagger/payment.yaml`
3. **Split payment** - `/src/swagger/split-payment.yaml`
4. **QR payment** - `/src/swagger/qr-payment.yaml`
5. **Fiat endpoints** - `/src/swagger/fiat.yaml`
6. **Utility endpoints** - `/src/swagger/utilities.yaml`
7. **Admin endpoints** - `/src/swagger/admin.yaml`

## 🔗 Useful Links

- **Swagger UI:** http://localhost:5500/api-docs
- **OpenAPI JSON:** http://localhost:5500/api-docs.json
- **Swagger Editor:** https://editor.swagger.io (paste your JSON)
- **OpenAPI Spec:** https://swagger.io/specification/

## 💡 Pro Tips

1. **Postman Integration:** Import `/api-docs.json` into Postman
2. **Code Generation:** Use OpenAPI generators for client SDKs
3. **API Testing:** Use Swagger UI "Try it out" for quick tests
4. **Documentation:** Keep YAML files updated as you add routes
5. **Validation:** Swagger validates requests automatically

## 📚 Full Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API guide.
