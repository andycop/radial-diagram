# Publishing to npm

## Prerequisites

You need an npm account. If you don't have one:
1. Go to https://www.npmjs.com/signup
2. Create an account

## Steps to Publish

### 1. Login to npm

```bash
npm login
```

You'll be prompted for:
- Username
- Password
- Email
- One-time password (if 2FA is enabled)

### 2. Verify you're logged in

```bash
npm whoami
```

Should display your npm username.

### 3. Check package name availability (optional)

```bash
npm search radial-diagram
```

If the name is taken, you'll need to:
- Change the name in `package.json`
- Or use a scoped package: `@yourusername/radial-diagram`

### 4. Do a dry run (optional but recommended)

```bash
npm publish --dry-run
```

This shows what will be published without actually publishing.

### 5. Publish!

```bash
npm publish
```

The `prepublishOnly` script will automatically run `npm run build` first.

### 6. Verify publication

Check https://www.npmjs.com/package/radial-diagram

## Publishing Updates

After making changes:

```bash
# Bump version
npm version patch  # 1.0.0 -> 1.0.1
# or
npm version minor  # 1.0.0 -> 1.1.0
# or
npm version major  # 1.0.0 -> 2.0.0

# Publish
npm publish
```

## Package Details

- **Name**: `radial-diagram`
- **Current version**: `1.0.0`
- **License**: MIT
- **Repository**: https://github.com/andycop/radial-diagram.git

## What Gets Published

Only these files (as specified in `package.json` "files" field):
- `dist/` - Compiled JavaScript and type definitions
- `LICENSE` - MIT license
- `README.md` - Documentation

Source files (`src/`) are NOT published.

## Troubleshooting

### "Package name taken"
Either choose a different name or use a scoped package:
```json
{
  "name": "@yourusername/radial-diagram"
}
```

### "Need to login"
Run `npm login` first.

### "403 Forbidden"
You don't have permission to publish this package name. Use a scoped package or different name.

### "402 Payment Required"
You're trying to publish a scoped private package. Either:
- Make it public: `npm publish --access public`
- Or upgrade to npm Pro for private packages
