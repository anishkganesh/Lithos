# FactSet Global Filings API V2 - Complete Cheat Sheet

## Authentication
```python
# Method 1: API Key (Recommended for scripts)
from fds.sdk.GlobalFilings import Configuration

configuration = Configuration(
    username='LITHOS-2220379',
    password='f69RjKOALrE2921T9x8PWTr4chAPmkhcWBEpZdOI'
)

authorization = ('LITHOS-2220379', 'f69RjKOALrE2921T9x8PWTr4chAPmkhcWBEpZdOI')
```

## Key Sources for Mining Documents

| Source Code | Description | Use Case |
|------------|-------------|----------|
| `SDR` | SEDAR (Canada) | Canadian NI 43-101 technical reports |
| `SDRP` | SEDAR+ (Canada) | New Canadian filings (post Sept 2024) |
| `EDG` | EDGAR (US) | US SEC filings including SK-1300 |
| `FFR` | FactSet Annuals & Interims | Annual reports |

## Important Form Types

### SEDAR (Canadian Mining)
- **Technical Report** - NI 43-101 reports
- **Material Change Report**
- **Annual Information Form**

### EDGAR (US Mining)
- **10-K** - Annual report (may contain SK-1300/Exhibit 96.1)
- **8-K** - Current report
- **S-K 1300** - Mining disclosure

## Main Endpoints

### 1. Search for Filings (`/search`)
```python
api_response = api_instance.get_filings(
    ids=["FCX-US"],           # Ticker symbol
    sources=["SDR", "EDG"],   # SEDAR + EDGAR
    start_date="20200101",    # YYYYMMDD
    end_date="20251101",
    pagination_limit=100,
    pagination_offset=0,
    time_zone="America/New_York",
    sort=["-filingsDateTime"],  # Newest first
    primary_id=True,           # Only primary company docs
    form_types=["Technical Report", "10-K"]
)
```

**Response Structure:**
```json
{
  "data": [{
    "requestId": "FCX-US",
    "documents": [{
      "headline": "Document title...",
      "source": "SDR",
      "filingsLink": "https://api.factset.com/...",
      "documentId": "unique-id",
      "filingSize": "12MB",
      "formTypes": ["Technical Report"],
      "filingsDateTime": "2024-03-07T19:40:26Z"
    }]
  }]
}
```

### 2. Download Documents

**Critical: Must use authentication for downloads!**

```python
import requests

url = item['filings_link']
response = requests.get(url, auth=authorization)  # Pass auth!

# Save file
with open(f"{document_id}.html", 'wb') as f:
    f.write(response.content)
```

### 3. Count Documents (`/count`)
```python
api_response = api_instance.get_count(
    ids=["FCX-US"],
    sources=["SDR"],
    start_date="20200101",
    end_date="20251101"
)
```

## Filtering Large Documents

FactSet API **does NOT** provide page count in metadata. To find 100+ page docs:

1. **Download document**
2. **Check file size** - Use `filingSize` as proxy (>5MB likely 100+ pages)
3. **Parse PDF** - Use `pdfinfo` or PyPDF2 to count pages
4. **Filter** - Keep only 100+ page documents

```python
import subprocess

def get_pdf_pages(filepath):
    result = subprocess.run(['pdfinfo', filepath],
                          capture_output=True, text=True)
    for line in result.stdout.split('\n'):
        if 'Pages:' in line:
            return int(line.split(':')[1].strip())
    return 0
```

## Mining Company Tickers

### Top 10 Mining Companies (Global)
```python
MINING_TICKERS = [
    "FCX-US",     # Freeport-McMoRan (Copper/Gold)
    "VALE-US",    # Vale (Iron Ore)
    "RIO-GB",     # Rio Tinto (Diversified)
    "BHP-US",     # BHP Group (Diversified)
    "GLEN-GB",    # Glencore (Diversified)
    "NEM-US",     # Newmont (Gold)
    "TECK.B-CA",  # Teck Resources (Copper/Coal)
    "ABX-CA",     # Barrick Gold
    "FM-CA",      # First Quantum (Copper)
    "SCCO-US"     # Southern Copper
]
```

## Complete Workflow

```python
from fds.sdk.GlobalFilings import Configuration, ApiClient
from fds.sdk.GlobalFilings.api import filings_api_api
import requests
from urllib.parse import urlparse
import os

# Setup
config = Configuration(
    username='LITHOS-2220379',
    password='f69RjKOALrE2921T9x8PWTr4chAPmkhcWBEpZdOI'
)
auth = ('LITHOS-2220379', 'f69RjKOALrE2921T9x8PWTr4chAPmkhcWBEpZdOI')

# Search
with ApiClient(config) as api_client:
    api = filings_api_api.FilingsAPIApi(api_client)
    response = api.get_filings(
        ids=["FCX-US"],
        sources=["SDR", "EDG"],
        start_date="20200101",
        end_date="20251101",
        pagination_limit=100
    )

# Download
for entry in response['data']:
    for doc in entry.get('documents', []):
        url = doc['filings_link']

        # Check size first
        size_str = doc.get('filingSize', '0MB')
        size_mb = float(size_str.replace('MB', ''))

        if size_mb < 5:  # Skip small docs
            continue

        # Download with auth
        r = requests.get(url, auth=auth)

        filename = f"{doc['document_id']}.html"
        with open(filename, 'wb') as f:
            f.write(r.content)
```

## Key Insights from FactSet Support

1. **Authentication Required Twice:**
   - Configuration (for API calls)
   - Authorization (for document downloads)

2. **File Format:**
   - Downloads are typically HTML
   - May need conversion to PDF

3. **Rate Limits:**
   - 10 requests/second
   - 10 concurrent requests max

4. **Pagination:**
   - Default limit: 25
   - Max limit: 1000

## Common Issues

### Issue: 401 Unauthorized on Download
**Solution:** Pass `auth=authorization` to requests.get()

### Issue: No page count in metadata
**Solution:** Filter by `filingSize` first, then verify pages after download

### Issue: Missing NI 43-101 reports
**Solution:**
- Use both `SDR` and `SDRP` sources
- Search `formTypes=["Technical Report"]`
- Try `searchText="43-101"`

## Supabase Upload Pattern

```python
from supabase import create_client

supabase = create_client(url, key)

# Upload
storage_path = f"factset/{source}/{ticker}/{filename}"
supabase.storage.from_('refinitiv').upload(
    storage_path,
    file_buffer,
    {'contentType': 'application/pdf', 'upsert': True}
)

# Get public URL
url_data = supabase.storage.from_('refinitiv').get_public_url(storage_path)
print(url_data.publicUrl)
```

## Best Practices

1. **Always authenticate downloads** - Most common error
2. **Filter by size first** - Saves processing time
3. **Use pagination** - Don't miss documents
4. **Batch by ticker** - Process one company at a time
5. **Store metadata** - Track document_id, ticker, date, size
6. **Handle errors gracefully** - API may timeout on large requests
