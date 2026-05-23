# SURL Landing Page

A React + Vite landing page for **sentinelurl.site** with an animated boot sequence that triggers your AWS Lambda to start the EC2 instance and update Namecheap DNS.

---

## Quick Start

```bash
cd SentinelURL_Landing
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Project Structure

```
SentinelURL_Landing/
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx        ← All components + boot logic
│   ├── index.css      ← Full stylesheet
│   └── main.jsx       ← React entry point
├── index.html
├── package.json
└── vite.config.js
```

---

## Configuration

Open `src/App.jsx` and update the `CONFIG` object at the top:

```js
const CONFIG = {
  LAMBDA_URL: "https://YOUR_LAMBDA_FUNCTION_URL_HERE", // ← Your Lambda URL
  REDIRECT_URL: "https://sentinelurl.site",             // ← Your domain
  BOOT_DURATION_MS: 18000,                              // ← Total boot animation time (ms)
};
```

---

## AWS Lambda Setup

Your Lambda should do three things when invoked:

1. **Start the EC2 instance**
2. **Fetch the new public IP**
3. **Update Namecheap DNS via their API**

### Lambda (Python example)

```python
import boto3, requests, os, time

ec2 = boto3.client('ec2', region_name=os.environ['AWS_REGION'])
INSTANCE_ID = os.environ['INSTANCE_ID']
NC_API_USER = os.environ['NC_API_USER']
NC_API_KEY  = os.environ['NC_API_KEY']
NC_USERNAME  = os.environ['NC_USERNAME']
DOMAIN      = os.environ['DOMAIN']        # e.g. "sentinelurl"
TLD         = os.environ['TLD']           # e.g. "site"

def lambda_handler(event, context):
    # 1. Start instance
    ec2.start_instances(InstanceIds=[INSTANCE_ID])

    # 2. Wait until running
    waiter = ec2.get_waiter('instance_running')
    waiter.wait(InstanceIds=[INSTANCE_ID])

    # 3. Fetch public IP
    desc = ec2.describe_instances(InstanceIds=[INSTANCE_ID])
    ip = desc['Reservations'][0]['Instances'][0]['PublicIpAddress']

    # 4. Update Namecheap DNS A-record
    params = {
        'ApiUser':   NC_API_USER,
        'ApiKey':    NC_API_KEY,
        'UserName':  NC_USERNAME,
        'ClientIp':  ip,   # or your fixed NAT IP
        'Command':   'namecheap.domains.dns.setHosts',
        'SLD':       DOMAIN,
        'TLD':       TLD,
        'HostName1': '@',
        'RecordType1': 'A',
        'Address1':  ip,
        'TTL1':      '60',
    }
    r = requests.get('https://api.namecheap.com/xml.response', params=params)
    return {'statusCode': 200, 'body': f'Instance started. IP: {ip}'}
```

### Lambda environment variables

| Variable | Example |
|----------|---------|
| `INSTANCE_ID` | `i-0abc123def456` |
| `NC_API_USER` | `yourncuser` |
| `NC_API_KEY` | `namecheap_api_key` |
| `NC_USERNAME` | `yourncuser` |
| `DOMAIN` | `sentinelurl` |
| `TLD` | `site` |

### Lambda function URL (CORS)

In the Lambda console → **Configuration → Function URL**:

- Auth type: `NONE` (or sign with IAM if you add auth later)
- CORS → Allowed origins: `https://sentinelurl.site`

Paste the generated URL into `CONFIG.LAMBDA_URL` in `App.jsx`.

---

## Adjusting Boot Duration

`BOOT_DURATION_MS` controls how long the progress bar takes (default 18 s). Set it slightly longer than your actual Lambda/EC2 start time so the bar finishes just as the server is ready.

---

## Deployment (S3 + CloudFront or Netlify/Vercel)

```bash
npm run build
# Upload dist/ to S3 bucket, or drag dist/ to Netlify/Vercel
```

For S3 + CloudFront, point the CloudFront distribution at the S3 bucket and set the default root object to `index.html`.

---

## Adding React Components Later

The page is plain React with no router. To add pages:

```bash
npm install react-router-dom
```

Then wrap `App.jsx` in `<BrowserRouter>` and add `<Route>` definitions.

---

© 2026 SURL
