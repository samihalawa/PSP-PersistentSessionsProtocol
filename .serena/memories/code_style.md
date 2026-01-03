# Code Style & Conventions

## TypeScript Configuration
- Target: ES2022
- Module: NodeNext
- Strict mode enabled
- ESM with .js extensions in imports

## Linting
- ESLint with @typescript-eslint
- Prettier integration
- `@typescript-eslint/no-explicit-any`: warn (allowed but discouraged)
- `explicit-module-boundary-types`: off (inferred return types allowed)

## Naming Conventions
- Files: kebab-case (e.g., `session-manager.ts`)
- Classes: PascalCase
- Functions/variables: camelCase
- Types/Interfaces: PascalCase with descriptive names

## Code Organization
- Each package has `src/` for source and `dist/` for output
- Exports via `index.ts` barrel files
- Types shared from `@psp/types` package
