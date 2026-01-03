# Task Completion Checklist

## Before Marking Complete
1. Build the affected package(s): `npm run build`
2. Verify no TypeScript errors
3. Test manually if applicable
4. Commit changes with descriptive message

## Quality Checks
- [ ] Code builds without errors
- [ ] Types are properly exported
- [ ] No console errors at runtime
- [ ] Changes follow existing patterns

## Common Issues
- Remember `.js` extensions in ESM imports
- Build types package first if shared types changed
- Check package.json exports field for new modules
