# 📚 API Reference - Gmail Bulk Sender SaaS

## 🔗 **Base URL**
```
http://your-server:8000/api/v1
```

## 📋 **Service Accounts API**

### **List Service Accounts**
```http
GET /accounts/
```
**Response:** Array of service accounts with user counts and sync status

### **Create Service Account**
```http
POST /accounts/
Content-Type: application/json

{
  "name": "My Service Account",
  "client_email": "service@project.iam.gserviceaccount.com",
  "domain": "yourdomain.com",
  "project_id": "your-project-id",
  "admin_email": "admin@yourdomain.com",
  "json_content": {
    "type": "service_account",
    "project_id": "your-project-id",
    "private_key_id": "...",
    "private_key": "...",
    "client_email": "service@project.iam.gserviceaccount.com",
    "client_id": "...",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token"
  }
}
```

### **Sync Users**
```http
POST /accounts/{account_id}/sync
Content-Type: application/json

{
  "admin_email": "admin@yourdomain.com"
}
```

### **Delete Service Account**
```http
DELETE /accounts/{account_id}
```

## 👥 **Users API**

### **List Workspace Users**
```http
GET /users/
GET /users/?service_account_id=1
GET /users/?is_active=true
```

## 📞 **Contacts API**

### **List Contact Lists**
```http
GET /contacts/lists
```

### **Create Contact List**
```http
POST /contacts/lists
Content-Type: application/json

{
  "name": "My Contact List",
  "description": "Optional description",
  "contacts": [
    {
      "first_name": "John",
      "last_name": "Doe", 
      "email": "john@example.com"
    }
  ]
}
```

### **Update Contact List**
```http
PUT /contacts/lists/{list_id}
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

## 📊 **Data Lists API**

### **List Data Lists**
```http
GET /data-lists/
```

### **Create Data List**
```http
POST /data-lists/
Content-Type: application/json

{
  "name": "My Data List",
  "description": "Optional description",
  "recipients": [
    "user1@example.com",
    "user2@example.com"
  ]
}
```

## 📧 **Campaigns API**

### **List Campaigns**
```http
GET /campaigns/
GET /campaigns/?status=draft
```

### **Create Campaign**
```http
POST /campaigns/
Content-Type: application/json

{
  "name": "My Campaign",
  "subject": "Email Subject",
  "body_html": "<h1>Hello World</h1>",
  "body_plain": "Hello World",
  "from_name": "Your Name",
  "from_email": "sender@yourdomain.com",
  "recipients": ["user1@example.com", "user2@example.com"],
  "sender_account_ids": [1, 2],
  "rate_limit": 500,
  "concurrency": 5
}
```

### **Prepare Campaign**
```http
POST /campaigns/{campaign_id}/prepare/
```

### **Launch Campaign**
```http
POST /campaigns/{campaign_id}/launch/
```

### **Control Campaign**
```http
POST /campaigns/{campaign_id}/control/
Content-Type: application/json

{
  "action": "pause"  // pause, resume, cancel
}
```

## 📝 **Drafts API**

### **List Drafts**
```http
GET /drafts/
```

### **Create Draft**
```http
POST /drafts/
Content-Type: application/json

{
  "name": "My Draft",
  "subject": "Draft Subject",
  "from_name": "Your Name",
  "body_html": "<h1>Draft Content</h1>",
  "emails_per_user": 1,
  "selected_account_ids": [1, 2],
  "selected_user_ids": [1, 2, 3],
  "selected_contact_list_ids": [1, 2]
}
```

### **Upload Drafts**
```http
POST /drafts/{draft_id}/upload/
```

### **Launch Drafts**
```http
POST /drafts/launch/
Content-Type: application/json

{
  "draft_ids": [1, 2, 3]
}
```

## 📊 **Dashboard API**

### **Get Statistics**
```http
GET /dashboard/stats
```

**Response:**
```json
{
  "total_service_accounts": 5,
  "total_users": 150,
  "total_campaigns": 25,
  "active_campaigns": 3,
  "completed_campaigns": 20,
  "emails_sent_today": 1250,
  "emails_failed_today": 15
}
```

### **Get Recent Activity**
```http
GET /dashboard/recent-activity?limit=20
```

## 🧪 **Test Email API**

### **Send Test Email**
```http
POST /test-email/
Content-Type: application/json

{
  "recipient_email": "test@example.com",
  "subject": "Test Email",
  "body_html": "<h1>Test</h1>",
  "sender_user_id": 1
}
```

## 🔍 **Health Check**

### **Backend Health**
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "environment": "development"
}
```

## 📝 **Response Formats**

### **Success Response**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### **Error Response**
```json
{
  "detail": "Error message",
  "status_code": 400
}
```

## 🔐 **Authentication**

Currently, the API doesn't require authentication for development. For production, consider implementing:

- JWT tokens
- API keys
- OAuth2 integration

## 📊 **Rate Limits**

- **Default Campaign Rate**: 500 emails/hour
- **Workspace Rate**: 2000 emails/hour per account
- **Concurrency**: 5 concurrent emails per account
- **Global Concurrency**: 50 concurrent emails total

## 🚀 **WebSocket Events** (Future)

Real-time updates for:
- Campaign progress
- Email delivery status
- System notifications
- User activity

## 📈 **Monitoring**

Monitor your application with:
- Dashboard statistics
- Email delivery logs
- Campaign progress tracking
- System health checks
