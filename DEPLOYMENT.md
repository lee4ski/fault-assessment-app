# Deployment Guide

## Automatic Testing Before Deployment

This project is configured to automatically run tests before every deployment.

### CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment:

1. **On every push/PR**: Tests run automatically
2. **Before build**: Tests must pass
3. **Before deployment**: Tests are required

## GitHub Actions Workflows

### 1. CI Pipeline (`.github/workflows/ci.yml`)
- Runs on every push and pull request
- Executes tests and linting
- Builds the application
- Uploads coverage reports

### 2. Deploy Pipeline (`.github/workflows/deploy.yml`)
- Runs on pushes to `main` branch
- Runs all tests before deployment
- Builds the application
- Deploys to Vercel (if configured)

### 3. Pre-commit Checks (`.github/workflows/pre-commit.yml`)
- Runs on pull requests
- Validates code before merge

## Local Pre-commit Hooks

Install Husky to run tests before commits:

```bash
npm install
npx husky install
```

This will run tests automatically before each commit.

## Manual Testing Before Deployment

```bash
# Run all tests
npm run test:ci

# Run tests with coverage
npm run test:coverage

# Build (includes test run)
npm run build
```

## Deployment Platforms

### Vercel

The project is configured for Vercel deployment:

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `OPENAI_API_KEY`: Your OpenAI API key
3. Vercel will automatically:
   - Run tests before build
   - Build the application
   - Deploy on successful build

### Other Platforms

For other platforms, ensure:

1. Tests run in build command: `npm run test:ci && npm run build`
2. Environment variables are set
3. Node.js version is 20+

## Environment Variables

Required for deployment:
- `OPENAI_API_KEY`: OpenAI API key for chat functionality

Optional:
- `NODE_ENV`: Set to `production` for production builds

## Troubleshooting

### Tests fail in CI but pass locally
- Check Node.js version (should be 20+)
- Ensure all dependencies are in `package.json`
- Check for environment-specific code

### Build fails
- Ensure tests pass: `npm run test:ci`
- Check for TypeScript errors: `npm run build`
- Verify environment variables are set

### Deployment fails
- Check GitHub Actions logs
- Verify secrets are configured
- Ensure build command succeeds locally

