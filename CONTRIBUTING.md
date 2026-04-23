# Contributing to Agent Skills CLI

Thank you for your interest in contributing!

## Ways to Contribute

- Report bugs
- Suggest features
- Improve documentation
- Submit pull requests

## Development Setup

```bash
# Clone the repo
git clone git@github.com:syndicats/agent-skills.git
cd agent-skills

# Install dependencies
npm install

# Build
npm run build

# Test locally
node dist/cli/index.js --help
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run `npm run build` to ensure it compiles
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Code Style

- Use TypeScript
- Follow existing code patterns

## Testing

Before submitting:
```bash
npm run build
skills --help
skills install owner/repo --list
```

## Questions?

Open an issue on [GitHub](https://github.com/syndicats/agent-skills/issues).
