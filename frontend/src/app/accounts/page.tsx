'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { serviceAccountsApi, healthCheck, API_URL } from '@/lib/api';
import {
  Plus,// frontend/src/app/campaigns/new/page.tsx
function asString(v: any): string {
  if (v == null) return "";# backend/app/models.py
class Campaign(Base):
    # ... existing fields ...
    body_html = Column(Text)  # Ensure this field exists
    body_plain = Column(Text)  # Ensure this field exists

  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.join("");
  if (typeof v === "object" && Array.isArray((v as any).ops)) {
    return (v as any).ops.map((op: any) => String(op.insert ?? "")).join("");
  }
  return String(v);
}

// In your submit handler:
const payload = {
  from_email,
  from_name,
  to,
  subject,
  html: asString(htmlEditorValue),
  text: asString(textEditorValue),
  use_gmail: sendVia === "gmail",
  custom_headers,
};

  Trash2,# backend/app/schemas.py
from typing import Dict, List, Optional, Union, Any
from pydantic import BaseModel, EmailStr

class SendEmailRequest(BaseModel):
    from_email: EmailStr
    from_name: Optional[str] = None
    to: List[EmailStr]
    subject: str
    html: Optional[Union[str, List[Any], Dict[str, Any]]] = None
    text: Optional[Union[str, List[Any], Dict[str, Any]]] = None
    use_gmail: bool = True
    custom_headers: Dict[str, str] = {}
# backend/app/tasks_powermta.py
def send_single_email_sync(...):
    try:
        send_result = google_service.send_email(...)
        publish_log(campaign_id, f"📨 Delivered to {task.to} (sender {task.sender})")
        mark_success(task.id, getattr(send_result, "msg_id", None))
    except Exception as e:
        html_t = type(getattr(task, "html", None)).__name__
        text_t = type(getattr(task, "text", None)).__name__
        reason = f"{e} | html_type={html_t} text_type={text_t}"
        mark_failed(task.id, error=reason)
        publish_log(campaign_id, f"❌ Failed for {task.to} | sender={task.sender} | {reason}")

  RefreshCw,
  CheckCircle,
  XCircle,
  Wifi,# backend/app/services/mailer.py
import os, uuid, time, base64, smtplib, ssl, email.utils
from email.message import EmailMessage

MESSAGE_ID_DOMAIN = os.getenv("MESSAGE_ID_DOMAIN", "example.local")

def _rfc2822_date() -> str:
    return email.utils.formatdate(localtime=False, usegmt=True)

def _as_str(v):
    """Coerce editor outputs (string | list | quill delta | dict) to string."""
    if v is None:
        return ""
    if isinstance(v, str):
        return v
    if isinstance(v, list):
        return "".join(str(x) for x in v)
    if isinstance(v, dict):
        # Quill Delta minimal
        if "ops" in v and isinstance(v["ops"], list):
            return "".join(str(op.get("insert", "")) for op in v["ops"])
        return str(v)
    return str(v)

def build_mime(req) -> tuple[EmailMessage, str]:
    """
    req must expose: from_email, from_name, to(list), subject, html, text, custom_headers
    """
    msg = EmailMessage()
    from_disp = f'{req.from_name} <{req.from_email}>' if getattr(req, "from_name", None) else req.from_email
    msg["From"] = from_disp
    msg["To"] = ", ".join(req.to)
    msg["Subject"] = req.subject
    msg["Date"] = _rfc2822_date()

    # RFC-compliant Message-ID
    raw_id = f"{uuid.uuid4().hex}.{int(time.time())}"
    msg_id = f"<{raw_id}@{MESSAGE_ID_DOMAIN}>"
    msg["Message-ID"] = msg_id

    for k, v in (getattr(req, "custom_headers", {}) or {}).items():
        if k.lower() == "message-id":
            continue
        msg[k] = v

    html = _as_str(getattr(req, "html", None))
    text = _as_str(getattr(req, "text", None))

    # Build a standards-compliant alternative body
    if html and text:
        msg.set_content(text)
        msg.add_alternative(html, subtype="html")
    elif html:
        fallback = "This email contains HTML content. Your client may not display it."
        msg.set_content(fallback)
        msg.add_alternative(html, subtype="html")
    else:
        msg.set_content(text or "")

    return msg, msg_id

def to_gmail_raw(msg: EmailMessage) -> str:
    return base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")

  WifiOff,
  Upload,
} from 'lucide-react';

