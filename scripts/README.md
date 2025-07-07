# PSP Utility Scripts

This directory contains utility scripts for managing PSP sessions and maintaining the project.

## Available Scripts

### Session Management

#### `cleanup-sessions.js`
Comprehensive session cleanup utility for managing PSP sessions and profile directories.

**Usage:**
```bash
# List all sessions with details
node scripts/cleanup-sessions.js list

# Clean sessions older than 30 days (default)
node scripts/cleanup-sessions.js old

# Clean sessions older than 7 days
node scripts/cleanup-sessions.js old 7

# Clean orphaned profile directories
node scripts/cleanup-sessions.js orphaned

# Full cleanup (old sessions + orphaned profiles)
node scripts/cleanup-sessions.js all

# Full cleanup with custom age threshold
node scripts/cleanup-sessions.js all 14
```

**Features:**
- ✅ List sessions with size and age information
- ✅ Clean up sessions older than specified days
- ✅ Remove orphaned profile directories
- ✅ Calculate and display space savings
- ✅ Safe error handling for locked files
- ✅ Comprehensive logging

**Example Output:**
```
📋 PSP Session Summary:

1. Current Chrome Session - 7/4/2025, 7:50:47 PM
   ID: 259830c3-5d5d-4353-b809-e1faa941940e
   Created: 7/4/2025, 7:50:54 PM
   Age: 0 days
   Size: 2.3 MB
   Profile: /Users/username/.psp/profiles/259830c3-5d5d-4353-b809-e1faa941940e

📊 Summary:
   Total sessions: 18
   Total size: 45.7 MB
   Average size: 2.5 MB
```

## Integration with Package Scripts

Add these to your `package.json`:

```json
{
  "scripts": {
    "psp:cleanup": "node scripts/cleanup-sessions.js all",
    "psp:cleanup:old": "node scripts/cleanup-sessions.js old 7",
    "psp:list": "node scripts/cleanup-sessions.js list",
    "psp:demo": "node demos/chrome-profiles/demo-psp-working.js"
  }
}
```

## Automation

### Cron Job Setup
Clean up old sessions automatically:

```bash
# Add to crontab (runs weekly)
0 2 * * 0 cd /path/to/psp && node scripts/cleanup-sessions.js all 30
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Cleanup PSP Sessions
  run: node scripts/cleanup-sessions.js all 7
```

## Best Practices

1. **Regular Cleanup**: Run cleanup weekly to prevent disk space issues
2. **Age Threshold**: Use 7-30 days based on your usage patterns
3. **Backup Important Sessions**: Export critical sessions before cleanup
4. **Monitor Disk Usage**: Check session sizes regularly
5. **Safe Deletion**: Scripts handle locked files gracefully

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure proper file permissions on ~/.psp
2. **Profile Locked**: Close all Chrome instances before cleanup
3. **Large Profile Sizes**: Some profiles may be unexpectedly large due to cache

### Debug Mode

Run with verbose output:
```bash
DEBUG=psp:cleanup node scripts/cleanup-sessions.js all
```

## Contributing

When adding new utility scripts:

1. Follow the existing naming convention
2. Include comprehensive CLI help
3. Add error handling and logging
4. Update this README
5. Consider integration with package.json scripts

## Related Files

- [Demo Scripts](../demos/README.md) - PSP demonstration scripts
- [Main Documentation](../docs/README.md) - Project documentation
- [Session Management](../docs/guide/getting-started.md) - Usage guide
