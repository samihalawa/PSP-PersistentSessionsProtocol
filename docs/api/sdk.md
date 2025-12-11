# SDK Reference

## Python SDK (`psp-python`)

### Installation
```bash
pip install psp-python
```

### Usage
```python
from psp import PSPClient

client = PSPClient(api_url="http://localhost:3000")
conn = client.connect("session-id")
print(conn['browserWSEndpoint'])
```

## Node.js SDK (`@samihalawa/psp-sdk`)

### Installation
```bash
npm install @samihalawa/psp-sdk
```

### Usage
```typescript
import { PSPClient } from '@samihalawa/psp-sdk';

const client = new PSPClient('http://localhost:3000');
const conn = await client.connect('session-id');
console.log(conn.browserWSEndpoint);
```