type ServiceAccount = {
  id: number;
  name: string;
  status: 'active' | 'inactive' | string;
  client_email?: string;
  domain?: string;
  total_users?: number;
  quota_used_today?: number;
  quota_limit?: number;
  last_synced?: string | null;
  admin_email?: string;
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<ServiceAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadData, setUploadData] = useState({ name: '', json: '' });
  const [backendStatus, setBackendStatus] = useState<boolean | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'paste'>('file');

  useEffect(() => {
    checkBackend();
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkBackend = async () => {
    console.log('Checking backend service status...', API_URL);
    const isHealthy = await healthCheck();
    setBackendStatus(isHealthy);
    if (!isHealthy) {
      console.error('Backend service not accessible:', API_URL);
      alert(
        `Unable to connect to backend service: ${API_URL}\n\nPlease ensure the backend service is running and the network connection is normal.`
      );
    } else {
      console.log('Backend service connection normal');
    }
  };

  const loadAccounts = async () => {
    try {
      console.log('🔄 Loading accounts from API...');
      const response = await serviceAccountsApi.list();
      console.log('✅ API Response:', response);
      setAccounts(Array.isArray(response.data) ? response.data : []);
      console.log(`✅ Loaded ${response.data?.length || 0} accounts`);
    } catch (error: any) {
      console.error('❌ Failed to load accounts:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });

      const errorMsg =
        error.response?.data?.detail || error.message || 'Unknown error occurred';
      alert(
        `Failed to load service accounts: ${errorMsg}\n\nPlease check if the backend service is running normally.`
      );
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadData.name || !uploadData.json) {
      alert('Please provide both account name and JSON content');
      return;
    }

    const accountName = uploadData.name;
    console.log(`🔄 Attempting upload with account name as admin email: ${accountName}`);

    let adminEmail = accountName;
    let useAccountName = true;

    try {
      JSON.parse(uploadData.json);
    } catch {
      alert('Invalid JSON format. Please check your service account JSON.');
      return;
    }

    try {
      console.log('Uploading service account...', { name: uploadData.name });
      const response = await serviceAccountsApi.create({
        name: uploadData.name,
        json_content: JSON.parse(uploadData.json),
        admin_email: adminEmail,
      });
      console.log('Upload successful:', response.data);

      const accountId = response.data.id;
      await loadAccounts();

      if (adminEmail && adminEmail.includes('@')) {
        try {
          console.log('Syncing users with admin email:', adminEmail);
          const syncResponse = await serviceAccountsApi.sync(accountId, adminEmail);
          console.log('Sync response:', syncResponse.data);
          alert(
            `✅ Successfully synced ${syncResponse.data.user_count || 0} users!\n\n` +
              `Admin email used: ${adminEmail}${
                useAccountName ? ' (auto-detected from account name)' : ' (manually entered)'
              }\n\n` +
              'Please refresh the Campaigns page to see the updated user list.'
          );
          await loadAccounts();
        } catch (syncError: any) {
          console.error('Sync error:', syncError);
          const errorMsg =
            syncError.response?.data?.detail || syncError.message || 'Unknown error';

          if (useAccountName) {
            console.log(`❌ Sync with account name failed: ${errorMsg}`);
            const manualAdminEmail = prompt(
              `Automatic sync with account name failed.\n` +
                `Account: ${accountName}\n` +
                `Error: ${errorMsg}\n\n` +
                `Please enter admin email manually:\n` +
                `(Example: admin@yourdomain.com)\n\n` +
                `This email must have admin privileges.`
            );

            if (manualAdminEmail && manualAdminEmail.includes('@')) {
              try {
                console.log('Trying manual admin email:', manualAdminEmail);
                const manualSyncResponse = await serviceAccountsApi.sync(
                  accountId,
                  manualAdminEmail
                );
                alert(
                  `✅ Successfully synced ${
                    manualSyncResponse.data.user_count || 0
                  } users!\n\n` +
                    `Admin email used: ${manualAdminEmail} (manually entered)\n\n` +
                    'Please refresh the Campaigns page to see the updated user list.'
                );
                await loadAccounts();
                return;
              } catch (manualSyncError: any) {
                console.error('Manual sync also failed:', manualSyncError);
                const manualErrorMsg =
                  manualSyncError.response?.data?.detail ||
                  manualSyncError.message ||
                  'Unknown error';
                alert(
                  `❌ Both sync methods failed:\n\n` +
                    `1. Account name (${accountName}): ${errorMsg}\n` +
                    `2. Manual email (${manualAdminEmail}): ${manualErrorMsg}\n\n` +
                    'Please check your Google Workspace configuration.'
                );
              }
            } else {
              alert('Please provide a valid admin email address.');
            }
          } else {
            alert(
              '⚠️ Sync failed: ' +
                errorMsg +
                '\n\nPlease check:\n' +
                '1. The admin email is correct\n' +
                '2. Domain-wide delegation is set up in Google Admin Console\n' +
                '3. The admin has super admin privileges\n\n' +
                'Click "Sync Users" button to try again.'
            );
          }
        }
      } else {
        alert(
          '✅ Service account added!\n\n' +
            'Click the "Sync Users" button to sync workspace users later.'
        );
      }

      setShowUpload(false);
      setUploadData({ name: '', json: '' });
      loadAccounts();
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      console.error('Upload error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });

      const errorMessage =
        error.response?.data?.detail || error.message || 'Upload failed';
      alert(
        `Service account upload failed: ${errorMessage}\n\nPlease check JSON file format and network connection.`
      );
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setUploadData({ ...uploadData, json: content });
    };
    reader.readAsText(file);
  };

  const handleSync = async (accountId: number) => {
    const account = accounts.find((acc) => acc.id === accountId);
    if (!account) {
      alert('Service account not found.');
      return;
    }

    try {
      console.log(`Starting to sync user data for account ${accountId}...`);
      await serviceAccountsApi.sync(accountId, account.admin_email || '');
      console.log('Sync successful, reloading account list...');
      loadAccounts();
      alert('User data sync successful!');
    } catch (error: any) {
      console.error('Sync failed:', error);
      const errorMsg =
        error.response?.data?.detail || error.message || 'Sync failed';
      alert(
        `User data sync failed: ${errorMsg}\n\nPlease check admin email permissions and domain-wide delegation settings.`
      );
    }
  };

  const handleDelete = async (accountId: number) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      await serviceAccountsApi.delete(accountId);
      loadAccounts();
    } catch (error: any) {
      alert('Failed to delete: ' + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Service Accounts</h1>
              <p className="text-muted-foreground">
                Manage Google Workspace service accounts
              </p>
              {backendStatus !== null && (
                <div className="mt-2 flex items-center gap-2">
                  {backendStatus ? (
                    <>
                      <Wifi className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">
                        Backend Connected ({API_URL})
                      </span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600">
                        Backend Offline ({API_URL})
                      </span>
                      <Button size="sm" variant="outline" onClick={checkBackend}>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
            <Button onClick={() => setShowUpload(!showUpload)} disabled={!backendStatus}>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </div>

          {showUpload && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Upload Service Account JSON</CardTitle>
                <CardDescription>
                  Upload your Google Cloud service account JSON file with domain-wide
                  delegation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Account Name</label>
                  <Input
                    placeholder="e.g., My Workspace Account"
                    value={uploadData.name}
                    onChange={(e) =>
                      setUploadData({ ...uploadData, name: e.target.value })
                    }
                  />
                </div>

                <div className="flex gap-2 border-b pb-3">
                  <Button
                    type="button"
                    size="sm"
                    variant={uploadMethod === 'file' ? 'default' : 'outline'}
                    onClick={() => setUploadMethod('file')}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={uploadMethod === 'paste' ? 'default' : 'outline'}
                    onClick={() => setUploadMethod('paste')}
                  >
                    Paste JSON
                  </Button>
                </div>

                {uploadMethod === 'file' && (
                  <div>
                    <label className="text-sm font-medium">
                      Service Account JSON File
                    </label>
                    <div className="mt-2">
                      <Input
                        type="file"
                        accept=".json"
                        onChange={handleFileUpload}
                        className="cursor-pointer"
                      />
                    </div>
                    {uploadData.json && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ JSON file loaded ({uploadData.json.length} characters)
                      </p>
                    )}
                  </div>
                )}

                {uploadMethod === 'paste' && (
                  <div>
                    <label className="text-sm font-medium">
                      Service Account JSON
                    </label>
                    <textarea
                      className="w-full h-32 p-3 text-sm border rounded-md font-mono mt-2"
                      placeholder="Paste your service account JSON here..."
                      value={uploadData.json}
                      onChange={(e) =>
                        setUploadData({ ...uploadData, json: e.target.value })
                      }
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    disabled={!uploadData.name || !uploadData.json}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Sync
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowUpload(false);
                      setUploadData({ name: '', json: '' });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6">
            {loading ? (
              <div className="animate-pulse">Loading accounts...</div>
            ) : accounts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No service accounts configured yet
                  </p>
                  <Button className="mt-4" onClick={() => setShowUpload(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Account
                  </Button>
                </CardContent>
              </Card>
            ) : (
              accounts.map((account) => (
                <Card key={account.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {account.name}
                          {account.status === 'active' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </CardTitle>
                        <CardDescription>{account.client_email}</CardDescription>
                        <div className="mt-2 text-sm">
                          <span className="font-medium">Synced Users: </span>
                          <span
                            className={
                              (account.total_users ?? 0) > 0
                                ? 'text-green-600 font-semibold'
                                : 'text-amber-600'
                            }
                          >
                            {account.total_users || 0}
                            {(account.total_users ?? 0) === 0 &&
                              ' ⚠️ Click Sync button →'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSync(account.id)}
                          title="Sync workspace users from Google"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Sync Users
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(account.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Domain</p>
                        <p className="font-medium">{account.domain}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Users</p>
                        <p className="font-medium">{account.total_users}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Quota Used Today</p>
                        <p className="font-medium">
                          {account.quota_used_today} / {account.quota_limit}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Synced</p>
                        <p className="font-medium">
                          {account.last_synced
                            ? new Date(account.last_synced).toLocaleString()
                            : 'Never'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
