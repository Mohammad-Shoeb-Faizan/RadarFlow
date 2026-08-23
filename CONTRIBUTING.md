# Contributing to RadarFlow

We welcome contributions from the developer community! Follow these steps to get started.

## Development Workflow

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/radarflow.git
   cd radarflow
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Database Setup**
   ```bash
   pnpm run db:seed
   ```

4. **Start Development Server**
   ```bash
   pnpm dev
   ```

## Code Quality & Testing

Before submitting a Pull Request, ensure:
- All SDK tests pass: `pnpm --filter @radarflow/sdk test`
- Typechecking passes without errors: `pnpm typecheck`
- Code follows project formatting: `pnpm prettier --check .`

## Submitting Pull Requests
- Keep PRs focused on a single feature or bug fix.
- Include clear descriptions and testing steps.
- Maintain backwards compatibility for `@radarflow/sdk` APIs.
